import type { MemberState } from "@/lib/memberships/status";

/** One member as shown in the dashboard (their membership that matters today). */
export interface MemberRow {
  contactId: string;
  name: string;
  phone: string | null;
  code: string | null;
  token: string | null;
  planId: string | null;
  planName: string | null;
  state: MemberState;
  /** Membership row behind `state` (null when none) */
  membershipId: string | null;
  startsOn: string | null;
  endsOn: string | null;
  daysLeft: number;
  sessionsLeft: number | null;
  sessionsTotal: number | null;
  /** Pending web sign-up waiting for payment */
  pendingId: string | null;
  pendingPlan: string | null;
  lastVisit: string | null;
}
