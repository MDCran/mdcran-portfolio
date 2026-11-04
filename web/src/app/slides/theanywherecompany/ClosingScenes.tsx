"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BriefcaseBusiness, Code2, House, MessagesSquare } from "lucide-react";
import { BrandMark, type PresentationBrandName } from "./PresentationBrand";
import { AnimatedNumber, Clip, Photo } from "./PresentationMedia";
import styles from "./closing.module.css";

const ease = [.22, 1, .36, 1] as const;
const tools: { name: PresentationBrandName; label: string }[] = [
  { name: "anthropic", label: "Anthropic" }, { name: "openai", label: "OpenAI" },
  { name: "gemini", label: "Gemini" }, { name: "higgsfield", label: "Higgsfield AI" },
  { name: "elevenlabs", label: "ElevenLabs" }, { name: "twilio", label: "Twilio" }, { name: "n8n", label: "n8n" },
];

export function EverydayAI() {
  return <div className={styles.everydayAI}>
    <div className={styles.everydayTop}>
      <div className={styles.everydayCopy}><span className={styles.eyebrow}>Always learning</span><h2>AI, in my<br /><em>everyday life.</em></h2><p>Staying organized.<br />Automating the repetitive work.<br />Expanding my knowledge.</p></div>
      <div className={styles.modelCredits}><span>This deck was powered by</span>
        <div><BrandMark name="openai" decorative /><p><small>OpenAI</small><strong>GPT 6.1 Sol</strong></p></div>
        <div><BrandMark name="anthropic" decorative /><p><small>Anthropic</small><strong>Claude Opus 5.5</strong></p></div>
      </div>
    </div>
    <ul className={styles.aiToolkit} aria-label="AI and automation tools I use">{tools.map((tool) => <li key={tool.name}><BrandMark name={tool.name} decorative /><span>{tool.label}</span></li>)}</ul>
  </div>;
}

const farewellTraces = [
  "M0 125 H150 L205 70 H315",
  "M0 255 H75 L115 215 H205",
  "M1000 120 H850 L800 170 H720",
  "M1000 350 H900 L850 400 H750",
  "M0 460 H170 L220 510 H330",
  "M1000 475 H945 L900 520 H760",
];

export function ThankYou({ paused }: { paused: boolean }) {
  return <div className={styles.farewell} data-paused={paused}>
    <div className={styles.farewellGrid} aria-hidden="true" />
    <svg className={styles.farewellCircuits} viewBox="0 0 1000 562.5" fill="none" aria-hidden="true">
      {farewellTraces.map((path, index) => <g key={path}>
        <path d={path} className={styles.farewellTrace} />
        <path d={path} pathLength="1" className={styles.farewellGlint} style={{ animationDelay: `${index * -2.1}s` }} />
      </g>)}
      {[[315, 70], [205, 215], [720, 170], [750, 400], [330, 510], [760, 520]].map(([x, y]) => <circle key={`${x}:${y}`} cx={x} cy={y} r="2.5" className={styles.farewellNode} />)}
    </svg>
    <motion.div className={styles.farewellMessage} initial={paused ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: paused ? 0 : 1.4, ease }}>
      <h2>Thank you<span>.</span></h2>
      <p>It was a pleasure meeting<br />and speaking with you all.</p>
      <div className={styles.farewellSignature}><Photo name="michael-cran-signature" alt="Michael D. Cran’s signature" contain /></div>
    </motion.div>
    <div className={styles.farewellPrepared}>
      <span>Prepared for</span>
      <div><Photo name="anywhere-company-logo" alt="The Anywhere Company" contain /></div>
    </div>
  </div>;
}

const afterHoursDomains = [
  { label: "Home", purpose: "Smarter systems.", Icon: House },
  { label: "Side projects", purpose: "Ideas made real.", Icon: Code2 },
  { label: "Business", purpose: "Work that matters.", Icon: BriefcaseBusiness },
];
const workdayDuration = 8400;

