import { describe, expect, it } from "vitest";
import { buildIcs, channelFromUrl, parseIcs } from "./ical";

const AIRBNB = [
  "BEGIN:VCALENDAR",
  "PRODID:-//Airbnb Inc//Hosting Calendar 1.0//EN",
  "BEGIN:VEVENT",
  "DTEND;VALUE=DATE:20261224",
  "DTSTART;VALUE=DATE:20261220",
  "UID:1418fb94e984-abc@airbnb.com",
  "DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/de",
  " tails/HMXXXX",
  "SUMMARY:Reserved",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTEND;VALUE=DATE:20270105",
  "DTSTART;VALUE=DATE:20270102",
  "UID:blocked-1@airbnb.com",
  "SUMMARY:Airbnb (Not available)",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("parseIcs", () => {
  it("reads all-day ranges from Airbnb (with folded lines)", () => {
    expect(parseIcs(AIRBNB)).toEqual([
      { uid: "1418fb94e984-abc@airbnb.com", start: "2026-12-20", end: "2026-12-24", summary: "Reserved" },
      { uid: "blocked-1@airbnb.com", start: "2027-01-02", end: "2027-01-05", summary: "Airbnb (Not available)" },
    ]);
  });

  it("handles date-times, missing DTEND and missing UID (Booking.com style)", () => {
    const ics = "BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20261110T140000Z\nSUMMARY:CLOSED - Not available\nEND:VEVENT\nEND:VCALENDAR";
    expect(parseIcs(ics)).toEqual([{ uid: "2026-11-10_2026-11-11", start: "2026-11-10", end: "2026-11-11", summary: "CLOSED - Not available" }]);
  });
});

describe("buildIcs", () => {
  it("writes all-day events with CRLF and round-trips", () => {
    const ics = buildIcs({ name: "Habitación 201", events: [{ uid: "s1@spot", start: "2026-12-20", end: "2026-12-24" }], now: new Date("2026-10-14T12:00:00Z") });
    expect(ics).toContain("DTSTART;VALUE=DATE:20261220\r\nDTEND;VALUE=DATE:20261224");
    expect(ics).toContain("DTSTAMP:20261014T120000Z");
    expect(parseIcs(ics)).toEqual([{ uid: "s1@spot", start: "2026-12-20", end: "2026-12-24", summary: "Ocupado" }]);
  });
});

it("guesses the channel from the URL", () => {
  expect(channelFromUrl("https://www.airbnb.com.co/calendar/ical/123.ics?s=x")).toBe("airbnb");
  expect(channelFromUrl("https://admin.booking.com/hotel/hoteladmin/ical.html?t=y")).toBe("booking");
  expect(channelFromUrl("https://example.com/cal.ics")).toBe("other");
});

it("only accepts public https feed URLs", async () => {
  const { isSafeFeedUrl } = await import("./ical");
  expect(isSafeFeedUrl("https://www.airbnb.com/calendar/ical/1.ics?s=a")).toBe(true);
  expect(isSafeFeedUrl("http://www.airbnb.com/calendar/ical/1.ics")).toBe(false);
  expect(isSafeFeedUrl("https://localhost/x.ics")).toBe(false);
  expect(isSafeFeedUrl("https://169.254.169.254/latest/meta-data")).toBe(false);
  expect(isSafeFeedUrl("https://192.168.1.10/cal.ics")).toBe(false);
  expect(isSafeFeedUrl("https://[::1]/cal.ics")).toBe(false);
  expect(isSafeFeedUrl("https://user:pw@example.com/cal.ics")).toBe(false);
});
