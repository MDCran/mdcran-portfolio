import { getBookingConfig, publicBookingConfig } from "@/lib/booking";

export const dynamic = "force-dynamic";

/* GET — public-safe booking config (meeting types, timezone, window). Never exposes the iCal URL. */
export async function GET() {
  const config = await getBookingConfig();
  return Response.json(publicBookingConfig(config));
}
