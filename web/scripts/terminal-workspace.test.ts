import "./helpers/css-modules";
import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TerminalToolbar, TerminalTour } from "../src/components/terminal/TerminalWorkspaceChrome";
import { resumeLines, resumeLinks, recruiterProjects, terminalActions, terminalWindowSize, terminalTourStep, highlightParts, TOUR_STEPS, type ResumeSnapshot } from "../src/lib/terminal-workspace";
import { streamTerminalAnswer } from "../src/lib/terminal-ai";
import type { Project } from "../src/lib/types";

const projects = [
  {id:"coretex",slug:"coretex",title:"Coretex",category:"engineering",description:"AI agents",tags:["React"],featured:true},
  {id:"site",slug:"site",title:"Website",category:"engineering",description:"React and Tailwind"},
  {id:"game",slug:"game",title:"Game",category:"arts-and-entertainment",description:"AI game"},
] as Project[];
const data:ResumeSnapshot={projects,siteContent:{homeAbout:{description:"Published introduction"}} as ResumeSnapshot["siteContent"],resumeProfile:{fullName:"Michael Cran",title:"Software engineer",location:"Florida",email:"",linkedinUrl:"",githubUrl:"",pdfUrl:"https://cdn.example.com/resume.pdf"},experiences:[
  {id:"old",type:"job",role:"Developer",companyName:"Earlier",startDate:"2020-01-01",endDate:"2022-01-01",description:"Old job"},
  {id:"now",type:"job",role:"Founder",companyName:"Current",current:true,startDate:"2024-04-01",location:"Boca Raton, FL",description:"Current job",highlights:["Published work"]},
],educations:[{id:"degree",institution:"UCF",degree:"Computer Science",startDate:"2022-08-01",endDate:"2026-05-01"}],skills:[{name:"React",category:"Frontend"}],certifications:[],awards:[]};

test("resume is pulled from published profile, sorted experience, dates and education",()=>{
  const lines=resumeLines(data,"all").map(line=>line.text).join("\n");
  assert.match(lines,/Michael Cran/);assert.match(lines,/Published introduction/);
  assert.ok(lines.indexOf("Founder")<lines.indexOf("Developer"));
  assert.match(lines,/Apr 2024 – Present · Boca Raton/);
  assert.match(lines,/UCF · Aug 2022 – May 2026/);
  assert.match(lines,/• Published work/);
  assert.match(lines,/Frontend: React/);
});

test("resume sections stay focused and empty sections are explicit",()=>{
  const skills=resumeLines(data,"skills").map(line=>line.text).join("\n");
  assert.match(skills,/React/);assert.doesNotMatch(skills,/Founder|Computer Science/);
  assert.match(resumeLines(data,"certifications").at(-1)!.text,/No certifications/);
  assert.match(resumeLines({...data,educations:[]},"education").at(-1)!.text,/No education/);
});

test("resume uses the published PDF only and always offers the print view",()=>{
  assert.ok(resumeLinks(data.resumeProfile).some(link=>link.href===data.resumeProfile!.pdfUrl));
  for(const pdfUrl of ["", "javascript:alert(1)","//evil.com/r.pdf","/../private/resume.pdf","https://user:pass@example.com/r.pdf"]) {
    assert.equal(resumeLinks({...data.resumeProfile!,pdfUrl}).length,2);
  }
  assert.deepEqual(resumeLinks().map(link=>link.href),["/resume","/resume/print"]);
});

test("recruiter evidence filters engineering, ranks featured, and avoids false technology matches",()=>{
  assert.deepEqual(recruiterProjects(data).map(project=>project.id),["coretex","site"]);
  assert.deepEqual(recruiterProjects(data,"AI React").map(project=>project.id),["coretex"]);
  assert.deepEqual(recruiterProjects(data,"unpublished qualification"),[]);
});

