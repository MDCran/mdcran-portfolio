import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface ContribDay {
  date: string; // YYYY-MM-DD
  contributionCount: number;
  weekday: number; // 0 (Sun) .. 6 (Sat)
}

/* GET /api/github/contributions?year=2026 — GitHub contribution calendar for a year. */
export async function GET(req: NextRequest) {
  const token = process.env.GITHUB_TOKEN;
  const login = process.env.GITHUB_USERNAME || "mdcran";
  if (!token) {
    return Response.json({ error: "GitHub not configured" }, { status: 503 });
  }

  const now = new Date();
  const yearParam = req.nextUrl.searchParams.get("year");
  const year = yearParam && /^\d{4}$/.test(yearParam) ? parseInt(yearParam, 10) : now.getUTCFullYear();

  const from = `${year}-01-01T00:00:00Z`;
  // Don't request a window past "now" for the current year — GitHub returns empty future days anyway,
  // but clamping keeps the grid aligned to today.
  const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
  const to = (year === now.getUTCFullYear() ? now : endOfYear).toISOString();

  const query = `query($login:String!,$from:DateTime!,$to:DateTime!){
    user(login:$login){
      contributionsCollection(from:$from,to:$to){
        contributionCalendar{
          totalContributions
          weeks{ contributionDays{ date contributionCount weekday } }
        }
      }
    }
  }`;

  try {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "mdcran-portfolio",
      },
      body: JSON.stringify({ query, variables: { login, from, to } }),
      // keep it fresh
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("GitHub GraphQL error:", res.status, txt);
      return Response.json({ error: "GitHub request failed" }, { status: 502 });
    }

    const json = await res.json();
    const cal = json?.data?.user?.contributionsCollection?.contributionCalendar;
    if (!cal) {
      console.error("GitHub GraphQL malformed:", JSON.stringify(json).slice(0, 300));
      return Response.json({ error: "No contribution data" }, { status: 502 });
    }

    const weeks: ContribDay[][] = (cal.weeks ?? []).map((w: { contributionDays: ContribDay[] }) =>
      w.contributionDays.map((d) => ({
        date: d.date,
        contributionCount: d.contributionCount,
        weekday: d.weekday,
      }))
    );

    return Response.json({
      year,
      total: cal.totalContributions ?? 0,
      weeks,
    });
  } catch (err) {
    console.error("GitHub contributions error:", err);
    return Response.json({ error: "GitHub request failed" }, { status: 502 });
  }
}
