import PongClient from "./PongClient";
import { buildSeoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return buildSeoMetadata({
    title: "2D Pong — Bar Edition",
    description: "Two-player phone Pong with hallucination modes. Hold the phone between you and tap to survive the chaos.",
    path: "/2d-pong",
  });
}

export default function Pong2DPage() {
  return <PongClient />;
}
