import { NextResponse } from "next/server";
import {
  getClients,
  getProjects,
  refreshClientSocialMetricsIfStale,
  refreshProjectVideoViewsIfStale,
} from "@/lib/db";

export async function GET() {
  await Promise.all([
    refreshClientSocialMetricsIfStale(),
    refreshProjectVideoViewsIfStale(),
  ]);
  const [clients, projects] = await Promise.all([getClients(), getProjects()]);
  const clientResults = clients.map((client) => ({
    id: client.id,
    totalFollowers: client.followerCount ?? 0,
    totalViews: client.viewCount ?? 0,
  }));

  const totalFollowers = clientResults.reduce((sum, client) => sum + client.totalFollowers, 0);
  const clientMetrics = Object.fromEntries(
    clientResults.map((client) => [
      client.id,
      { totalFollowers: client.totalFollowers, totalViews: client.totalViews },
    ])
  );

  const totalProjectViews = projects.reduce(
    (sum, project) =>
      sum +
      (project.videos?.reduce((videoSum, video) => videoSum + (video.viewCount ?? 0), 0) ?? 0),
    0
  );

  return NextResponse.json({
    totalFollowers,
    totalProjectViews,
    totalClients: clients.length,
    totalProjects: projects.length,
    yearsActive: new Date().getFullYear() - 2018,
    clientMetrics,
    lastUpdated: new Date().toISOString(),
    configured: totalFollowers > 0 || totalProjectViews > 0,
  });
}
