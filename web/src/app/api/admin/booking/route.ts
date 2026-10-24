import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getBookingConfig, saveBookingConfig, getBookings } from "@/lib/booking";
import { adminError } from "@/lib/admin-content";
import { bookingConfig, readAdminObject } from "@/lib/admin-api-validation";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [config, bookings] = await Promise.all([getBookingConfig(), getBookings()]);
    return NextResponse.json({ config, bookings });
  } catch (error) { return adminError(error); }
}
export async function PUT(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const config = bookingConfig(await readAdminObject(req));
    await saveBookingConfig(config);
    return NextResponse.json({ ok: true, config });
  } catch (error) { return adminError(error); }
}
