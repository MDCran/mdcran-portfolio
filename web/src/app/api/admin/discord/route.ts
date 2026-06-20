import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDiscordConfig, saveDiscordConfig, sendTestEmbed } from "@/lib/discord";
import type { DiscordChannelMap } from "@/lib/discord";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const config = await getDiscordConfig();
  const tokenConfigured = Boolean(process.env.DISCORD_BOT_TOKEN);
  return NextResponse.json({ config, tokenConfigured });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as {
    enabled?: boolean;
    guildId?: string;
    channels?: Partial<DiscordChannelMap>;
  } | null;

  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const updated = await saveDiscordConfig({
    enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
    guildId: typeof body.guildId === "string" ? body.guildId : undefined,
    channels: body.channels ?? undefined,
  });

  return NextResponse.json({ config: updated });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "test") {
    const channel = searchParams.get("channel") as keyof DiscordChannelMap | null;
    const validChannels: (keyof DiscordChannelMap)[] = ["forms", "bookings", "newsletter", "identities", "analytics"];
    if (!channel || !validChannels.includes(channel)) {
      return NextResponse.json({ error: "Invalid channel key" }, { status: 400 });
    }
    const result = await sendTestEmbed(channel);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
