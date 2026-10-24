"use client";

import * as React from "react";
import { TerminalPrinter, type TerminalLogEntry } from "@/lib/terminal-output";
import { highlightParts } from "@/lib/terminal-workspace";
import styles from "./TerminalWorkspace.module.css";

const TerminalLine = React.memo(function TerminalLine({ entry, text, highlight }: {
  entry: TerminalLogEntry; text: string; highlight: string;
}) {
  if (entry.prompt != null) {
    const end = entry.prompt.lastIndexOf(">") + 1;
    return <div className="flex leading-5" style={{textShadow:"0 0 6px rgba(134,239,172,.25)"}}>
      <span className="text-[#4ade80] shrink-0 select-none">{entry.prompt.slice(0,end)}</span>
      <span className="text-[#d9fbe3]/90">{entry.prompt.slice(end)}</span>
    </div>;
  }
  if (entry.links) return <div className="flex flex-wrap gap-x-6 gap-y-0 leading-5">
    {entry.links.map(link=><a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
      className="text-[#86efac] underline underline-offset-2 hover:text-[#dcfce7] transition-colors">↗ {link.label}</a>)}
  </div>;
  const tone = entry.tone === "success" ? "text-[#86efac]" : entry.tone === "error" ? "text-[#fca5a5]" : entry.tone === "accent" ? "text-[#4ade80] font-semibold" : entry.tone === "muted" ? "text-[#86efac]/45" : "text-[#d9fbe3]/85";
  return <div className={`${entry.preserveWhitespace ? "whitespace-pre" : "whitespace-pre-wrap break-words"} leading-[0.875rem] ${tone}`}
    style={{textShadow:"0 0 6px rgba(74,222,128,.14)"}}>
    {highlightParts(text,highlight).map((part,index)=>part.match?<mark key={index}>{part.text}</mark>:part.text)}
  </div>;
});

export default function TerminalTranscript({ entries, highlight, enabled, active, onPrint, onProgress }: {
  entries: TerminalLogEntry[]; highlight: string; enabled: boolean; active: boolean;
  onPrint: () => void; onProgress: () => void;
}) {
  const [printer] = React.useState(()=>new TerminalPrinter());
  const [frame,setFrame] = React.useState(()=>printer.view());
  const [reducedMotion,setReducedMotion] = React.useState(false);
  const [hidden,setHidden] = React.useState(false);
  const lastPulse=React.useRef(0);

  React.useEffect(()=>{
    const preference=window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion=()=>setReducedMotion(preference.matches);
    const visibility=()=>setHidden(document.hidden);
    motion();visibility();
    preference.addEventListener("change",motion);
    document.addEventListener("visibilitychange",visibility);
    return()=>{preference.removeEventListener("change",motion);document.removeEventListener("visibilitychange",visibility);};
  },[]);

  React.useEffect(()=>{
    printer.sync(entries);
    if (!enabled || reducedMotion) printer.finish();
    setFrame(printer.view());
    if (!active || hidden || !enabled || reducedMotion) {printer.resetClock();return;}
    let request=0;
    const tick=(now:number)=>{
      if (printer.advance(now)) setFrame(printer.view());
      if (printer.pending) request=requestAnimationFrame(tick);
    };
    if (printer.pending) request=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(request);
  },[entries,enabled,active,reducedMotion,hidden,printer]);

  // Sound follows the committed reveal, never a separate timer or a network chunk.
  React.useLayoutEffect(()=>{
    if (frame.pulse === lastPulse.current) return;
    lastPulse.current=frame.pulse;
    if (active && enabled && !reducedMotion && !document.hidden) onPrint();
  },[frame.pulse,onPrint,active,enabled,reducedMotion]);
  React.useLayoutEffect(()=>{onProgress();},[frame,onProgress]);

  return <>
    {frame.lines.map(({entry,text})=><div key={entry.id} data-terminal-line><TerminalLine entry={entry} text={text} highlight={highlight}/></div>)}
    {frame.pending && enabled && !reducedMotion && <button type="button" className={styles.skipTyping} onClick={()=>{printer.finish();setFrame(printer.view());}}>Show all text <span aria-hidden="true">»</span></button>}
  </>;
}
