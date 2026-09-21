import { NextRequest, NextResponse } from "next/server";
import { createRizzSubmission, getSiteContent } from "@/lib/db";
import { clientIp } from "@/lib/api-rate-limit";
import { findIdentityBySerial } from "@/lib/identity";
import { answerKeys, getOptions, getRizzConfig, parseRizzAnswers, validateRizzAnswers } from "@/lib/rizz";
import type { RizzSubmission } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const content = await getSiteContent();
    if (!content.rizzEnabled) return NextResponse.json({ error: "This invitation is currently closed." }, { status: 404 });
    const body = await req.json().catch(() => null);
    const answers = parseRizzAnswers(body);
    if (!answers) return NextResponse.json({ error: "Invalid answers. Please check your entries." }, { status: 400 });
    const config = getRizzConfig(content);
    const error = validateRizzAnswers(answers, config);
    if (error) return NextResponse.json({ error }, { status: 400 });
    const serial = typeof body.serial === "string" ? body.serial.slice(0, 64) : "";
    const identityId = serial ? await findIdentityBySerial(serial).then(identity => identity?.id ?? null).catch(() => null) : null;
    const submission: RizzSubmission = {
      ...answers,
      dateIdeas: answers.dateIdeas as RizzSubmission["dateIdeas"],
      vibes: answers.vibes as RizzSubmission["vibes"],
      activities: answers.activities as RizzSubmission["activities"],
      winOvers: answers.winOvers as RizzSubmission["winOvers"],
      id: crypto.randomUUID(), createdAt: new Date().toISOString(),
      theme: config.theme, setting: config.setting,
      optionLabels: Object.fromEntries(answerKeys.flatMap(key => getOptions(key, config)
        .filter(option => answers[key].includes(option.value))
        .map(option => [`${key}:${option.value}`, option.label]))),
      winOverOther: answers.customAnswers.winOvers || undefined,
      serial: serial || undefined, ip: clientIp(req), identityId,
    };
    await createRizzSubmission(submission);
    return NextResponse.json({ ok: true, id: submission.id });
  } catch {
    return NextResponse.json({ error: "Couldn't save your plan right now. Your answers are still here—please try again." }, { status: 503 });
  }
}