test("agent resolves public content actions and rejects arbitrary control",()=>{
  const actions=terminalActions([
    {type:"project",value:"coretex"},{type:"navigate",value:"/engineering/coretex"},
    {type:"highlight",value:"resume-skills"},{type:"navigate",value:"https://www.mdcran.com/resume"},
  ],projects);
  assert.deepEqual(actions,[{type:"project",id:"coretex"},{type:"resume",section:"skills"},{type:"resume",section:"all"}]);
  for(const action of [{type:"navigate",value:"/admin"},{type:"navigate",value:"https://evil.com/engineering/coretex"},{type:"project",value:"missing"},{type:"shell",value:"send"},{type:"click",value:"submit"},{type:"highlight",value:"#anything > button"}]) assert.deepEqual(terminalActions([action],projects),[]);
  assert.deepEqual(terminalActions(null,projects),[]);
  assert.deepEqual(terminalActions([{type:"highlight",value:"project-gallery"}],projects),[{type:"focus",zone:"preview"}]);
});

test("AI actions are returned only for explicit Agent mode, never normal conversation",async()=>{
  for(const agent of [false,true]) {
    const result=await streamTerminalAnswer({agent,question:"Show the resume",history:[],signal:new AbortController().signal,onText(){},fetcher:(async(_url,init)=>{
      const context=JSON.parse(String(init?.body)).domContext;
      assert.equal(context.includes("Agent mode is enabled"),agent);
      return new Response('data: {"text":"Here is the resume."}\n\ndata: {"actions":[{"type":"navigate","value":"/resume"}]}\n\ndata: [DONE]\n\n',{headers:{"Content-Type":"text/event-stream"}});
    }) as typeof fetch});
    assert.equal(result.actions.length,agent?1:0);
  }
});

test("highlights preserve text and treat special characters literally",()=>{
  const text="React + C++ and react again";
  const parts=highlightParts(text,"react");
  assert.equal(parts.map(part=>part.text).join(""),text);
  assert.equal(parts.filter(part=>part.match).length,2);
  assert.equal(highlightParts(text,"C++").filter(part=>part.match)[0].text,"C++");
  assert.equal(highlightParts(text,"")[0].match,false);
});

test("window sizes stay inside desktop and narrow viewports",()=>{
  assert.deepEqual(terminalWindowSize(9999,9999,1280,800),{width:1256,height:776});
  assert.deepEqual(terminalWindowSize(100,100,1280,800),{width:560,height:400});
  assert.deepEqual(terminalWindowSize(1100,760,390,700),{width:366,height:676});
});

test("tour supports back, direct navigation, finish and restart without leaving an invalid step",()=>{
  assert.equal(terminalTourStep("start",null),0);
  assert.equal(terminalTourStep("back",0),0);
  assert.equal(terminalTourStep("next",0),1);
  assert.equal(terminalTourStep("4",0),3);
  assert.equal(terminalTourStep("next",TOUR_STEPS.length-1),null);
  assert.equal(terminalTourStep("stop",2),null);
  assert.equal(terminalTourStep("start",3),0);
  for(const invalid of ["-1","0","6","1.5","nonsense"]) assert.equal(terminalTourStep(invalid,0),undefined);
});

test("toolbar exposes just the two workspaces and a tour toggle",()=>{
  const html=renderToStaticMarkup(React.createElement(TerminalToolbar,{mode:"ai",run(){},tourActive:true,disabled:false}));
  assert.equal((html.match(/<button /g)||[]).length,3);
  assert.match(html,/aria-pressed="true"[^>]*>.*?AI chat/);
  assert.match(html,/aria-expanded="true" aria-controls="terminal-tour"/);
  assert.doesNotMatch(html,/Agent|Resume|Recruiter|Resize/);
});

test("tour stays navigable while data loads and prepares AI questions without sending",()=>{
  const search=renderToStaticMarkup(React.createElement(TerminalTour,{step:1,run(){},tried:false,dataReady:false}));
  assert.match(search,/disabled=""[^>]*>Loading portfolio/);
  assert.match(search,/>Next →<\/button>/);
  assert.match(search,/aria-current="step"/);
  const ai=renderToStaticMarkup(React.createElement(TerminalTour,{step:3,run(){},tried:false,dataReady:true}));
  assert.match(ai,/Draft a question/);
  assert.match(ai,/only sent when you press Enter/);
  const finish=renderToStaticMarkup(React.createElement(TerminalTour,{step:4,run(){},tried:true,dataReady:true}));
  assert.match(finish,/Finish tour/);
  assert.match(finish,/orange button/);
});
