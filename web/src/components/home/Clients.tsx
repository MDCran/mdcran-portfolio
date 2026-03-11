"use client";

import React from "react";
import { motion } from "framer-motion";
import ClientCard from "@/components/shared/ClientCard";
import type { Client, Project, SiteContentSectionIntro } from "@/lib/types";

interface ClientsProps {
  clients: Client[];
  projects?: Project[];
  content?: SiteContentSectionIntro;
}

export default function Clients({ clients, projects = [], content }: ClientsProps) {
  void projects;

  return (
    <section id="clients" className="py-28 border-t border-white/6">
      <div className="content-container">
        {/* Header */}
        <div className="mb-14">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0 }}
            className="flex items-center gap-3 mb-4"
          >
            <div className="h-px w-8 bg-[var(--cranberry)]" />
            <span className="text-[var(--cranberry)] text-[11px] tracking-[0.25em] uppercase">
              {content?.eyebrow ?? "Who I've worked with"}
            </span>
          </motion.div>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0 }}
              transition={{ delay: 0.1 }}
              className="font-nord text-3xl md:text-4xl text-white tracking-wider"
            >
              {content?.title ?? "Clients"}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0 }}
              transition={{ delay: 0.2 }}
              className="max-w-md text-sm text-white/40 leading-relaxed"
            >
              {content?.description ??
                "Collaborating with top content creators, companies, and production teams to deliver premium-quality digital experiences."}
            </motion.p>
          </div>
        </div>

        {/* Marquee logos strip */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0 }}
          className="mb-12 overflow-hidden border border-white/6 rounded-sm py-4 bg-white/2"
        >
          <div className="flex animate-marquee whitespace-nowrap gap-12">
            {[...clients, ...clients].map((client, i) => (
              <span
                key={`${client.id}-${i}`}
                className="text-white/20 font-nord text-sm tracking-[0.25em] uppercase hover:text-white/60 transition-colors cursor-default shrink-0"
              >
                {client.name}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Client cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {clients.map((client, i) => (
            <ClientCard
              key={client.id}
              client={client}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
