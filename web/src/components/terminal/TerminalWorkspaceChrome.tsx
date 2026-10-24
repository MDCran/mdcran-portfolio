"use client";
import * as React from "react";
import { TOUR_STEPS, terminalWindowSize, type TerminalMode, type TerminalPet } from "@/lib/terminal-workspace";
import styles from "./TerminalWorkspace.module.css";

export function TerminalToolbar({ mode, run, floating, disabled }: { mode: TerminalMode; run: (command:string)=>void; floating:boolean; disabled:boolean }) {
  return <div className={styles.toolbar} role="toolbar" aria-label="Terminal workspace">
    <span className={styles.modeLabel}>Workspace</span>
    {(["shell","ai","agent"] as const).map(value => <button key={value} type="button" aria-pressed={mode === value} onClick={()=>run(`mode ${value}`)} disabled={disabled}>{value === "ai" ? "AI chat" : value === "agent" ? "Agent" : "Shell"}</button>)}
    <span className={styles.spacer}/>
    <button type="button" onClick={()=>run("resume summary")} disabled={disabled}>Resume</button>
    <button type="button" onClick={()=>run("recruiter")} disabled={disabled}>Recruiter</button>
    <button type="button" onClick={()=>run("tour")} disabled={disabled}>Tour</button>
    <button type="button" onClick={()=>run(`window ${floating ? "crt" : "float"}`)} aria-label={floating ? "Restore CRT window" : "Use resizable window"}>{floating ? "CRT" : "Resize ↗"}</button>
  </div>;
}

export function TerminalTour({ step, run }: {step:number;run:(command:string)=>void}) {
  const current=TOUR_STEPS[step];
  if (!current) return null;
  return <div className={styles.tour} aria-label="Guided portfolio tour">
    <div className={styles.tourCopy}><strong>{step+1}/{TOUR_STEPS.length} · {current.title}</strong><p>{current.description}</p></div>
    <button type="button" onClick={()=>run("tour back")} disabled={step===0}>Back</button>
    <button type="button" onClick={()=>run("tour next")}>{step===TOUR_STEPS.length-1 ? "Finish" : "Next →"}</button>
    <button type="button" onClick={()=>run("tour stop")} aria-label="End tour">×</button>
  </div>;
}

const pets = {cat:" /\\_/\\\n( o.o )\n > ^ <",bot:"┌─[•]─┐\n│ o o │\n└─┬─┬─┘",crab:" \\  /\n(V)(V)\n /||\\"};
export function TerminalCompanion({ pet, busy, mode }: {pet:TerminalPet;busy:boolean;mode:TerminalMode}) {
  const [wave,setWave]=React.useState(false);
  React.useEffect(()=>{if(!wave)return; const timer=setTimeout(()=>setWave(false),2200);return()=>clearTimeout(timer);},[wave]);
  if(pet==="off")return null;
  return <button type="button" className={styles.pet} onClick={()=>setWave(true)} aria-label={`Pet your terminal ${pet}`} title="pet cat | bot | crab | off">
    <pre aria-hidden="true">{pets[pet]}</pre><span>{wave ? "Hey, explorer! ♡" : busy ? "Thinking with you…" : mode==="agent" ? "Following the evidence." : "Ready when you are."}</span>
  </button>;
}

export function TerminalResize({ shell, onSize }: { shell:React.RefObject<HTMLDivElement|null>;onSize:(size:{width:number;height:number})=>void }) {
  const drag=React.useRef<{x:number;y:number;width:number;height:number}|null>(null);
  return <button type="button" className={styles.resize} aria-label="Resize terminal; use arrow keys for size" title="Drag to resize · Arrow keys adjust size"
    onPointerDown={event=>{const node=shell.current;if(!node)return;event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);drag.current={x:event.clientX,y:event.clientY,width:node.offsetWidth,height:node.offsetHeight};}}
    onPointerMove={event=>{if(!drag.current)return;const start=drag.current;onSize(terminalWindowSize(start.width+(event.clientX-start.x)*2,start.height+(event.clientY-start.y)*2,window.innerWidth,window.innerHeight));}}
    onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}
    onKeyDown={event=>{const node=shell.current;if(!node||!event.key.startsWith("Arrow"))return;event.preventDefault();event.stopPropagation();onSize(terminalWindowSize(node.offsetWidth+(event.key==="ArrowRight"?40:event.key==="ArrowLeft"?-40:0),node.offsetHeight+(event.key==="ArrowDown"?40:event.key==="ArrowUp"?-40:0),window.innerWidth,window.innerHeight));}}/>;
}

export type TerminalPointerTarget = { token:number;zone:"transcript"|"preview"|"results";label:string };
export function TerminalPointer({ shell, target }: {shell:React.RefObject<HTMLDivElement|null>;target:TerminalPointerTarget|null}) {
  const [point,setPoint]=React.useState({x:24,y:60,visible:false});
  React.useEffect(()=>{
    const root=shell.current;if(!root||!target)return;
    let fade:ReturnType<typeof setTimeout>;
    const timer=setTimeout(()=>{
      const zone=root.querySelector<HTMLElement>(`[data-terminal-target="${target.zone}"]`);
      const mark=zone?.querySelector<HTMLElement>("mark");
      const node=mark ?? zone;
      if(!node)return;
      if(mark)mark.scrollIntoView({block:"nearest",behavior:"auto"});
      const bounds=root.getBoundingClientRect(),rect=node.getBoundingClientRect();
      const sx=root.offsetWidth/bounds.width,sy=root.offsetHeight/bounds.height;
      setPoint({x:Math.min(root.offsetWidth-95,Math.max(12,(rect.left-bounds.left+Math.min(36,rect.width/2))*sx)),y:Math.min(root.offsetHeight-65,Math.max(36,(rect.top-bounds.top+20)*sy)),visible:true});
      fade=setTimeout(()=>setPoint(previous=>({...previous,visible:false})),4500);
    },160);
    return()=>{clearTimeout(timer);clearTimeout(fade);};
  },[shell,target]);
  if(!target)return null;
  return <div className={styles.pointer} style={{left:point.x,top:point.y,opacity:point.visible?1:0}} aria-hidden="true"><svg width="22" height="27" viewBox="0 0 22 27"><path d="M2 1L2 22L8 17L12 25L16 23L12 15L20 14Z" fill="#052e16" stroke="currentColor" strokeWidth="1.5"/></svg><span>{target.label}</span></div>;
}
