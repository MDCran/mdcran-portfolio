import { NextRequest } from "next/server";
import { CHAT_RECORDINGS } from "@/lib/chat-recordings";

/** Compatibility URL for older clients; playback never synthesizes new audio. */
export async function GET(req: NextRequest): Promise<Response> {
  return Response.redirect(new URL(CHAT_RECORDINGS.farewell.href, req.url), 307);
}
