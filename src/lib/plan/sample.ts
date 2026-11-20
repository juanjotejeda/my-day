import type { PlanItem } from "./types.ts";

/**
 * The sample day from the approved design (BASE in m2-minimal-calm-now.dc.html).
 * Used for the kinds of item nothing is connected to yet: tasks, reminders,
 * Gmail items and suggestions. Real calendar events replace the Calendar ones.
 */
export const SAMPLE_DAY: PlanItem[] = [
  { id: "run", title: "Morning run", start: 450, end: 495, fixed: false, category: "personal", source: "Reminder", why: "Exercise time you reserved before work.", rank: "should", effort: "Personal" },
  { id: "sync", title: "Co-founder sync", start: 510, end: 540, fixed: true, category: "work", source: "Calendar", why: "Recurring meeting, Monday, Wednesday and Friday.", rank: "must", effort: "Meeting" },
  { id: "prop", title: "Write Northwind proposal", start: 555, end: 675, fixed: false, category: "work", source: "Gmail", why: "You told Lena Hoffmann you would send it by Monday. Placed in your peak focus hours.", rank: "must", important: true, effort: "Deep work" },
  { id: "call", title: "Northwind client call", start: 690, end: 720, fixed: true, category: "work", source: "Calendar", why: "Video call with Lena Hoffmann.", rank: "must", effort: "Meeting" },
  { id: "lunch", title: "Lunch break", start: 720, end: 780, fixed: false, category: "personal", source: "Settings", why: "Your preferred lunch window.", rank: "protected", effort: "Break" },
  { id: "marco", title: "Reply to Marco about the invoice", start: 780, end: 800, fixed: false, category: "work", source: "Gmail", why: "Marco asked twice this week. Short reply, placed in your low-energy dip.", rank: "should", effort: "Light task" },
  { id: "inv", title: "Intro call, Fieldstone Capital", start: 840, end: 885, fixed: true, category: "work", source: "Calendar", why: "Intro call with Hanna Berg.", rank: "must", effort: "Meeting" },
  { id: "slides", title: "Review slides for Monday", start: 900, end: 930, fixed: false, category: "work", source: "Suggested", why: "Light task that fits your afternoon energy dip.", rank: "could", effort: "Light task" },
  { id: "dent", title: "Take Thiago to the dentist", start: 960, end: 1020, fixed: true, category: "personal", source: "Reminder", why: "You added this on Tuesday. Leave home at 15:40.", rank: "must", effort: "Family" },
  { id: "gift", title: "Pick up birthday gift", start: 1035, end: 1060, fixed: false, category: "personal", source: "Reminder", why: "The shop is on the way back from the dentist.", rank: "should", effort: "Errand" },
  { id: "dinner", title: "Family dinner", start: 1110, end: 1170, fixed: true, category: "personal", source: "Calendar", why: "Time you protect for family.", rank: "protected", effort: "Family" },
  { id: "flights", title: "Book flights for December", start: 0, end: 0, fixed: false, category: "personal", source: "Gmail", why: "The airline offer in your inbox expires next Friday.", rank: "later", effort: "Errand", later: true },
  { id: "tax", title: "Send receipts to tax advisor", start: 0, end: 0, fixed: false, category: "work", source: "Gmail", why: "Requested by 30 November.", rank: "later", effort: "Light task", later: true },
];

/** The scripted transcript the voice composer plays until Voxtral is wired up. */
export const SAMPLE_TRANSCRIPT = "Remind me to call the plumber tomorrow at 9";
