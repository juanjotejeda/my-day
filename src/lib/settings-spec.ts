import type { SectionName } from "@/lib/settings";

export type Choice = { value: string; label: string };

export type Field =
  | { kind: "switch"; section: SectionName; key: string; label: string; sub?: string }
  | {
      kind: "pills";
      section: SectionName;
      key: string;
      label: string;
      choices: Choice[];
      multi?: boolean;
      numeric?: boolean;
    }
  | { kind: "time"; section: SectionName; key: string; label: string }
  | {
      kind: "range";
      section: SectionName;
      key: string;
      label: string;
      min: number;
      max: number;
      step?: number;
      format: "count" | "window";
    }
  | {
      kind: "order";
      section: SectionName;
      key: string;
      label: string;
      items: Choice[];
    }
  | { kind: "row"; label: string; sub?: string; value?: string }
  | { kind: "link"; href: string; label: string; sub?: string; value?: string }
  | { kind: "text"; text: string };

export type Group =
  | { title?: string; fields: Field[] }
  | { note: { label: string; text: string } }
  | { curve: { section: SectionName } };

export type ScreenSpec = {
  title: string;
  sub?: string;
  back: string;
  groups: Group[];
};

const DAYS: Choice[] = [
  { value: "mo", label: "Mon" },
  { value: "tu", label: "Tue" },
  { value: "we", label: "Wed" },
  { value: "th", label: "Thu" },
  { value: "fr", label: "Fri" },
  { value: "sa", label: "Sat" },
  { value: "su", label: "Sun" },
];

export const RHYTHM_SCREEN: ScreenSpec = {
  title: "Rhythm and energy",
  back: "/settings",
  groups: [
    {
      title: "Sleep",
      fields: [
        { kind: "time", section: "rhythm", key: "wake", label: "Wake up" },
        { kind: "time", section: "rhythm", key: "bed", label: "Bedtime" },
      ],
    },
    {
      title: "Energy",
      fields: [
        {
          kind: "pills",
          section: "rhythm",
          key: "chronotype",
          label: "Which sounds like you?",
          choices: [
            { value: "early", label: "Early bird" },
            { value: "mid", label: "In between" },
            { value: "late", label: "Night owl" },
          ],
        },
      ],
    },
    { curve: { section: "rhythm" } },
    {
      fields: [
        {
          kind: "switch",
          section: "rhythm",
          key: "learnFromCorrections",
          label: "Adjust from my corrections",
          sub: "When you keep moving deep work, the curve shifts",
        },
      ],
    },
    {
      note: {
        label: "WHAT THIS CHANGES",
        text: "Deep work is placed in the peak window. Replies, admin and errands go into dips. Nothing is planned in the hour before bedtime. The energy track and the energy label on every item use this curve.",
      },
    },
    {
      title: "Weekdays differ",
      fields: [
        { kind: "row", label: "Friday", sub: "Custom", value: "Peak 10:00" },
        { kind: "row", label: "Saturday and Sunday", value: "Same as weekdays" },
      ],
    },
  ],
};

