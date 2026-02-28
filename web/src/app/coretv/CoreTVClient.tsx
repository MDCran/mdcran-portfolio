"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import Link from "next/link";

/* ─── Animated Counter ───────────────────────────────────── */
function AnimatedCounter({
  target,
  suffix = "",
  prefix = "",
  duration = 2000,
}: {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
      else setCount(target);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

/* ─── Particle Field ─────────────────────────────────────── */
function ParticleField() {
  const particles = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    duration: Math.random() * 8 + 5,
    delay: Math.random() * 5,
    opacity: Math.random() * 0.4 + 0.1,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-[#ef4242]"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [p.opacity, p.opacity * 2, p.opacity],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Corner Brackets ────────────────────────────────────── */
function CornerBrackets({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {/* Top-left */}
      <div className="absolute top-0 left-0 w-8 h-8">
        <div className="absolute top-0 left-0 w-full h-px bg-[#ef4242]" />
        <div className="absolute top-0 left-0 h-full w-px bg-[#ef4242]" />
      </div>
      {/* Top-right */}
      <div className="absolute top-0 right-0 w-8 h-8">
        <div className="absolute top-0 right-0 w-full h-px bg-[#ef4242]" />
        <div className="absolute top-0 right-0 h-full w-px bg-[#ef4242]" />
      </div>
      {/* Bottom-left */}
      <div className="absolute bottom-0 left-0 w-8 h-8">
        <div className="absolute bottom-0 left-0 w-full h-px bg-[#ef4242]" />
        <div className="absolute bottom-0 left-0 h-full w-px bg-[#ef4242]" />
      </div>
      {/* Bottom-right */}
      <div className="absolute bottom-0 right-0 w-8 h-8">
        <div className="absolute bottom-0 right-0 w-full h-px bg-[#ef4242]" />
        <div className="absolute bottom-0 right-0 h-full w-px bg-[#ef4242]" />
      </div>
    </div>
  );
}

/* ─── Glow Button ────────────────────────────────────────── */
function GlowButton({
  href,
  children,
  variant = "primary",
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "outline";
  external?: boolean;
}) {
  const Tag = external ? "a" : Link;
  const extraProps = external ? { href, target: "_blank", rel: "noopener noreferrer" } : { href };

  if (variant === "outline") {
    return (
      <Tag
        {...(extraProps as any)}
        className="relative group inline-flex items-center px-8 py-3 border border-[#ef4242]/50 text-[#ef4242] font-nord tracking-wider text-sm uppercase rounded-sm hover:border-[#ef4242] hover:bg-[#ef4242]/8 transition-all duration-300"
      >
        {children}
      </Tag>
    );
  }

  return (
    <div className="relative group inline-flex">
      <div className="absolute -inset-1 rounded-sm bg-[#ef4242] opacity-30 blur-md group-hover:opacity-60 transition-opacity duration-500" />
      <Tag
        {...(extraProps as any)}
        className="relative px-8 py-3 bg-[#ef4242] text-white font-nord tracking-wider text-sm uppercase rounded-sm hover:bg-[#dd3030] transition-colors shadow-[0_0_30px_rgba(239,66,66,0.4)] inline-flex items-center"
      >
        {children}
      </Tag>
    </div>
  );
}

/* ─── Feature Card ───────────────────────────────────────── */
function FeatureCard({
  icon,
  title,
  description,
  index,
}: {
  icon: string;
  title: string;
  description: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group relative rounded-sm border border-white/8 bg-white/3 backdrop-blur-xl p-6 hover:border-[#ef4242]/30 hover:bg-white/5 transition-all duration-300"
    >
      <div className="absolute inset-0 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-[#ef4242]/5 to-transparent pointer-events-none" />
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="font-nord text-base tracking-wider text-white mb-2">{title}</h3>
      <p className="text-xs text-white/50 leading-relaxed">{description}</p>
    </motion.div>
  );
}

/* ─── Stat Card ──────────────────────────────────────────── */
function StatCard({
  value,
  suffix,
  prefix,
  label,
  index,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative rounded-sm border border-white/8 bg-white/3 backdrop-blur-xl p-8 text-center group hover:border-[#ef4242]/30 transition-all duration-300"
    >
      <CornerBrackets />
      <div className="font-nord text-4xl md:text-5xl text-[#ef4242] text-glow mb-3">
        <AnimatedCounter target={value} suffix={suffix} prefix={prefix} />
      </div>
      <div className="text-xs text-white/50 tracking-widest uppercase">{label}</div>
    </motion.div>
  );
}

/* ─── Partners Marquee ───────────────────────────────────── */
const PARTNERS = [
  "PopularMMOs", "JenGaming", "MrBeast", "Preston", "Ssundee",
  "CaptainSparklez", "Stampy", "DanTDM", "Graser10", "BajanCanadian",
  "Huahwi", "Skybounds", "HyPixel Studios", "BlockWorks", "Noxcrew",
];

function PartnersMarquee() {
  const doubled = [...PARTNERS, ...PARTNERS];
  return (
    <div className="relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
      <div
        className="flex gap-16 whitespace-nowrap"
        style={{ animation: "marquee 35s linear infinite" }}
      >
        {doubled.map((name, i) => (
          <div
            key={i}
            className="inline-flex items-center gap-3 text-white/30 hover:text-[#ef4242] transition-colors duration-300 text-sm tracking-wider cursor-default"
          >
            <span className="text-[#ef4242]/40 text-xs">◆</span>
            <span className="font-nord">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function CoreTVClient() {
  const features = [
    {
      icon: "🤝",
      title: "Creator Partnerships",
      description:
        "We connect top-tier Minecraft creators with brands and opportunities that amplify their reach. Vetted partnerships, premium deals, real results.",
    },
    {
      icon: "🎮",
      title: "Community Events",
      description:
        "High-production Minecraft events with thousands of live participants. From battle royales to build challenges — we run the spectacle.",
    },
    {
      icon: "🎬",
      title: "Content Production",
      description:
        "Full-stack content creation: map design, thumbnail art, video production, and post-processing. We deliver broadcast-quality output.",
    },
    {
      icon: "💼",
      title: "Brand Deals",
      description:
        "Negotiating and executing brand integrations within Minecraft content at scale. Authentic placements, measurable ROI for partners.",
    },
    {
      icon: "📈",
      title: "Network Growth",
      description:
        "Data-driven growth strategy for creators inside our network. Analytics, A/B testing, audience insights, and algorithmic optimization.",
    },
    {
      icon: "🔐",
      title: "Exclusive Access",
      description:
        "Network members gain access to private lobbies, internal tooling, priority event slots, and direct lines to brand partners.",
    },
  ];

  const stats = [
    { value: 500, suffix: "K+", label: "Community Members" },
    { value: 50, suffix: "+", label: "Creator Partners" },
    { value: 5, suffix: "+", label: "Years Active" },
    { value: 10, suffix: "M+", label: "Event Participants" },
  ];

  const investorPoints = [
    {
      title: "Proven Track Record",
      body: "5+ years of operating successful Minecraft events and creator partnerships with measurable audience outcomes.",
    },
    {
      title: "Untapped Market",
      body: "The Minecraft creator economy continues to grow with new generations. CoreTV sits at the premium tier of this expanding market.",
    },
    {
      title: "Diversified Revenue",
      body: "Revenue streams across brand deals, event sponsorships, content licensing, and network membership fees.",
    },
    {
      title: "Strategic Relationships",
      body: "Established relationships with top-100 Minecraft creators, major gaming brands, and platform-level contacts.",
    },
  ];

  return (
    <main className="relative z-1 overflow-x-hidden">

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#ef4242] opacity-5 rounded-full blur-[120px]" />
          <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-[#ef4242] opacity-3 rounded-full blur-[80px]" />
        </div>

        <ParticleField />

        {/* Horizontal scan lines */}
        <div className="absolute inset-0 pointer-events-none opacity-3"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(239,66,66,0.03) 3px, rgba(239,66,66,0.03) 4px)",
          }}
        />

        <div className="relative z-10 text-center content-container pt-32 pb-20">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-3 mb-8"
          >
            <div className="h-px w-12 bg-[#ef4242]/60" />
            <span className="text-[10px] tracking-[0.35em] uppercase text-[#ef4242] font-nord">
              Investor Overview · 2024
            </span>
            <div className="h-px w-12 bg-[#ef4242]/60" />
          </motion.div>

          {/* Main title */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1
              className="font-nord text-[clamp(3.5rem,12vw,9rem)] leading-none tracking-wider text-white uppercase mb-2"
              style={{
                textShadow: "0 0 40px rgba(239,66,66,0.5), 0 0 80px rgba(239,66,66,0.2)",
              }}
            >
              CORETV
            </h1>
            <h1
              className="font-nord text-[clamp(1.5rem,5vw,3.5rem)] leading-none tracking-[0.4em] text-[#ef4242] uppercase mb-8"
              style={{
                textShadow: "0 0 30px rgba(239,66,66,0.6)",
              }}
            >
              NETWORKS
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-base md:text-lg text-white/50 tracking-wider max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            The Future of Minecraft Content.
            <span className="text-white/30"> Creator partnerships, community events, and brand experiences at an unprecedented scale.</span>
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <GlowButton href="/contact">
              Join the Network
            </GlowButton>
            <GlowButton href="#investor" variant="outline">
              Investor Overview
            </GlowButton>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <span className="text-[9px] tracking-[0.3em] uppercase text-white/25">Scroll</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-px h-12 bg-gradient-to-b from-[#ef4242]/60 to-transparent"
            />
          </motion.div>
        </div>
      </section>

      {/* ── ABOUT ──────────────────────────────────────────── */}
      <section className="py-32">
        <div className="content-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Text */}
            <motion.div
              initial={{ opacity: 0, x: -32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px w-8 bg-[#ef4242]" />
                <span className="text-[10px] tracking-[0.3em] uppercase text-[#ef4242]">About</span>
              </div>
              <h2 className="font-nord text-4xl md:text-5xl text-white tracking-wider mb-6 leading-tight">
                What Is<br />
                <span className="text-[#ef4242]">CoreTV Networks?</span>
              </h2>
              <p className="text-sm text-white/50 leading-relaxed mb-5">
                CoreTV Networks is a premium Minecraft content organization operating at the intersection
                of gaming, media, and community. Founded to bridge the gap between independent Minecraft
                creators and the brands, audiences, and opportunities that can take them to the next level.
              </p>
              <p className="text-sm text-white/50 leading-relaxed mb-5">
                We produce large-scale community events, negotiate and manage creator-brand partnerships,
                and deliver high-quality content production services for the gaming vertical. Our network
                spans hundreds of thousands of engaged community members across multiple platforms.
              </p>
              <p className="text-sm text-white/50 leading-relaxed">
                CoreTV is not just a content studio — it&apos;s an infrastructure layer for the Minecraft
                creator economy. We exist to make creators more powerful and brands more relevant.
              </p>
            </motion.div>

            {/* Visual block */}
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-sm border border-white/8 bg-white/3 backdrop-blur-xl p-10">
                <CornerBrackets />
                <div className="space-y-6">
                  {[
                    { label: "Founded", value: "2019" },
                    { label: "Category", value: "Gaming / Content Network" },
                    { label: "Focus", value: "Minecraft Creator Economy" },
                    { label: "Status", value: "Active & Expanding" },
                    { label: "Reach", value: "500K+ Community Members" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0 last:pb-0">
                      <span className="text-[10px] tracking-widest uppercase text-white/30">{row.label}</span>
                      <span className="text-sm text-white font-nord tracking-wider">{row.value}</span>
                    </div>
                  ))}
                </div>
                {/* Glow */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#ef4242] opacity-5 rounded-full blur-[60px] pointer-events-none" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────── */}
      <section className="py-24 border-y border-white/5">
        <div className="content-container">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0 }}
            className="text-center mb-16"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px w-8 bg-[#ef4242]" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-[#ef4242]">By the Numbers</span>
              <div className="h-px w-8 bg-[#ef4242]" />
            </div>
            <h2 className="font-nord text-3xl md:text-4xl text-white tracking-wider">
              The Scale of CoreTV
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <StatCard key={stat.label} {...stat} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────── */}
      <section className="py-32">
        <div className="content-container">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0 }}
            className="text-center mb-16"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px w-8 bg-[#ef4242]" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-[#ef4242]">What We Offer</span>
              <div className="h-px w-8 bg-[#ef4242]" />
            </div>
            <h2 className="font-nord text-3xl md:text-4xl text-white tracking-wider mb-4">
              Network Capabilities
            </h2>
            <p className="text-sm text-white/40 max-w-xl mx-auto">
              Everything a Minecraft creator or brand partner needs to succeed in the modern content landscape.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <FeatureCard key={feature.title} {...feature} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── INVESTOR SECTION ───────────────────────────────── */}
      <section id="investor" className="py-32 border-t border-white/5">
        <div className="content-container">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0 }}
            className="text-center mb-16"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px w-8 bg-[#ef4242]" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-[#ef4242]">Investor Relations</span>
              <div className="h-px w-8 bg-[#ef4242]" />
            </div>
            <h2 className="font-nord text-3xl md:text-4xl text-white tracking-wider mb-4">
              Why Invest in CoreTV?
            </h2>
            <p className="text-sm text-white/40 max-w-2xl mx-auto">
              The Minecraft creator economy is a multi-billion dollar market with sustained growth
              and deeply loyal audiences. CoreTV is positioned at its premium tier.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {investorPoints.map((point, i) => (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative rounded-sm border border-white/8 bg-white/3 backdrop-blur-xl p-8 group hover:border-[#ef4242]/30 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="w-1 h-full min-h-[60px] bg-[#ef4242] rounded-full opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                  <div>
                    <h3 className="font-nord text-lg text-white tracking-wider mb-3">{point.title}</h3>
                    <p className="text-xs text-white/50 leading-relaxed">{point.body}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Revenue breakdown visual */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0 }}
            transition={{ duration: 0.6 }}
            className="rounded-sm border border-white/8 bg-white/3 backdrop-blur-xl p-10"
          >
            <h3 className="font-nord text-xl text-white tracking-wider mb-8 text-center">Revenue Diversification</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { stream: "Brand Deals", pct: 42 },
                { stream: "Event Sponsorships", pct: 28 },
                { stream: "Content Licensing", pct: 18 },
                { stream: "Network Membership", pct: 12 },
              ].map((item, i) => (
                <div key={item.stream} className="text-center">
                  <div className="relative h-2 bg-white/8 rounded-full mb-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${item.pct}%` }}
                      viewport={{ once: true, amount: 0 }}
                      transition={{ duration: 1, delay: i * 0.15, ease: "easeOut" }}
                      className="absolute left-0 top-0 h-full bg-[#ef4242] rounded-full"
                    />
                  </div>
                  <div className="font-nord text-2xl text-[#ef4242] mb-1">{item.pct}%</div>
                  <div className="text-[10px] text-white/40 tracking-wide">{item.stream}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── PARTNERS STRIP ─────────────────────────────────── */}
      <section className="py-20 border-y border-white/5">
        <div className="content-container mb-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px w-8 bg-[#ef4242]" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-[#ef4242]">Creator Partners</span>
              <div className="h-px w-8 bg-[#ef4242]" />
            </div>
            <h2 className="font-nord text-2xl text-white/80 tracking-wider">
              Trusted By Top Creators
            </h2>
          </motion.div>
        </div>
        <PartnersMarquee />
      </section>

      {/* ── TIMELINE ───────────────────────────────────────── */}
      <section className="py-32">
        <div className="content-container max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0 }}
            className="text-center mb-16"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px w-8 bg-[#ef4242]" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-[#ef4242]">History</span>
              <div className="h-px w-8 bg-[#ef4242]" />
            </div>
            <h2 className="font-nord text-3xl text-white tracking-wider">Network Milestones</h2>
          </motion.div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-[#ef4242]/20 -translate-x-1/2" />

            {[
              { year: "2019", title: "CoreTV Founded", desc: "Network established with 3 creator partners and the first Snow Brawl event." },
              { year: "2020", title: "First Major Event", desc: "Lucky Block Bed Wars reached 50K+ concurrent viewers. Brand partnership with gaming peripherals company secured." },
              { year: "2021", title: "Network Expansion", desc: "Creator roster grew to 25+ partners. Digital Good Times events launched. 200K community members milestone reached." },
              { year: "2022", title: "Premium Tier Launch", desc: "Exclusive membership tier launched. Snow Brawl 2022 drew record participation. First content licensing deal closed." },
              { year: "2024", title: "Scale & Investment", desc: "500K+ community members. Seeking strategic investment to accelerate network growth and international expansion." },
            ].map((event, i) => (
              <motion.div
                key={event.year}
                initial={{ opacity: 0, x: i % 2 === 0 ? -24 : 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative flex items-start gap-8 mb-12 ${
                  i % 2 === 0
                    ? "md:flex-row"
                    : "md:flex-row-reverse"
                } flex-row`}
              >
                {/* Dot */}
                <div className="absolute left-4 md:left-1/2 w-3 h-3 bg-[#ef4242] rounded-full -translate-x-1/2 mt-1.5 shadow-[0_0_12px_rgba(239,66,66,0.8)]" />

                {/* Content */}
                <div className={`ml-12 md:ml-0 md:w-[calc(50%-2rem)] ${i % 2 === 0 ? "md:pr-8 md:text-right" : "md:pl-8"}`}>
                  <div className="font-nord text-[#ef4242] text-sm tracking-widest mb-1">{event.year}</div>
                  <h3 className="font-nord text-base text-white tracking-wider mb-2">{event.title}</h3>
                  <p className="text-xs text-white/40 leading-relaxed">{event.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="py-32">
        <div className="content-container max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0 }}
            transition={{ duration: 0.7 }}
            className="relative rounded-sm border border-[#ef4242]/20 bg-white/2 backdrop-blur-xl p-16 text-center overflow-hidden"
          >
            <CornerBrackets />

            {/* Background glow */}
            <div className="absolute inset-0 bg-[#ef4242] opacity-3 blur-[80px] pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ef4242]/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ef4242]/60 to-transparent" />

            <div className="relative z-10">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="h-px w-8 bg-[#ef4242]" />
                <span className="text-[10px] tracking-[0.3em] uppercase text-[#ef4242]">Ready to Join?</span>
                <div className="h-px w-8 bg-[#ef4242]" />
              </div>

              <h2 className="font-nord text-4xl md:text-5xl text-white tracking-wider mb-6">
                Apply to the<br />
                <span className="text-[#ef4242]">CoreTV Network</span>
              </h2>

              <p className="text-sm text-white/50 leading-relaxed max-w-xl mx-auto mb-10">
                Whether you&apos;re a creator looking for partnerships, a brand seeking gaming audiences,
                or an investor interested in the future of Minecraft content — we want to hear from you.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <GlowButton href="/contact">
                  Get in Touch
                </GlowButton>
                <GlowButton href="mailto:contact@mdcran.com" variant="outline" external>
                  Email Directly
                </GlowButton>
              </div>

              <p className="mt-8 text-[10px] text-white/20 tracking-wider">
                All inquiries reviewed within 48 hours · contact@mdcran.com
              </p>
            </div>
          </motion.div>
        </div>
      </section>

    </main>
  );
}
