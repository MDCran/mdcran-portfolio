import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
const origin=process.env.SMOKE_ORIGIN??"http://localhost:4000";
if(!["localhost","127.0.0.1"].includes(new URL(origin).hostname))throw new Error("Mutation smoke tests require a local isolated server.");
if(!process.env.JWT_SECRET)throw new Error("Set the isolated server JWT_SECRET.");
const cookie=`mdcran_admin_token=${jwt.sign({role:"admin"},process.env.JWT_SECRET,{expiresIn:"10m"})}`;
// Model the TLS-terminating production proxy while exercising the built app over loopback.
const transportHeaders={"x-forwarded-proto":"https"};
const headers={...transportHeaders,Cookie:cookie,"Content-Type":"application/json"};
async function request(path,body){const response=await fetch(origin+path,{headers,...(body?{method:"POST",body:JSON.stringify(body)}:{})});return {response,body:await response.json().catch(()=>null)};}
for(const path of ["/engineering","/work","/resume/print","/githubprofile?capture=1","/sitemap.xml"]){const response=await fetch(origin+path,{headers:transportHeaders});assert.equal(response.status,200,path);console.log(`Public route passed: ${path}`);}
for(const path of ["/api/admin/content?collection=projects","/api/admin/operations","/api/admin/publishing","/api/admin/content-health","/api/admin/ai-studio"]){assert.equal((await fetch(origin+path,{headers:transportHeaders})).status,401,`Authorization: ${path}`);const result=await request(path);assert.equal(result.response.status,200,path);console.log(`Protected API passed: ${path}`);}
const id=`smoke-${Date.now()}`;let version=0;
try{
 const created=await request("/api/admin/content",{collection:"clients",id,action:"save",expectedVersion:0,record:{id,name:"Isolated smoke fixture",roles:[]}});assert.equal(created.response.status,200);version=created.body.version;
 const draft=await request("/api/admin/content",{collection:"clients",id,action:"draft",expectedVersion:version,record:{id,name:"Isolated draft fixture",roles:[]}});assert.equal(draft.response.status,200);version=draft.body.version;
 const detail=await request(`/api/admin/content?collection=clients&id=${id}`);assert.equal(detail.body.record.name,"Isolated smoke fixture");assert.equal(detail.body.draft.record.name,"Isolated draft fixture");
 const stale=await request("/api/admin/content",{collection:"clients",id,action:"save",expectedVersion:0,record:{id,name:"Stale",roles:[]}});assert.equal(stale.response.status,409);
 const publish=await request("/api/admin/content",{collection:"clients",id,action:"publish",expectedVersion:version});assert.equal(publish.response.status,200);version=publish.body.version;assert.equal(publish.body.record.name,"Isolated draft fixture");
 console.log("Real HTTP save/draft/publish/conflict flow passed.");
}finally{if(version){const deleted=await request("/api/admin/content",{collection:"clients",id,action:"delete",expectedVersion:version});assert.equal(deleted.response.status,200);}}
console.log("Local integration smoke checks passed; no production writes or outbound messages.");
