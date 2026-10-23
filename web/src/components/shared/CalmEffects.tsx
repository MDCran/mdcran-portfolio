"use client";
import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
const ThemeEffectsOverlay=dynamic(()=>import("@/components/shared/ThemeEffectsOverlay"),{ssr:false});
const MoodEngine=dynamic(()=>import("@/components/shared/MoodEngine"),{ssr:false});
const SectionWheel=dynamic(()=>import("@/components/shared/SectionWheel"),{ssr:false});
const key="mdcran_ambient_effects";
function subscribe(callback:()=>void){window.addEventListener("storage",callback);window.addEventListener("mdcran:effects",callback);return()=>{window.removeEventListener("storage",callback);window.removeEventListener("mdcran:effects",callback);};}
function snapshot(){try{return localStorage.getItem(key)==="on";}catch{return false;}}
export default function CalmEffects(){
  const enabled=useSyncExternalStore(subscribe,snapshot,()=>false);
  return enabled ? <><ThemeEffectsOverlay/><MoodEngine/><SectionWheel/></> : null;
}
export function EffectsToggle(){
  const enabled=useSyncExternalStore(subscribe,snapshot,()=>false);
  return <button aria-pressed={enabled} onClick={()=>{try{localStorage.setItem(key,enabled?"off":"on");}catch{}window.dispatchEvent(new Event("mdcran:effects"));}} className="text-white/55 hover:text-white print:hidden" title="Toggle optional decorative effects">Decorative effects: {enabled?"on":"off"}</button>;
}
