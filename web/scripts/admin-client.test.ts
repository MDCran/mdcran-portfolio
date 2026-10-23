import assert from "node:assert/strict";
import { test } from "node:test";
import { adminRequest, AdminRequestError, removedRecords, recordVersion } from "../src/lib/admin-client";

test("HTTP errors never look like successful saves and conflict details survive", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({error:"This record changed. Reload it before saving."}),{status:409});
    await assert.rejects(adminRequest("/test",{method:"PUT",body:"{}"}),error=>error instanceof AdminRequestError&&error.status===409&&error.message.includes("Reload"));
    globalThis.fetch = async () => new Response("service unavailable",{status:503});
    await assert.rejects(adminRequest("/test"),/503/);
    globalThis.fetch = async () => Response.json({record:{id:"a",_version:2}});
    assert.equal((await adminRequest<{record:{_version:number}}>("/test")).record._version,2);
  } finally { globalThis.fetch=original; }
});
test("explicit resume removals preserve concurrency versions including renamed skills",()=>{
  assert.deepEqual(removedRecords("skills",[{name:"Old",_version:3},{name:"Keep",_version:2}],[{name:"New"},{name:"Keep"}]),[{id:"Old",expectedVersion:3}]);
  assert.deepEqual(removedRecords("experiences",[{id:"a",_version:4}],[{id:"a"}]),[]);
  assert.equal(recordVersion({}),0);
});

test("malformed and empty successful responses never confirm a save", async () => {
  const original = globalThis.fetch;
  try {
    const responses = [
      () => new Response("<html>Sign in</html>", { headers: { "Content-Type": "text/html" } }),
      () => new Response("{\"ok\":"),
      () => new Response(""),
      () => new Response(null, { status: 204 }),
      () => Response.json(null),
      () => Response.json(true),
      () => Response.json("saved"),
    ];
    for (const response of responses) {
      globalThis.fetch = async () => response();
      let confirmed = false;
      await assert.rejects(
        adminRequest("/test", { method: "POST", body: "{}" }).then(() => { confirmed = true; }),
        error => error instanceof AdminRequestError && /Refresh to confirm/.test(error.message),
      );
      assert.equal(confirmed, false);
    }
    globalThis.fetch = async () => Response.json([]);
    assert.deepEqual(await adminRequest("/test"), []);
    globalThis.fetch = async () => Response.json({ success: true });
    assert.deepEqual(await adminRequest("/test"), { success: true });
  } finally { globalThis.fetch = original; }
});

test("abort signal reaches fetch and cancellation rejects instead of confirming a save", async () => {
  const original = globalThis.fetch;
  try {
    const alreadyAborted = new AbortController();
    alreadyAborted.abort();
    globalThis.fetch = async () => { assert.fail("An already cancelled request must not be sent"); };
    await assert.rejects(adminRequest("/test", { signal: alreadyAborted.signal }), { name: "AbortError" });

    const controller = new AbortController();
    globalThis.fetch = async (_url, init) => {
      assert.equal(init?.signal, controller.signal);
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
      });
    };
    const pending = adminRequest("/test", { signal: controller.signal });
    controller.abort();
    await assert.rejects(pending, { name: "AbortError" });
  } finally { globalThis.fetch = original; }
});

test("aborts during response parsing survive even when the body parser rejects or resolves", async () => {
  const original = globalThis.fetch;
  try {
    for (const rejectBody of [false, true]) {
      const controller = new AbortController();
      globalThis.fetch = async () => {
        const response = Response.json({ success: true });
        response.json = async () => {
          controller.abort();
          if (rejectBody) throw controller.signal.reason;
          return { success: true };
        };
        return response;
      };
      await assert.rejects(adminRequest("/test", { signal: controller.signal }), { name: "AbortError" });
    }
    const abortedBody = new DOMException("Body cancelled", "AbortError");
    globalThis.fetch = async () => {
      const response = Response.json({ success: true });
      response.json = async () => { throw abortedBody; };
      return response;
    };
    await assert.rejects(adminRequest("/test"), error => error === abortedBody);
  } finally { globalThis.fetch = original; }
});
