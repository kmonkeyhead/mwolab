const assert = require("node:assert/strict");
const test = require("node:test");

test("Worker accepts only the site, returns only session fields, and limits request size", async t => {
  const { default: worker } = await import("../workers/mwolab-auth/index.mjs");
  const secret = "server-only-test-key";
  const origin = "https://kmonkeyhead.github.io";
  let upstream;
  t.mock.method(globalThis, "fetch", async (url, init) => {
    upstream = { url: new URL(url), init };
    return Response.json({ localId: "user", idToken: "id", refreshToken: "refresh", expiresIn: "3600", extra: secret });
  });
  const send = (path, body, site = origin) => worker.fetch(new Request("https://example.com" + path, {
    method: "POST", headers: { Origin: site, "Content-Type": "application/json" }, body: JSON.stringify(body),
  }), { FIREBASE_WEB_API_KEY: secret });
  assert.equal((await send("/login", {}, "https://elsewhere.example")).status, 403);
  assert.equal((await send("/other", {})).status, 404);
  assert.equal((await send("/login", { token: "x".repeat(16400) })).status, 413);
  assert.equal(upstream, undefined);
  const response = await send("/login", { token: "google", providerId: "other" });
  assert.deepEqual(await response.json(), { uid: "user", idToken: "id", refreshToken: "refresh", expiresIn: 3600 });
  assert.equal(upstream.url.hostname, "identitytoolkit.googleapis.com");
  assert.equal(upstream.url.searchParams.get("key"), secret);
  assert.equal(new URLSearchParams(JSON.parse(upstream.init.body).postBody).get("providerId"), "google.com");
  globalThis.fetch.mock.mockImplementation(async () => Response.json({ error: { message: "INVALID_REFRESH_TOKEN" } }, { status: 400 }));
  const expired = await send("/refresh", { token: "old" });
  assert.equal(expired.status, 401);
  assert.deepEqual(await expired.json(), { error: "session-expired" });
});

test("a late refresh cannot revive a session removed in another tab", async t => {
  const { createCommunitySession } = await import("../public/community-session.js");
  const key = "mwolab.community.session.v1";
  const entries = new Map([[key, JSON.stringify({ uid: "old", idToken: "id", refreshToken: "old-refresh", expiresAt: 0 })]]);
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key),
  } });
  globalThis.window = { addEventListener() {} };
  t.after(() => {
    delete globalThis.window;
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  });
  let finish;
  t.mock.method(globalThis, "fetch", () => new Promise(resolve => { finish = resolve; }));
  const session = createCommunitySession();
  const pending = session.getToken();
  entries.clear();
  finish(Response.json({ uid: "old", idToken: "new", refreshToken: "next", expiresIn: 3600 }));
  await assert.rejects(pending);
  assert.equal(session.uid, undefined);
  assert.equal(entries.size, 0);
});

test("member commit retries conflicts, preserves timestamps and sends user credentials", async t => {
  const { createMemberFirestore, serverTimestamp } = await import("../public/community-firestore.js");
  const auth = { uid: "member", getToken: async () => "user-token" };
  const db = createMemberFirestore("demo", auth);
  const ref = { path: "users/member" };
  const time = "2026-11-25T01:02:03.123456Z";
  let attempts = 0;
  t.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(init.headers.Authorization, "Bearer user-token");
    if (!url.endsWith(":commit")) return Response.json({ updateTime: time, fields: { createdAt: { timestampValue: time } } });
    const { writes: [write] } = JSON.parse(init.body);
    assert.deepEqual(write.currentDocument, { updateTime: time });
    assert.deepEqual(write.update.fields.createdAt, { timestampValue: time });
    assert.deepEqual(write.updateTransforms, [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }]);
    return ++attempts === 1 ? Response.json({ error: { status: "ABORTED" } }, { status: 409 }) : Response.json({});
  });
  await db.runTransaction(async tx => tx.set(ref, { createdAt: (await tx.get(ref)).data().createdAt, updatedAt: serverTimestamp() }));
  assert.equal(attempts, 2);
  await assert.rejects(db.runTransaction(async tx => {
    await tx.get(ref);
    tx.delete(ref);
    auth.uid = "another";
  }), /Session changed/);
  assert.equal(attempts, 2);
});
