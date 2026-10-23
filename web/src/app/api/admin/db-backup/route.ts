import { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { adminError } from "@/lib/admin-content";
import { AdminDataError } from "@/lib/content-validation";
import { executeRestore, exportBackup, prepareRestore } from "@/lib/admin-backup";
import { getDb } from "@/lib/mongodb";
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    if (req.nextUrl.searchParams.get("snapshots") === "true") return Response.json({ snapshots: await (await getDb()).collection("backupSnapshots").find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(50).toArray() }, { headers: { "Cache-Control": "no-store" } });
    const payload = await exportBackup(req.nextUrl.searchParams.get("snapshotId") ?? undefined);
    return new Response(JSON.stringify(payload, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="mdcran-backup-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "no-store" } });
  } catch (error) { return adminError(error); }
}
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (body.action === "dry-run") return Response.json(await prepareRestore(body.backup));
    if (body.action === "restore" && typeof body.planId === "string") return Response.json(await executeRestore(body.planId));
    throw new AdminDataError("Run a dry-run and confirm its planId before restoring", 409);
  } catch (error) { return adminError(error); }
}