export const WORK_SCREEN: ScreenSpec = {
  title: "Work and focus",
  back: "/settings",
  groups: [
    {
      title: "Working time",
      fields: [
        { kind: "pills", section: "work", key: "days", label: "Working days", choices: DAYS, multi: true },
        { kind: "time", section: "work", key: "start", label: "Work starts" },
        { kind: "time", section: "work", key: "end", label: "Work ends" },
        {
          kind: "switch",
          section: "work",
          key: "hardStop",
          label: "Hard stop",
          sub: "Never plan work after the end of work",
        },
      ],
    },
    {
      title: "Focus",
      fields: [
        {
          kind: "pills",
          section: "focus",
          key: "blockLength",
          label: "Focus block",
          numeric: true,
          choices: [
            { value: "45", label: "45 min" },
            { value: "60", label: "60 min" },
            { value: "90", label: "90 min" },
            { value: "120", label: "2 hours" },
          ],
        },
        {
          kind: "pills",
          section: "focus",
          key: "breakLength",
          label: "Break after focus",
          numeric: true,
          choices: [
            { value: "10", label: "10 min" },
            { value: "15", label: "15 min" },
            { value: "20", label: "20 min" },
          ],
        },
        {
          kind: "range",
          section: "focus",
          key: "maxFocusHours",
          label: "Most focus per day",
          min: 1,
          max: 6,
          format: "count",
        },
      ],
    },
    {
      title: "Meetings",
      fields: [
        {
          kind: "pills",
          section: "focus",
          key: "bufferMin",
          label: "Buffer between meetings",
          numeric: true,
          choices: [
            { value: "0", label: "None" },
            { value: "5", label: "5 min" },
            { value: "10", label: "10 min" },
            { value: "15", label: "15 min" },
          ],
        },
        {
          kind: "range",
          section: "focus",
          key: "meetingWarn",
          label: "Warn me above this many meetings",
          min: 2,
          max: 8,
          format: "count",
        },
      ],
    },
    {
      title: "Lunch",
      fields: [
        { kind: "time", section: "work", key: "lunchStart", label: "Lunch" },
        {
          kind: "pills",
          section: "work",
          key: "lunchLength",
          label: "Lunch length",
          numeric: true,
          choices: [
            { value: "30", label: "30 min" },
            { value: "45", label: "45 min" },
            { value: "60", label: "60 min" },
          ],
        },
      ],
    },
    {
      note: {
        label: "WHAT THIS CHANGES",
        text: "Long tasks are split into focus blocks with breaks. Work never lands outside your working days and hours. When meetings pass your limit, the day is flagged as overloaded and lower priorities move to later.",
      },
    },
  ],
};

export const PRIORITIES_SCREEN: ScreenSpec = {
  title: "Priorities and protected time",
  back: "/settings",
  groups: [
    {
      title: "When things clash",
      fields: [
        {
          kind: "order",
          section: "priorities",
          key: "clashOrder",
          label: "When things clash",
          items: [
            { value: "family", label: "Family" },
            { value: "clients", label: "Clients" },
            { value: "team", label: "Team" },
            { value: "admin", label: "Admin" },
          ],
        },
        { kind: "text", text: "Use the arrows to move a group up or down." },
      ],
    },
    {
      title: "Counts as urgent",
      fields: [
        { kind: "switch", section: "priorities", key: "urgentDue", label: "Due today or tomorrow" },
        {
          kind: "switch",
          section: "priorities",
          key: "urgentWaiting",
          label: "Someone waiting more than 2 days",
        },
        { kind: "switch", section: "priorities", key: "urgentVip", label: "From people who always count" },
      ],
    },
    {
      title: "People who always count",
      fields: [
        {
          kind: "pills",
          section: "priorities",
          key: "vipPeople",
          label: "Priority people",
          multi: true,
          choices: [
            { value: "cof", label: "Co-founder" },
            { value: "lena", label: "Lena Hoffmann" },
            { value: "school", label: "Thiago's school" },
          ],
        },
      ],
    },
    {
      title: "Topics that matter",
      fields: [
        {
          kind: "pills",
          section: "priorities",
          key: "topics",
          label: "Topics that matter",
          multi: true,
          choices: [
            { value: "prop", label: "Proposals" },
            { value: "inv", label: "Invoices" },
            { value: "contract", label: "Contracts" },
          ],
        },
      ],
    },
    {
      title: "Topics to ignore",
      fields: [
        {
          kind: "pills",
          section: "priorities",
          key: "ignoreTopics",
          label: "Topics to ignore",
          multi: true,
          choices: [
            { value: "news", label: "Newsletters" },
            { value: "promo", label: "Promotions" },
            { value: "notif", label: "App notifications" },
          ],
        },
      ],
    },
    {
      title: "Protected time",
      fields: [
        {
          kind: "switch",
          section: "protectedTime",
          key: "exercise",
          label: "Exercise",
          sub: "Mon, Wed, Fri at 07:30, 45 min",
        },
        {
          kind: "switch",
          section: "protectedTime",
          key: "familyDinner",
          label: "Family dinner",
          sub: "Every day at 18:30",
        },
        { kind: "switch", section: "protectedTime", key: "noWorkWeekends", label: "No work at weekends" },
      ],
    },
    {
      note: {
        label: "WHAT THIS CHANGES",
        text: "Urgent items and items from priority people go into Must. Ignored topics never become tasks. Protected time is treated like a fixed event: nothing is placed on top of it.",
      },
    },
  ],
};

