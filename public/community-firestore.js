// Private reads and atomic writes use the member's ID token, so Firestore enforces its rules.
const serverTime = Symbol("Firestore request time");
export const serverTimestamp = () => serverTime;

function decode(field) {
  if ("integerValue" in field) return Number(field.integerValue);
  if ("stringValue" in field) return field.stringValue;
  if ("booleanValue" in field) return field.booleanValue;
  if ("timestampValue" in field) return { timestampValue: field.timestampValue };
  return undefined;
}

function encode(value) {
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (Number.isSafeInteger(value)) return { integerValue: String(value) };
  if (typeof value?.timestampValue === "string") return { timestampValue: value.timestampValue };
  throw new Error("Unsupported community document value");
}

export function createMemberFirestore(projectId, auth) {
  const documents = `projects/${projectId}/databases/(default)/documents`;
  const baseUrl = "https://firestore.googleapis.com/v1/" + documents;

  async function request(suffix, token, body) {
    const response = await fetch(baseUrl + suffix, {
      method: body ? "POST" : "GET", cache: "no-store",
      headers: { Authorization: "Bearer " + token, ...(body && { "Content-Type": "application/json" }) },
      ...(body && { body: JSON.stringify(body) }),
    });
    const result = await response.json();
    if (!response.ok) {
      const code = (result.error?.status || "UNKNOWN").toLowerCase().replaceAll("_", "-");
      throw Object.assign(new Error("Firestore request failed"), { code });
    }
    return result;
  }
  async function read(ref, token) {
    let document;
    try {
      document = await request("/" + ref.path.split("/").map(encodeURIComponent).join("/"), token);
    } catch (error) {
      if (error.code !== "not-found") throw error;
    }
    return {
      exists: () => Boolean(document),
      data: () => Object.fromEntries(Object.entries(document?.fields || {}).map(([key, value]) => [key, decode(value)])),
      condition: document ? { updateTime: document.updateTime } : { exists: false },
    };
  }
  async function runTransaction(callback) {
    const uid = auth.uid;
    function checkUser() {
      if (!uid || auth.uid !== uid) throw new Error("Session changed");
    }
    for (let attempt = 0; ; attempt++) {
      const token = await auth.getToken();
      checkUser();
      const reads = new Map();
      const writes = [];
      function write(ref, operation) {
        const currentDocument = reads.get(ref.path);
        writes.push(currentDocument ? { ...operation, currentDocument } : operation);
        reads.delete(ref.path);
      }
      function set(ref, data, merge) {
        const fields = {};
        const updateTransforms = [];
        for (const [fieldPath, value] of Object.entries(data)) {
          if (value === serverTime) updateTransforms.push({ fieldPath, setToServerValue: "REQUEST_TIME" });
          else fields[fieldPath] = encode(value);
        }
        write(ref, {
          update: { name: documents + "/" + ref.path, fields },
          ...(merge && { updateMask: { fieldPaths: Object.keys(fields) } }),
          ...(updateTransforms.length && { updateTransforms }),
        });
      }
      const result = await callback({
        async get(ref) {
          if (writes.length) throw new Error("Read all transaction documents before writing");
          const snapshot = await read(ref, token);
          reads.set(ref.path, snapshot.condition);
          return snapshot;
        },
        set: (ref, data) => set(ref, data, false),
        update: (ref, data) => set(ref, data, true),
        delete: ref => write(ref, { delete: documents + "/" + ref.path }),
      });
      if (!writes.length) return result;
      if (reads.size) throw new Error("Unchecked document in community transaction");
      checkUser();
      try {
        await request(":commit", token, { writes });
        return result;
      } catch (error) {
        if (attempt >= 4 || !["aborted", "failed-precondition", "already-exists", "not-found"].includes(error.code)) throw error;
        await new Promise(resolve => setTimeout(resolve, (1 + Math.random()) * 50 * 2 ** attempt));
      }
    }
  }
  return { getDoc: async ref => read(ref, await auth.getToken()), runTransaction };
}
