/**
 * Sample content for the screens whose real data arrives in later milestones,
 * taken from the approved designs so the layouts can be judged as drawn.
 */

export type Candidate = {
  id: string;
  kind: string;
  received: string;
  title: string;
  from: string;
  subject: string;
  quote: string;
  suggestion: string;
};

export const SAMPLE_CANDIDATES: Candidate[] = [
  {
    id: "c1",
    kind: "Task",
    received: "Tue 18 Nov, 16:42",
    title: "Send Northwind proposal",
    from: "Lena Hoffmann",
    subject: "Re: Northwind next steps",
    quote: "...if you send the proposal by Monday, we take it to the board on Wednesday.",
    suggestion: "Suggested: Today 09:15 · 2h · peak energy",
  },
  {
    id: "c2",
    kind: "Task",
    received: "Thu 19 Nov, 09:05",
    title: "Answer invoice question",
    from: "Marco Weber",
    subject: "Invoice 2026-114",
    quote: "Could you confirm the hours on line 3 before we pay?",
    suggestion: "Suggested: Today 13:00 · 20 min · low energy",
  },
  {
    id: "c3",
    kind: "Appointment",
    received: "Thu 19 Nov, 18:30",
    title: "Team dinner",
    from: "Sara Lindqvist",
    subject: "Dinner next Thursday?",
    quote: "Thursday at 19:00 at the usual place, ok for you?",
    suggestion: "Suggested: Thu 26 Nov 19:00 · personal",
  },
  {
    id: "c4",
    kind: "Later",
    received: "Fri 20 Nov, 07:10",
    title: "Book flights for December",
    from: "Airline offers",
    subject: "Your fare is held until Friday",
    quote: "Your fare is held until 27 November.",
    suggestion: "Suggested: Later · deadline 27 Nov",
  },
];

export const SAMPLE_DETAIL = {
  title: "Write Northwind proposal",
  tags: ["Flexible", "Deep work", "Important"],
  planned: "09:15 to 11:15",
  length: "2h",
  lengthNote: "Learned: proposals take you 2h",
  energy: "Peak",
  why: "You told Lena Hoffmann you would send it by Monday. It is placed in your peak focus hours, before the client call at 11:30.",
  source: {
    kind: "Gmail",
    who: "Lena Hoffmann · Re: Northwind next steps",
    when: "Tue 18 Nov, 16:42",
    quote: "...if you send the proposal by Monday, we take it to the board on Wednesday.",
  },
  history: [
    { when: "18 Nov", what: "Found in email" },
    { when: "18 Nov", what: "You marked it important" },
    { when: "19 Nov", what: "Moved from afternoon to peak" },
  ],
  related: { title: "Northwind client call", time: "11:30", meta: "Fixed · Calendar" },
};

export const SAMPLE_TOMORROW = {
  weekday: "Saturday, 21 November",
  blocks: [
    { left: 13.3, width: 5, fixed: false },
    { left: 26.7, width: 13.3, fixed: true },
    { left: 53.3, width: 3, fixed: false },
    { left: 66.7, width: 6.7, fixed: true },
  ],
  weekendNote: "Weekends are protected, so work items wait until Monday.",
  planned: [
    { id: "t1", title: "Morning run", time: "09:00", meta: "Flexible · Reminder", fill: "#D5E1F5", dashed: true },
    { id: "t2", title: "Thiago's football match", time: "11:00", meta: "Fixed · Calendar", fill: "#A3BDE8", dashed: false },
    { id: "t3", title: "Pick up birthday gift", time: "15:00", meta: "Flexible · moved from today", fill: "#EAF0FA", dashed: true },
    { id: "t4", title: "Dinner with friends", time: "17:00", meta: "Fixed · Calendar", fill: "#D5E1F5", dashed: false },
  ],
  monday: [
    { id: "m1", title: "Send Northwind proposal", time: "Mon", meta: "Deadline · Gmail", fill: "#A3BDE8", chip: "sky" as const },
    { id: "m2", title: "Weekly planning", time: "Mon 10:00", meta: "Fixed · Calendar", fill: "#D5E1F5", chip: "divider" as const },
  ],
};

export const SAMPLE_END_OF_DAY = {
  when: "Friday, 20 November · 18:05",
  headline: "7 of 9 done",
  stats: [
    { label: "Focus time", value: "1h 45m of 2h" },
    { label: "Moved", value: "1 item" },
    { label: "Corrections", value: "3", sub: "Saved as feedback" },
  ],
  open: [
    { id: "slides", title: "Review slides for Monday" },
    { id: "marco", title: "Reply to Marco about the invoice" },
  ],
  carryChoices: [
    { value: "tom", label: "Tomorrow" },
    { value: "mon", label: "Monday" },
    { value: "later", label: "Later" },
    { value: "drop", label: "Drop" },
  ],
  feelChoices: [
    { value: "calm", label: "Calm" },
    { value: "fine", label: "Fine" },
    { value: "busy", label: "Busy" },
    { value: "over", label: "Overloaded" },
    { value: "chaos", label: "Chaotic" },
  ],
  planChoices: [
    { value: "yes", label: "Mostly" },
    { value: "part", label: "Partly" },
    { value: "no", label: "Not really" },
  ],
};

export const SAMPLE_INSIGHTS = {
  label: "Insights · experiment week 1 of 2",
  tiles: [
    { value: "78%", label: "Plan accepted as proposed" },
    { value: "2.4", label: "Corrections per day" },
    { value: "19 of 23", label: "Email items correct" },
    { value: "7h 30m", label: "Focus done, of 9h planned" },
  ],
  days: [
    { day: "Mon", height: 60, strong: false },
    { day: "Tue", height: 85, strong: true },
    { day: "Wed", height: 70, strong: true },
    { day: "Thu", height: 45, strong: false },
    { day: "Fri", height: 80, strong: true },
  ],
  patterns: [
    "Tasks after 15:00 overrun most often. My Day adds 15 minutes to afternoon tasks.",
    "You move admin tasks to Friday. Want that as a rule?",
  ],
  questions: [
    { q: "Captured the important things?", a: "Mostly" },
    { q: "Less app switching?", a: "Yes" },
  ],
  trustChoices: ["1", "2", "3", "4", "5"].map((n) => ({ value: n, label: n })),
};

export const SAMPLE_LAST_KNOWN = [
  { id: "l1", title: "Co-founder sync", time: "08:30", meta: "Fixed · Calendar", fill: "#D5E1F5", chip: "divider" as const },
  { id: "l2", title: "Write Northwind proposal", time: "09:15", meta: "Flexible · Gmail", fill: "#A3BDE8", chip: "dashed" as const },
  { id: "l3", title: "Northwind client call", time: "11:30", meta: "Fixed · Calendar", fill: "#A3BDE8", chip: "divider" as const },
  { id: "l4", title: "Intro call, Fieldstone Capital", time: "14:00", meta: "Fixed · Calendar", fill: "#D5E1F5", chip: "divider" as const },
];
