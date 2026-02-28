"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Gamepad2, Palette, Code2, ArrowRight } from "lucide-react";

const services = [
  {
    icon: Gamepad2,
    title: "Arts & Entertainment",
    description:
      "Custom Minecraft maps and immersive events for the world's biggest gaming creators.",
    href: "/arts-and-entertainment",
    items: ["Minecraft Maps", "Events"],
    accent: "#ef4242",
  },
  {
    icon: Palette,
    title: "Motion & Graphics",
    description:
      "High-impact thumbnail design, cinematic video editing, and full web design services.",
    href: "/motion-and-graphics",
    items: ["Thumbnails", "Video Editing", "Web Design"],
    accent: "#ef4242",
  },
  {
    icon: Code2,
    title: "Code",
    description:
      "Software and plugin development — from Minecraft server plugins to full-stack web applications and internal tools.",
    href: "/code",
    items: ["Minecraft Plugins", "Web Apps", "Internal Tools"],
    accent: "#ef4242",
  },
];

export default function Services() {
  return (
    <section className="py-24">
      <div className="content-container">
        {/* Header */}
        <div className="flex items-start justify-between mb-14 flex-wrap gap-4">
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="h-px w-8 bg-[#ef4242]" />
              <span className="text-[#ef4242] text-[11px] tracking-[0.25em] uppercase">What I do</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0 }}
              transition={{ delay: 0.1 }}
              className="font-nord text-3xl md:text-4xl text-white tracking-wider"
            >
              Services
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-md text-sm text-white/40 leading-relaxed"
          >
            Full-spectrum content creation, from interactive Minecraft experiences to polished
            motion graphics — all under one roof.
          </motion.p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {services.map((service, i) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="h-full"
              >
                <Link href={service.href} className="group block h-full">
                  <div className="relative flex h-full flex-col p-7 rounded-sm border border-white/7 bg-white/2 overflow-hidden transition-all duration-300 hover:border-[rgba(239,66,66,0.25)] hover:bg-white/4 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(239,66,66,0.08)]">
                    {/* Hover glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[rgba(239,66,66,0.04)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Icon */}
                    <div className="relative w-10 h-10 rounded-sm bg-[rgba(239,66,66,0.08)] border border-[rgba(239,66,66,0.15)] flex items-center justify-center mb-4 group-hover:bg-[rgba(239,66,66,0.15)] transition-colors duration-300">
                      <Icon size={18} className="text-[#ef4242]" />
                    </div>

                    {/* Title */}
                    <h3 className="font-nord text-lg tracking-wide text-white mb-2 group-hover:text-[#ef4242] transition-colors duration-200">
                      {service.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-white/40 leading-relaxed mb-5">
                      {service.description}
                    </p>

                    {/* Items */}
                    <div className="mt-auto flex flex-wrap gap-2">
                      {service.items.map((item) => (
                        <span
                          key={item}
                          className="text-[10px] px-3 py-1.5 rounded-sm border border-white/8 text-white/35 tracking-wider"
                        >
                          {item}
                        </span>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="pointer-events-none absolute bottom-7 right-7 flex items-center gap-2 text-[#ef4242] text-xs tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span>Explore</span>
                      <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform duration-200" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