/** The accelerated clock keeps moving through the evening and into the next day. */
function WorkdayClock({ paused }: { paused: boolean }) {
  const face = useRef<HTMLDivElement>(null);
  const hour = useRef<SVGLineElement>(null);
  const minute = useRef<SVGLineElement>(null);
  const arc = useRef<SVGPathElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const elapsed = useRef(0);
  useEffect(() => {
    let frame = 0;
    let previous: number | null = null;
    const paint = (progress: number) => {
      hour.current?.setAttribute("transform", `rotate(${270 + 240 * progress} 60 60)`);
      minute.current?.setAttribute("transform", `rotate(${2880 * progress} 60 60)`);
      arc.current?.style.setProperty("stroke-dashoffset", String(1 - Math.min(1, progress)));
      if (face.current) face.current.dataset.clockState = progress >= 1 ? "after-hours" : "workday";
      const minutes = (9 * 60 + Math.floor(8 * 60 * progress / 15) * 15) % (24 * 60);
      const hours = Math.floor(minutes / 60);
      if (readout.current) readout.current.textContent = `${String(hours % 12 || 12).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
    };
    paint(elapsed.current / workdayDuration);
    if (paused) return;
    const tick = (now: number) => {
      if (document.hidden) { previous = null; return; }
      if (previous !== null) elapsed.current += now - previous;
      previous = now;
      paint(elapsed.current / workdayDuration);
      frame = requestAnimationFrame(tick);
    };
    const visibilityChange = () => {
      cancelAnimationFrame(frame);
      previous = null;
      if (!document.hidden) frame = requestAnimationFrame(tick);
    };
    if (!document.hidden) frame = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", visibilityChange);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("visibilitychange", visibilityChange); };
  }, [paused]);
  return <div ref={face} className={styles.workdayClock} data-clock-state="workday" role="img" aria-label="An accelerated clock keeps spinning past 5 PM and through the night.">
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="58" className={styles.clockOuterRing} />
      <circle cx="60" cy="60" r="58" pathLength="1" className={styles.clockContinuation} />
      <circle cx="60" cy="60" r="54" className={styles.clockRing} />
      <path ref={arc} d="M6 60 A54 54 0 1 1 87 106.765" pathLength="1" className={styles.clockWorkdayArc} />
      {Array.from({ length: 12 }, (_, index) => <line key={index} x1="60" y1="12" x2="60" y2={index % 3 === 0 ? 19 : 16} transform={`rotate(${index * 30} 60 60)`} className={styles.clockTick} />)}
      <g className={styles.clockNumerals}><text x="60" y="28">12</text><text x="94" y="61.5">3</text><text x="60" y="98">6</text><text x="26" y="61.5">9</text></g>
      <line ref={hour} x1="60" y1="60" x2="60" y2="33" transform="rotate(270 60 60)" className={styles.hourHand} />
      <line ref={minute} x1="60" y1="60" x2="60" y2="21" className={styles.minuteHand} /><circle cx="60" cy="60" r="3" fill="#dca39a" />
    </svg><span className={styles.clockReadout} ref={readout}>09:00 AM</span>
  </div>;
}

const services: { name: PresentationBrandName; label: string; detail: string; href: string }[] = [
  { name: "github", label: "GitHub", detail: "Issues & revisions", href: "https://github.com" },
  { name: "githubactions", label: "GitHub Actions", detail: "Checks & fixes", href: "https://github.com/features/actions" },
  { name: "vercel", label: "Vercel", detail: "Websites", href: "https://vercel.com" },
  { name: "railway", label: "Railway", detail: "Services", href: "https://railway.com" },
  { name: "resend", label: "Resend", detail: "Email", href: "https://resend.com" },
  { name: "supabase", label: "Supabase", detail: "Database & auth", href: "https://supabase.com" },
  { name: "twilio", label: "Twilio", detail: "Calls & messaging", href: "https://www.twilio.com" },
];

const serviceY = (index: number) => 24 + index * 52;
const workflowConnections = [
  { id: "channels-ai", d: "M220 180 H290", kind: "input", delay: 0 },
  { id: "ai-n8n", d: "M420 180 H500", kind: "input", delay: .15 },
  ...services.map((service, index) => ({ id: `n8n-${service.name}`, d: `M500 180 C635 180 635 ${serviceY(index)} 750 ${serviceY(index)}`, kind: "service", delay: .25 + index * .1 })),
  { id: "github-ai", d: "M750 24 C650 -42 355 -42 355 100", kind: "feedback", delay: .65 },
  { id: "twilio-ai", d: "M750 336 C670 410 440 410 440 280 V248 Q440 230 426 230 H420", kind: "feedback", delay: .85 },
];

function AutomationWorkflow({ paused }: { paused: boolean }) {
  const draw = { duration: paused ? 0 : 1.4, ease };
  return <div className={styles.workflow} data-motion={paused ? "paused" : "playing"} role="group" aria-label="Connected channels feed OpenAI and Anthropic, then n8n connects GitHub, GitHub Actions, Vercel, Railway, Resend, Supabase, and Twilio. GitHub issues and revisions return to AI for fixes and changes. Twilio connects back to the AI-powered stage for conversational AI.">
    <svg className={styles.workflowLines} viewBox="0 0 1000 360" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <marker id="workflow-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M1 1 7 4 1 7" fill="none" stroke="#9bb5c6" strokeWidth="1" /></marker>
        <marker id="workflow-feedback-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M1 1 7 4 1 7" fill="none" stroke="#e4afa4" strokeWidth="1" /></marker>
      </defs>
      {workflowConnections.map((wire, index) => <g key={wire.id} className={styles.workflowWire} data-wire={wire.id} data-kind={wire.kind}>
        <motion.path d={wire.d} className={styles.wireBase} initial={paused ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ ...draw, delay: paused ? 0 : wire.delay }} markerEnd={`url(#${wire.kind === "feedback" ? "workflow-feedback-arrow" : "workflow-arrow"})`} />
        <path d={wire.d} pathLength="1" className={styles.wireGlow} style={{ animationDelay: `${2.2 + index * .23}s` }} />
        <path d={wire.d} pathLength="1" className={styles.wireGlint} style={{ animationDelay: `${2.2 + index * .23}s` }} />
      </g>)}
    </svg>
    <div className={styles.workflowFeedbackLabel}>GitHub issues & revisions</div>
    <div className={styles.workflowConversationLabel}>Conversational AI</div>
    <div className={styles.workflowIntake}><MessagesSquare aria-hidden="true" /><span>Connected channels</span><strong>Bug fixes.<br />Change requests.</strong><small>Per project · per client</small></div>
    <div className={styles.workflowModels}><span>AI-powered</span><div><BrandMark name="openai" decorative /><small>OpenAI</small></div><div><BrandMark name="anthropic" decorative /><small>Anthropic</small></div><small className={styles.workflowModelAction}>AI fixes & changes</small></div>
    <span className={styles.workflowBridge}>MCPs & connectors</span>
    <div className={styles.workflowTargets}>{services.map((service, index) => <motion.a key={service.name} data-service={service.name} href={service.href} target="_blank" rel="noreferrer" style={{ top: `${serviceY(index) / 3.6}%`, y: "-50%" }} initial={paused ? false : { opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: paused ? 0 : .7, delay: paused ? 0 : .45 + index * .1, ease }}><BrandMark name={service.name} decorative /><span><strong>{service.label}</strong><small>{service.detail}</small></span></motion.a>)}</div>
    <div className={styles.workflowPurpose}>Provision accounts.<br />Build websites.<br />Automate the follow-through.</div>
  </div>;
}

export function AfterDark({ paused, step }: { paused: boolean; step: number }) {
  const workflow = step === 2;
  return <div className={styles.afterDark} data-after-dark-step={step} data-paused={paused}>
    <div className={styles.afterVideo}><Clip name="after-dark" alt="" paused={paused} /></div><div className={styles.afterShade} />
    <div className={styles.afterCoreLogo}><Photo name="core-logo-white" alt="CORE" contain /></div>
    <motion.header className={styles.afterHeader} initial={false} animate={{ top: workflow ? "3cqw" : "5cqw", width: workflow ? "90cqw" : "52cqw" }} transition={{ duration: paused ? 0 : 1.4, ease }}><span className={styles.eyebrow}>After hours / still building</span><motion.h2 initial={false} animate={{ fontSize: workflow ? "3.4cqw" : "6.3cqw" }} transition={{ duration: paused ? 0 : 1.4, ease }}>My brain never<br className={workflow ? styles.compactBreak : undefined} /> clocks out.</motion.h2></motion.header>
    <AnimatePresence initial={false}>
      <motion.div key={step} className={styles.afterBody} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: paused ? 0 : .55, ease }}>
        {step === 0 && <div className={styles.afterIntro}>
          <p>I live and breathe tech.</p>
          <ul className={styles.afterDomains} aria-label="Where I keep building">{afterHoursDomains.map(({ label, purpose, Icon }, index) => <motion.li key={label} initial={paused ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: paused ? 0 : .9, delay: paused ? 0 : .25 + index * .2, ease }}><div><Icon aria-hidden="true" /><strong>{label}</strong></div><span>{purpose}</span></motion.li>)}</ul>
          <p className={styles.afterDrive}>There’s always a way to make it better.</p>
        </div>}
        {step === 1 && <div className={styles.afterUsage}><strong><AnimatedNumber value={73.7} decimals={1} suffix="B+" paused={paused} /></strong><span>AI tokens used</span><p>Top-tier AI plans.<br />Still hitting the limits.</p><small>Connectors. MCPs. Automation.</small></div>}
        {workflow && <AutomationWorkflow paused={paused} />}
      </motion.div>
    </AnimatePresence>
    <motion.div className={`${styles.afterHub} ${workflow ? styles.workflowHub : ""}`} initial={false} animate={{ left: workflow ? "50%" : "75%", top: workflow ? "55%" : "49%", width: workflow ? "9cqw" : "24cqw", height: workflow ? "9cqw" : "24cqw" }} transition={{ duration: paused ? 0 : 1.5, ease }}>
      <AnimatePresence initial={false}>{step === 0 ? <motion.div key="clock" className={styles.hubFace} exit={{ opacity: 0 }} transition={{ duration: paused ? 0 : .55 }}><WorkdayClock paused={paused} /></motion.div> : <motion.div key="n8n" className={styles.hubFace} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: paused ? 0 : .75 }}><BrandMark name="n8n" decorative /><strong>n8n</strong>{!workflow && <small>Bring the pieces together.</small>}</motion.div>}</AnimatePresence>
    </motion.div>
    <div className={styles.afterFooter}><span>{String(step + 1).padStart(2, "0")} / 03</span></div>
  </div>;
}