export const NOTIFICATIONS_SCREEN: ScreenSpec = {
  title: "Notifications",
  sub: "Few, and only when they help.",
  back: "/settings",
  groups: [
    {
      title: "Daily",
      fields: [
        {
          kind: "switch",
          section: "notifications",
          key: "morning",
          label: "Morning overview",
          sub: "Your day in one view",
        },
        { kind: "time", section: "notifications", key: "morningAt", label: "At" },
        {
          kind: "switch",
          section: "notifications",
          key: "evening",
          label: "Plan tomorrow",
          sub: "A look at tomorrow in the evening",
        },
        { kind: "time", section: "notifications", key: "eveningAt", label: "At" },
        {
          kind: "switch",
          section: "notifications",
          key: "close",
          label: "Close the day",
          sub: "End-of-day review after work ends",
        },
      ],
    },
    {
      title: "During the day",
      fields: [
        {
          kind: "pills",
          section: "notifications",
          key: "beforeEvents",
          label: "Before fixed events",
          numeric: true,
          choices: [
            { value: "0", label: "Off" },
            { value: "5", label: "5 min" },
            { value: "10", label: "10 min" },
            { value: "15", label: "15 min" },
          ],
        },
        {
          kind: "pills",
          section: "notifications",
          key: "foundItems",
          label: "New items found in email",
          choices: [
            { value: "now", label: "Right away" },
            { value: "batch", label: "In the next overview" },
          ],
        },
        {
          kind: "switch",
          section: "notifications",
          key: "silentInFocus",
          label: "Silent during focus blocks",
        },
      ],
    },
    {
      title: "Quiet hours",
      fields: [
        { kind: "time", section: "notifications", key: "quietStart", label: "From" },
        { kind: "time", section: "notifications", key: "quietEnd", label: "Until" },
      ],
    },
    {
      note: {
        label: "WHAT THIS CHANGES",
        text: "New email items wait for the next overview instead of interrupting you. Nothing arrives in quiet hours or focus blocks, except fixed events starting within your chosen lead time.",
      },
    },
  ],
};

export const PRIVACY_SCREEN: ScreenSpec = {
  title: "Privacy and data",
  back: "/settings",
  groups: [
    {
      title: "What is stored",
      fields: [
        { kind: "row", label: "Extracted items", sub: "Title, time, source link", value: "Kept" },
        { kind: "row", label: "Full emails", value: "Not stored" },
        {
          kind: "switch",
          section: "privacy",
          key: "keepQuotes",
          label: "Keep short source quotes",
          sub: "The line an item came from",
        },
        {
          kind: "pills",
          section: "privacy",
          key: "retentionDays",
          label: "Keep quotes and history for",
          numeric: true,
          choices: [
            { value: "7", label: "7 days" },
            { value: "30", label: "30 days" },
            { value: "90", label: "90 days" },
          ],
        },
      ],
    },
    {
      title: "AI processing",
      fields: [
        {
          kind: "text",
          text: "Email text is sent to Mistral only to find tasks, dates and commitments. Scheduling runs in My Day without AI.",
        },
        {
          kind: "switch",
          section: "privacy",
          key: "processSentMail",
          label: "Include sent mail in processing",
          sub: "Finds promises you made",
        },
      ],
    },
    {
      title: "Access",
      fields: [
        { kind: "row", label: "Google permissions", value: "Calendar events, Gmail read-only" },
        { kind: "row", label: "Hosting", value: "Railway, your project" },
        { kind: "row", label: "Who sees your data", value: "Only you" },
        { kind: "link", href: "/privacy", label: "Privacy policy", value: "Read" },
      ],
    },
    {
      note: {
        label: "WHAT THIS CHANGES",
        text: "Shorter keeping means less history for learning. Removing quotes keeps the link back to Gmail, so every item stays traceable.",
      },
    },
  ],
};

