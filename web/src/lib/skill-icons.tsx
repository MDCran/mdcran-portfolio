import {
  Code2, Palette, Globe, Sparkles, Users, Database, Server, Terminal, Cloud,
  Cpu, Smartphone, Monitor, Layers, GitBranch, Boxes, Braces, FileCode,
  Figma, PenTool, Image as ImageIcon, Video, Music, Camera, Film, Wand2,
  Brush, Type, Layout, Component, Workflow, Gauge, ShieldCheck, Lock,
  Network, Wifi, HardDrive, Bot, Brain, MessageSquare, Mic, LineChart,
  BarChart3, Rocket, Wrench, Settings, Zap, Star, Award, BookOpen,
  GraduationCap, Briefcase, Heart, Gamepad2, Box, Pencil, type LucideIcon,
} from "lucide-react";

/**
 * Curated icon registry shared by the admin skill/category icon picker and the
 * public resume page. Kept intentionally small (no full lucide import) so the
 * bundle stays light. Keys are stable names persisted in the DB.
 */
export const SKILL_ICON_REGISTRY: Record<string, LucideIcon> = {
  Code2, Braces, FileCode, Terminal, Component, Layout, Layers, Boxes, Box,
  Database, Server, Cloud, Network, Wifi, HardDrive, Cpu, Monitor, Smartphone,
  GitBranch, Workflow, Wrench, Settings, Gauge, Zap, Rocket,
  Palette, PenTool, Brush, Pencil, Type, Figma, ImageIcon, Video, Film, Camera, Music, Wand2,
  Globe, Sparkles, Bot, Brain, MessageSquare, Mic,
  LineChart, BarChart3, ShieldCheck, Lock,
  Users, Star, Award, BookOpen, GraduationCap, Briefcase, Heart, Gamepad2,
};

/** Ordered list of icon names for the picker UI. */
export const SKILL_ICON_NAMES = Object.keys(SKILL_ICON_REGISTRY);

/** Resolve an icon name to a component, falling back to a sensible default. */
export function resolveSkillIcon(name?: string, fallback: LucideIcon = Code2): LucideIcon {
  if (name && SKILL_ICON_REGISTRY[name]) return SKILL_ICON_REGISTRY[name];
  return fallback;
}

export function SkillIcon({
  name,
  fallback,
  ...props
}: { name?: string; fallback?: LucideIcon } & React.ComponentProps<LucideIcon>) {
  const Icon = resolveSkillIcon(name, fallback);
  return <Icon {...props} />;
}
