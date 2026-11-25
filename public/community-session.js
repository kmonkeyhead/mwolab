const endpoint = "https://mwolab-auth.killkimno.workers.dev";
const storageKey = "mwolab.community.session.v1";

export function createCommunitySession() {
  let persistent = true;
  function read() {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey));
      if (data?.uid && data.idToken && data.refreshToken && Number.isFinite(data.expiresAt)) return data;
    } catch { /* Storage can be disabled by the browser. */ }
    return null;
  }
  let session = read();
  let revision = 0;
  let refreshTask;
  let listener;
  function apply(value) {
    const oldUid = session?.uid;
    session = value;
    revision++;
    if (oldUid !== session?.uid) listener?.(session ? { uid: session.uid } : null);
  }
  function save(value) {
    try {
      if (value) localStorage.setItem(storageKey, JSON.stringify(value));
      else localStorage.removeItem(storageKey);
    } catch { persistent = false; }
    apply(value);
  }
  window.addEventListener("storage", event => {
    if (event.key === storageKey || event.key === null) sync();
  });
  function sync() {
    if (!persistent) return;
    const latest = read();
    if (latest?.idToken !== session?.idToken || latest?.refreshToken !== session?.refreshToken) apply(latest);
  }
  async function exchange(path, token) {
    const response = await fetch(endpoint + path, {
      method: "POST", credentials: "omit", cache: "no-store",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }),
    });
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error("Authentication failed"), { code: data.error });
    if (!data.uid || !data.idToken || !data.refreshToken || !(data.expiresIn > 0)) throw new Error("Invalid session");
    return { uid: data.uid, idToken: data.idToken, refreshToken: data.refreshToken, expiresAt: Date.now() + data.expiresIn * 1000 };
  }
  async function refresh(expected) {
    const before = revision;
    try {
      const next = await exchange("/refresh", expected.refreshToken);
      sync();
      if (next.uid !== expected.uid) throw new Error("Account changed during refresh");
      if (before === revision) save(next);
      if (session?.uid !== expected.uid) throw new Error("Session changed");
      return session.idToken;
    } catch (error) {
      sync();
      if (before === revision && error.code === "session-expired") save(null);
      throw error;
    }
  }
  const api = {
    get uid() { sync(); return session?.uid; },
    onChange(callback) {
      listener = callback;
      callback(session ? { uid: session.uid } : null);
      if (session && session.expiresAt <= Date.now() + 60000) api.getToken().catch(() => {});
    },
    async signIn(token) {
      const before = ++revision;
      const next = await exchange("/login", token);
      sync();
      if (before !== revision) throw new Error("Session changed");
      save(next);
      return { uid: next.uid };
    },
    signOut() { save(null); },
    async getToken() {
      sync();
      if (!session) throw new Error("Login required");
      if (session.expiresAt > Date.now() + 60000) return session.idToken;
      if (refreshTask?.session === session) return refreshTask.promise;
      const task = { session, promise: refresh(session) };
      refreshTask = task;
      try { return await task.promise; }
      finally { if (refreshTask === task) refreshTask = null; }
    },
  };
  return api;
}