export const PROFILE_SCREEN: ScreenSpec = {
  title: "Profile",
  back: "/settings",
  groups: [
    {
      title: "Region",
      fields: [
        { kind: "row", label: "Time zone", sub: "Follows your phone", value: "Europe/Berlin" },
        {
          kind: "pills",
          section: "profile",
          key: "language",
          label: "Language",
          choices: [
            { value: "en", label: "English" },
            { value: "de", label: "Deutsch" },
          ],
        },
        { kind: "switch", section: "profile", key: "clock24", label: "24-hour clock" },
        {
          kind: "pills",
          section: "profile",
          key: "weekStart",
          label: "Week starts on",
          choices: [
            { value: "mo", label: "Monday" },
            { value: "su", label: "Sunday" },
          ],
        },
      ],
    },
    {
      title: "About you",
      fields: [
        { kind: "link", href: "/settings/rhythm", label: "Rhythm and energy" },
        {
          kind: "row",
          label: "Personality profile",
          sub: "Big Five test, a later experiment",
          value: "Later",
        },
      ],
    },
  ],
};


/** The onboarding steps, as saved settings fields. */
export const RHYTHM_STEP: Field[][] = [
  [
    { kind: "time", section: "rhythm", key: "wake", label: "Wake up" },
    { kind: "time", section: "rhythm", key: "bed", label: "Bedtime" },
  ],
  [
    { kind: "pills", section: "work", key: "days", label: "Working days", choices: DAYS, multi: true },
    { kind: "time", section: "work", key: "start", label: "Work starts" },
    { kind: "time", section: "work", key: "end", label: "Work ends" },
    { kind: "time", section: "work", key: "lunchStart", label: "Lunch" },
  ],
];

export const ENERGY_STEP: Field[] = [
  {
    kind: "pills",
    section: "rhythm",
    key: "chronotype",
    label: "Which sounds like you?",
    choices: [
      { value: "early", label: "Early bird" },
      { value: "mid", label: "In between" },
      { value: "late", label: "Night owl" },
    ],
  },
];

export const PRIORITIES_STEP: Field[][] = [
  [
    {
      kind: "order",
      section: "priorities",
      key: "clashOrder",
      label: "When things clash",
      items: [
        { value: "family", label: "Family" },
        { value: "clients", label: "Clients" },
        { value: "team", label: "Team" },
        { value: "admin", label: "Admin" },
      ],
    },
    { kind: "text", text: "Use the arrows to move a group up or down." },
  ],
  [
    {
      kind: "pills",
      section: "priorities",
      key: "vipPeople",
      label: "Items from these people rank higher",
      multi: true,
      choices: [
        { value: "cof", label: "Co-founder" },
        { value: "lena", label: "Lena Hoffmann" },
        { value: "school", label: "Thiago's school" },
      ],
    },
  ],
  [
    { kind: "switch", section: "protectedTime", key: "exercise", label: "Exercise", sub: "Mon, Wed, Fri at 07:30" },
    { kind: "switch", section: "protectedTime", key: "familyDinner", label: "Family dinner", sub: "Every day at 18:30" },
    { kind: "switch", section: "protectedTime", key: "noWorkWeekends", label: "No work at weekends" },
  ],
];

export const FOCUS_STEP: Field[] = [
  {
    kind: "pills",
    section: "focus",
    key: "blockLength",
    label: "Focus block",
    numeric: true,
    choices: [
      { value: "45", label: "45 min" },
      { value: "60", label: "60 min" },
      { value: "90", label: "90 min" },
      { value: "120", label: "2 hours" },
    ],
  },
  {
    kind: "pills",
    section: "focus",
    key: "breakLength",
    label: "Break after focus",
    numeric: true,
    choices: [
      { value: "10", label: "10 min" },
      { value: "15", label: "15 min" },
      { value: "20", label: "20 min" },
    ],
  },
  {
    kind: "pills",
    section: "focus",
    key: "bufferMin",
    label: "Buffer between meetings",
    numeric: true,
    choices: [
      { value: "0", label: "None" },
      { value: "5", label: "5 min" },
      { value: "10", label: "10 min" },
      { value: "15", label: "15 min" },
    ],
  },
  { kind: "switch", section: "work", key: "hardStop", label: "Hard stop at end of work", sub: "Never plan work after the end of work" },
];
