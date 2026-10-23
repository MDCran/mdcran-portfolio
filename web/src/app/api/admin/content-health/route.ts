import { isAdminAuthenticated } from "@/lib/auth";
import { inspectContentHealth, loadContentHealthData, publicHealthCheckUrls, type PublicLinkCheck } from "@/lib/content-health";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json(inspectContentHealth(await loadContentHealthData()), { headers }); }
  catch { return Response.json({ error: "Content checks could not load the saved records." }, { status: 503, headers }); }
}
export async function POST() {
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    // Request bodies are intentionally ignored: callers cannot supply URLs, hosts,
    // headers, methods, or redirects. Only existing public content is inspected.
    const urls = publicHealthCheckUrls(await loadContentHealthData());
    const results: PublicLinkCheck[] = [];
    for (let index = 0; index < urls.length; index += 3) {
      results.push(...await Promise.all(urls.slice(index, index + 3).map(async (url): Promise<PublicLinkCheck> => {
        try {
          const response = await fetch(url, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(4000), cache: "no-store", headers: { "User-Agent": "MDCran-Content-Health/1.0" } });
          return { url, status: response.status, state: response.ok ? "ok" : response.status >= 300 && response.status < 400 ? "redirect" : [404, 410].includes(response.status) ? "broken" : "unavailable", note: response.status === 405 ? "This host does not support HEAD checks." : undefined };
        } catch { return { url, state: "unavailable", note: "Timed out or the host could not be reached." }; }
      })));
    }
    return Response.json({ checkedAt: new Date().toISOString(), results, limit: 12, note: "Explicit check of up to 12 saved public URLs on approved hosts. Redirects are reported without following them; HEAD failures do not prove a page is broken." }, { headers });
  } catch { return Response.json({ error: "Live checks could not load the public link catalog." }, { status: 503, headers }); }
}
