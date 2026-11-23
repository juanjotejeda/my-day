/** One entry on a day, in the shape the screens use: minutes from midnight. */
export type PlanItem = {
  id: string;
  title: string;
  /** Minutes from midnight. 0 for items with no slot yet. */
  start: number;
  end: number;
  fixed: boolean;
  category: "work" | "personal";
  /** Where it came from, as shown to Juan: Calendar, Gmail, Reminder, Settings, Suggested, Added by you. */
  source: string;
  why: string;
  rank: "must" | "should" | "could" | "protected" | "later";
  /** Deep work, Meeting, Light task, Errand, Break, Personal, Family. */
  effort: string;
  important?: boolean;
  /** No slot yet: shown under Later. */
  later?: boolean;
  /** Pushed to tomorrow: also shown under Later. */
  moved?: boolean;
  done?: boolean;
  /** My Day created this, so it can be deleted from the app. */
  createdHere?: boolean;
  /** Came forward from an earlier day. */
  carried?: boolean;
  /** Juan put this at a time himself. */
  pinned?: boolean;
  /** From a calendar you follow rather than your own. */
  otherCalendar?: boolean;
};

export type AddType = "gcal" | "appt" | "reminder" | "task";

export type Draft = {
  type: AddType;
  text: string;
  time: string;
  day: "today" | "tomorrow";
  dur: 15 | 30 | 60;
  /** A task is placed by the scheduler unless Juan sets a time himself. */
  auto: boolean;
};

export const EMPTY_DRAFT: Draft = {
  type: "task",
  text: "",
  time: "",
  day: "today",
  dur: 30,
  auto: true,
};
