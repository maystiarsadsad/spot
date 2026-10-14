/**
 * Minimal iCalendar (RFC 5545) support for channel sync with Airbnb and
 * Booking.com: they only exchange all-day busy ranges (DTSTART/DTEND dates).
 * Pure functions, no I/O.
 */

export interface IcsEvent {
  uid: string;
  /** "YYYY-MM-DD", first night */
  start: string;
  /** "YYYY-MM-DD", check-out day (exclusive) */
  end: string;
  summary: string;
}

/** Lines starting with a space or tab continue the previous one. */
function unfold(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

/** DTSTART;VALUE=DATE:20261224 or DTSTART:20261224T150000Z → "2026-12-24" */
function toDate(value: string) {
  const m = value.trim().match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

const unescapeText = (s: string) => s.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();

export function parseIcs(text: string): IcsEvent[] {
  const events: IcsEvent[] = [];
  let current: Partial<IcsEvent> | null = null;
  for (const line of unfold(text)) {
    if (line === "BEGIN:VEVENT") current = {};
    else if (line === "END:VEVENT") {
      if (current?.start) {
        const start = current.start;
        // All-day event without DTEND lasts one night
        const end = current.end && current.end > start ? current.end : nextDay(start);
        events.push({ uid: current.uid || `${start}_${end}`, start, end, summary: current.summary ?? "" });
      }
      current = null;
    } else if (current) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const name = line.slice(0, idx).split(";")[0].toUpperCase();
      const value = line.slice(idx + 1);
      if (name === "UID") current.uid = value.trim();
      else if (name === "DTSTART") current.start = toDate(value) ?? undefined;
      else if (name === "DTEND") current.end = toDate(value) ?? undefined;
      else if (name === "SUMMARY") current.summary = unescapeText(value);
    }
  }
  return events;
}

function nextDay(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const escapeText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const compact = (date: string) => date.replace(/-/g, "");

/** Calendar with one all-day event per busy range (no guest data is exported). */
export function buildIcs(opts: { name: string; events: { uid: string; start: string; end: string; summary?: string }[]; now?: Date }) {
  const stamp = (opts.now ?? new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Spot//Estadias//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(opts.name)}`,
    ...opts.events.flatMap((e) => [
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(e.start)}`,
      `DTEND;VALUE=DATE:${compact(e.end)}`,
      `SUMMARY:${escapeText(e.summary ?? "Ocupado")}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

/** Guess the channel from the feed URL. */
export function channelFromUrl(url: string): "airbnb" | "booking" | "other" {
  if (/airbnb\./i.test(url)) return "airbnb";
  if (/booking\.com/i.test(url)) return "booking";
  return "other";
}

export const CHANNEL_LABELS: Record<string, string> = { airbnb: "Airbnb", booking: "Booking.com", other: "Otro canal" };

/**
 * Only public https feeds: the server downloads these URLs, so internal hosts
 * (localhost, private networks, cloud metadata) are rejected.
 */
export function isSafeFeedUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  if (url.port && url.port !== "443") return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host.includes(".") || host.endsWith(".local") || host.endsWith(".internal") || host === "localhost") return false;
  const v4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)) return false;
  }
  if (host.includes(":")) return false; // literal IPv6
  return true;
}
