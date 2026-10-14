import { syncBusinessCalendars } from "@/lib/stays/ical-sync";

export const maxDuration = 60;

/** Daily safety net (vercel.json). Page views also sync calendars older than 10 minutes. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const results = await syncBusinessCalendars(null, 0);
  return Response.json({
    calendars: results.length,
    added: results.reduce((a, r) => a + r.added, 0),
    cancelled: results.reduce((a, r) => a + r.cancelled, 0),
    errors: results.filter((r) => r.error).length,
  });
}
