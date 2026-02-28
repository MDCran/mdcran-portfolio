import { NextRequest, NextResponse } from "next/server";
import { getRizzSubmissions, saveRizzSubmissions } from "@/lib/db";
import type {
  RizzActivity,
  RizzDateIdea,
  RizzSubmission,
  RizzVibe,
  RizzWinOver,
} from "@/lib/types";

const validDateIdeas: RizzDateIdea[] = [
  "fancy-dinner-date",
  "spontaneous-adventure",
  "food-and-walking",
  "coffee-and-talking",
  "surprise-me",
];

const validVibes: RizzVibe[] = [
  "chill-and-cozy",
  "fun-and-chaotic",
  "romantic-and-cute",
  "adventurous",
];

const validActivities: RizzActivity[] = [
  "ice-cream-date",
  "night-drive",
  "movie-night",
  "arcade",
  "disney-fireworks",
  "surprise-me",
];

const validWinOvers: RizzWinOver[] = [
  "food",
  "attention",
  "effort",
  "making-me-laugh",
  "being-sweet",
  "consistency",
  "touch",
  "other",
];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return value ? [value] : [];
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const submission: RizzSubmission = {
    id: uid(),
    name: String(body.name ?? "").trim(),
    nickname: String(body.nickname ?? "").trim(),
    phone: String(body.phone ?? "").trim(),
    dateIdeas: asArray<RizzDateIdea>(body.dateIdeas ?? body.dateIdea),
    vibes: asArray<RizzVibe>(body.vibes ?? body.vibe),
    activities: asArray<RizzActivity>(body.activities ?? body.activity),
    winOvers: asArray<RizzWinOver>(body.winOvers ?? body.winOver),
    winOverOther: String(body.winOverOther ?? "").trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  if (!submission.name || !submission.nickname || !submission.phone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (
    submission.dateIdeas.length === 0 ||
    submission.dateIdeas.some((dateIdea) => !validDateIdeas.includes(dateIdea))
  ) {
    return NextResponse.json({ error: "Invalid date idea" }, { status: 400 });
  }

  if (
    submission.vibes.length === 0 ||
    submission.vibes.some((vibe) => !validVibes.includes(vibe))
  ) {
    return NextResponse.json({ error: "Invalid vibe" }, { status: 400 });
  }

  if (
    submission.activities.length === 0 ||
    submission.activities.some((activity) => !validActivities.includes(activity))
  ) {
    return NextResponse.json({ error: "Invalid activity" }, { status: 400 });
  }

  if (
    submission.winOvers.length === 0 ||
    submission.winOvers.some((winOver) => !validWinOvers.includes(winOver))
  ) {
    return NextResponse.json({ error: "Invalid win-over selection" }, { status: 400 });
  }

  if (submission.winOvers.includes("other") && !submission.winOverOther) {
    return NextResponse.json({ error: "Please describe the other answer" }, { status: 400 });
  }

  const existing = await getRizzSubmissions();
  await saveRizzSubmissions([submission, ...existing]);

  return NextResponse.json({ ok: true, id: submission.id });
}
