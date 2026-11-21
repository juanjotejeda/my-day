/**
 * Feature flags. One line each, flipped by editing the value: this is a
 * prototype for one person, so there is nothing to configure at runtime.
 */

/**
 * The evening flow: the "Plan tomorrow" and "Close the day" buttons at the
 * foot of Today, and the two notifications that lead to them, at 18:30 and
 * 20:30. Off while the flow is being rethought. The screens, their routes and
 * their code all stay, and /tomorrow and /end-of-day still work when opened.
 */
export const DAY_CLOSE = false;
