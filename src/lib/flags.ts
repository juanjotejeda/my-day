/**
 * Feature flags. One line each, flipped by editing the value: this is a
 * prototype for one person, so there is nothing to configure at runtime.
 */

/**
 * The evening flow, in two parts. Off parts keep their screens, routes and
 * code; only the entry points (the button at the foot of Today and the
 * notification) are hidden.
 *
 * PLAN_TOMORROW: the "Plan tomorrow" button and the 20:30 notification.
 * DAY_CLOSE: the "Close the day" button and the notification 30 minutes after
 * work ends. Off while the flow is being rethought.
 */
export const PLAN_TOMORROW = true;
export const DAY_CLOSE = false;

/**
 * The three corrections on the item screen that say nothing about when an
 * appointment happens: Move to tomorrow, Mark as important, Change work or
 * personal. Hidden for now; the actions, the corrections they write and the
 * rules they teach are all still here, waiting for the switch.
 */
export const ITEM_CORRECTIONS = false;
