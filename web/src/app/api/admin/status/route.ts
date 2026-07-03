import { NextRequest, NextResponse } from "next/server";
import {
  getStatusServices,
  getStatusIncidents,
  saveStatusService,
  deleteStatusService,
  saveStatusIncident,
  deleteStatusIncident,
} from "@/lib/db";
import type { StatusService, StatusIncident } from "@/lib/types";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [services, incidents] = await Promise.all([getStatusServices(), getStatusIncidents()]);
  return NextResponse.json({ services, incidents });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { type } = body;

  if (type === "service") {
    const service: StatusService = {
      id: body.id || `svc-${Date.now()}`,
      name: body.name,
      group: body.group,
      sortOrder: body.sortOrder ?? 99,
      pingUrl: body.pingUrl,
      createdAt: body.createdAt || new Date().toISOString(),
    };
    await saveStatusService(service);
    return NextResponse.json({ success: true, service });
  }

  if (type === "incident") {
    const incident: StatusIncident = {
      id: body.id || `inc-${Date.now()}`,
      serviceId: body.serviceId,
      title: body.title,
      message: body.message,
      severity: body.severity || "minor",
      status: body.status || "investigating",
      startedAt: body.startedAt || new Date().toISOString(),
      resolvedAt: body.resolvedAt,
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveStatusIncident(incident);
    return NextResponse.json({ success: true, incident });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { type } = body;

  if (type === "incident") {
    const incident: StatusIncident = {
      id: body.id,
      serviceId: body.serviceId,
      title: body.title,
      message: body.message,
      severity: body.severity,
      status: body.status,
      startedAt: body.startedAt,
      resolvedAt: body.resolvedAt,
      createdAt: body.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await saveStatusIncident(incident);
    return NextResponse.json({ success: true, incident });
  }

  if (type === "service") {
    await saveStatusService(body as StatusService);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  if (!id || !type) return NextResponse.json({ error: "Missing id or type" }, { status: 400 });

  if (type === "service") await deleteStatusService(id);
  else if (type === "incident") await deleteStatusIncident(id);
  else return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  return NextResponse.json({ success: true });
}
