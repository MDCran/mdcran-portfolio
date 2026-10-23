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
