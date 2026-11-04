"use client";

import { Bike, Gauge, Phone, Route, Watch } from "lucide-react";
import { AnimatedNumber, Photo, PhotoSequence } from "./PresentationMedia";
import styles from "./presentation.module.css";

const storySteps = [
  ["Early days", "The soccer field"],
  ["Growing up", "Big ideas"],
  ["Minecraft", "Building worlds"],
  ["Today", "Still curious"],
] as const;

export function StoryTimeline({ step }: { step: number }) {
  return <ol className={styles.storyTimeline} aria-label="My story so far">
    {storySteps.map(([era, label], index) => <li key={era} aria-current={index === step ? "step" : undefined} data-reached={index <= step}><span>{era}</span><strong>{label}</strong></li>)}
  </ol>;
}

export function OriginStory({ paused }: { paused: boolean }) {
  return <div className={styles.originStory}>
    <div className={styles.originStoryCopy}><p className={styles.label}>01 / Where it started</p><h2>A soccer field.<br />An iPad.<br /><em>A beginning.</em></h2><p>Minecraft started as a game.<br />Then I wanted to make things.</p></div>
    <PhotoSequence paused={paused} seconds={8.2} label="Where it started" className={styles.originStoryPhotos} showCaptions={false} images={[
      { name: "soccer-childhood-2011", alt: "", caption: "At the soccer field", position: "center 45%" },
      { name: "soccer-team-2011", alt: "", caption: "With the team", position: "center 45%" },
      { name: "soccer-ipad-generated", alt: "", caption: "The iPad memory · illustration", position: "65% center" },
    ]} />
    <StoryTimeline step={0} />
  </div>;
}

export function HeatStory() {
  return <div className={styles.heatStory}>
    <div className={styles.heatStoryCopy}>
      <p className={styles.label}>02 / Growing up a Miami Heat fan</p>
      <h2>Watching<br /><em>the Big 3.</em></h2>
      <div className={styles.heatBigThree}><span>LeBron James</span><span>Chris Bosh</span><span>Dwyane Wade</span></div>
      <div className={styles.cranberryPlan}><h3>“Cranberry Crush”</h3><p>Start my own NBA team.<br />Build a website to recruit players.<br />Try to buy server space.</p></div>
      <div className={styles.heatPunchline}><Phone aria-hidden="true" /><p>Then my parents got a phone call.<br /><strong>And I got in trouble.</strong></p></div>
    </div>
    <figure className={`${styles.heatPhoto} ${styles.morphVisual}`}><Photo name="heat-udonis-2013" alt="Michael as a child posing beside Udonis Haslem at a signing event" /><figcaption>Meeting Udonis Haslem · September 2013</figcaption></figure>
    <StoryTimeline step={1} />
  </div>;
}

export function HiltonHeadStory() {
  return <div className={styles.hiltonStory}>
    <Photo name="salty-dog-marina-official" alt="" className={styles.morphVisual} />
    <div className={styles.hiltonShade} aria-hidden="true" />
    <div className={styles.hiltonCopy}><p className={styles.label}>A childhood favorite</p><h2>Hilton Head Island.<br /><em>Then and now.</em></h2><p>Stops at the Salty Dog.<br />Bike rides along island trails<br />and on the beach.</p></div>
    <div className={styles.hiltonMemories}>
      <span>Hilton Head, growing up</span>
      <figure><Photo name="hilton-childhood-deer" alt="" /></figure>
      <figure><Photo name="hilton-childhood-dock" alt="" /></figure>
    </div>
  </div>;
}

function CyclingDistance({ paused }: { paused: boolean }) {
  return <div className={styles.cyclingSummary} data-cycling-summary data-paused={paused}>
    <header><span>A year on two wheels</span><strong>1,000<sup>+</sup></strong><p>miles biked a year</p></header>
    <div className={styles.bikeIllustration}>
      <svg className={styles.bikeRouteDrawing} viewBox="0 0 400 280" fill="none" aria-hidden="true"><path d="M-20 224 C40 224 32 142 92 150 S169 246 230 198 S268 68 335 87 S391 168 420 131" /><circle cx="92" cy="150" r="5" /><circle cx="335" cy="87" r="5" /></svg>
      <div className={styles.bikeComputer}>
        <div className={styles.bikeComputerTop}><Bike aria-hidden="true" /><span>Ride log</span><i aria-hidden="true" /></div>
        <svg className={styles.bikeGauge} viewBox="0 0 200 180" aria-hidden="true">
          <path d="M50.5 139.5 A70 70 0 1 1 149.5 139.5" className={styles.bikeGaugeTrack} />
          <path d="M50.5 139.5 A70 70 0 1 1 149.5 139.5" pathLength="1" className={styles.bikeGaugeFill} />
          {Array.from({ length: 9 }, (_, index) => {
            const angle = (135 + index * 33.75) * Math.PI / 180;
            return <line key={index} x1={100 + Math.cos(angle) * 61} y1={90 + Math.sin(angle) * 61} x2={100 + Math.cos(angle) * (index % 2 ? 57 : 54)} y2={90 + Math.sin(angle) * (index % 2 ? 57 : 54)} className={styles.bikeGaugeTick} />;
          })}
          {[0, 10, 20, 30, 40].map((miles, index) => { const angle = (135 + index * 67.5) * Math.PI / 180; return <text key={miles} x={100 + Math.cos(angle) * 45} y={93 + Math.sin(angle) * 45} className={styles.bikeGaugeNumber}>{miles}</text>; })}
          <g className={styles.bikeGaugeNeedleGroup}><line x1="100" y1="90" x2="100" y2="49" className={styles.bikeGaugeNeedle} /></g>
          <circle cx="100" cy="90" r="3.5" fill="#d6e9c6" />
        </svg>
        <div className={styles.bikeWeekly}><strong><span>~</span><AnimatedNumber value={25} paused={paused} /></strong><span>miles / week</span><small>on average</small></div>
        <div className={styles.bikeComputerButtons} aria-hidden="true"><i /><i /><i /></div>
      </div>
    </div>
    <footer className={styles.cyclingTracking}><span>Tracked with</span><div><span><Watch aria-hidden="true" />WHOOP</span><span><Route aria-hidden="true" />Strava</span><span><Gauge aria-hidden="true" />Bike speedometer</span></div></footer>
  </div>;
}

export function BikingPlaces({ paused }: { paused: boolean }) {
  return <div className={styles.bikingPlaces}>
    <div className={styles.bikingPlacesCopy}>
      <p className={styles.label}>Outside / On two wheels</p>
      <h2>Favorite places<br /><em>to bike.</em></h2>
      <ol className={styles.bikeRoutes}>
        <li><span>01</span><div><h3>Boca Raton</h3><p>The airport. The beach.</p></div></li>
        <li><span>02</span><div><h3>Orlando & Winter Garden</h3><p>West Orange Trail.<br />Winter Garden Main Street.</p></div></li>
        <li><span>03</span><div><h3>Hilton Head Island</h3><p>The island trails.<br />And riding on the beach.</p></div></li>
      </ol>
    </div>
    <CyclingDistance paused={paused} />
  </div>;
}
