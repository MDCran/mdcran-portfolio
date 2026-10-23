"use client";
import dynamic from "next/dynamic";
const ThemeEffectsOverlay=dynamic(()=>import("@/components/shared/ThemeEffectsOverlay"),{ssr:false});
const MoodEngine=dynamic(()=>import("@/components/shared/MoodEngine"),{ssr:false});
const SectionWheel=dynamic(()=>import("@/components/shared/SectionWheel"),{ssr:false});
export default function CalmEffects(){
  return <><ThemeEffectsOverlay/><MoodEngine/><SectionWheel/></>;
}
