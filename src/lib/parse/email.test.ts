// Run: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { bestQuote, plainText, shouldSkip, trimForModel } from "./email.ts";

const b64 = (text: string) => Buffer.from(text, "utf8").toString("base64url");

test("the plain text part is preferred over the html one", () => {
  const text = plainText({
    mimeType: "multipart/alternative",
    parts: [
      { mimeType: "text/plain", body: { data: b64("Please send the proposal by Monday.") } },
      { mimeType: "text/html", body: { data: b64("<p>Please send the proposal by Monday.</p>") } },
    ],
  });
  assert.equal(text, "Please send the proposal by Monday.");
});

test("html is used when there is no plain part, with the tags gone", () => {
  const text = plainText({
    mimeType: "text/html",
    body: { data: b64("<div>Hi Juan,<br>Can you <b>confirm</b> the hours?</div><style>x{}</style>") },
  });
  assert.match(text, /Can you confirm the hours\?/);
  assert.ok(!text.includes("<"), "no markup survives");
  assert.ok(!text.includes("x{}"), "style blocks go too");
});

test("a quoted reply is cut off", () => {
  const body = [
    "Could you confirm the hours on line 3?",
    "",
    "On Tue, 18 Nov 2026 at 16:42, Juan Tejeda wrote:",
    "> Here is the invoice",
    "> Thanks",
  ].join("\n");
  const trimmed = trimForModel(body);
  assert.equal(trimmed, "Could you confirm the hours on line 3?");
});

test("German and Outlook style quotes are cut too", () => {
  assert.equal(
    trimForModel("Bitte bestätige die Stunden.\n\nAm 18.11.2026 schrieb Juan:\n> alt"),
    "Bitte bestätige die Stunden.",
  );
  assert.equal(
    trimForModel("Can you confirm?\n\n-----Original Message-----\nFrom: someone"),
    "Can you confirm?",
  );
});

test("a signature is dropped", () => {
  assert.equal(trimForModel("Please confirm.\n\n-- \nLena Hoffmann\nNorthwind"), "Please confirm.");
  assert.equal(trimForModel("Please confirm.\n\nSent from my iPhone"), "Please confirm.");
});

test("the text handed to the model is capped", () => {
  const long = "word ".repeat(3000);
  assert.ok(trimForModel(long).length <= 6000, "the spec caps this at 6000 characters");
});

test("newsletters and promotions never reach the model", () => {
  assert.equal(
    shouldSkip({ headers: { "list-unsubscribe": "<https://x>" }, labelIds: ["INBOX"], from: "news@x.com", subject: "Weekly" }, {}).skip,
    true,
  );
  assert.equal(
    shouldSkip({ headers: {}, labelIds: ["CATEGORY_PROMOTIONS"], from: "sale@x.com", subject: "50% off" }, {}).skip,
    true,
  );
  assert.equal(shouldSkip({ headers: {}, labelIds: ["SPAM"], from: "x@x.com", subject: "hi" }, {}).skip, true);
});

test("ignored senders and topics are skipped, and the reason says which", () => {
  const sender = shouldSkip(
    { headers: {}, labelIds: ["INBOX"], from: "Robot <noreply@tool.com>", subject: "Build passed" },
    { ignoreSenders: ["noreply@tool.com"] },
  );
  assert.equal(sender.skip, true);
  assert.match(sender.reason, /sender/i);

  const topic = shouldSkip(
    { headers: {}, labelIds: ["INBOX"], from: "a@b.com", subject: "Your newsletter for November" },
    { ignoreTopics: ["news"] },
  );
  assert.equal(topic.skip, true);
  assert.match(topic.reason, /topic/i);
});

test("a real request from a person goes through", () => {
  const decision = shouldSkip(
    {
      headers: {},
      labelIds: ["INBOX", "IMPORTANT"],
      from: "Lena Hoffmann <lena@northwind.com>",
      subject: "Re: Northwind next steps",
    },
    { ignoreSenders: ["noreply@tool.com"], ignoreTopics: ["news", "promo"] },
  );
  assert.equal(decision.skip, false);
});

test("a quote copied word for word is kept", () => {
  const body = "Hi Juan,\n\nCould you confirm the hours on line 3 before we pay?\n\nThanks";
  assert.equal(bestQuote(body, "Could you confirm the hours on line 3 before we pay?"),
    "Could you confirm the hours on line 3 before we pay?");
});

test("a paraphrase is replaced by the real line it came from", () => {
  const body = "Hi Juan,\n\nPlease confirm the hours on line 3 before we pay the invoice.\n\nMarco";
  const quote = bestQuote(body, "confirm hours line 3 before payment");
  assert.equal(quote, "Please confirm the hours on line 3 before we pay the invoice.");
});

test("an invention with nothing behind it gives no quote", () => {
  const body = "Hi Juan,\n\nThe office party is on Friday.\n\nSara";
  assert.equal(bestQuote(body, "Send the quarterly tax return to the accountant"), "");
});

test("a quote never runs past 200 characters", () => {
  const line = `Please ${"really ".repeat(40)}confirm`;
  assert.ok(bestQuote(line, line).length <= 200);
});
