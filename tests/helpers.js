// @ts-check
const { expect } = require("@playwright/test");

// The five ordered time estimates, mirroring TIME_VARIANTS in src/app.js
// (from the most optimistic to the most pessimistic one).
const TIME_VARIANTS = [
  "Half a day",
  "A day or two",
  "Up to a week",
  "Up to two weeks",
  "Too long",
];

/**
 * Create an isolated browser client with its own storage (so two clients get
 * distinct playerId's and don't share a voting mode). `playerName` is seeded
 * into localStorage to skip the first-run rename modal. An optional `mode`
 * pre-selects the voting mode before the app boots.
 */
async function newClient(browser, { name, id, mode } = {}) {
  const context = await browser.newContext();
  await context.addInitScript(
    (data) => {
      localStorage.setItem("playerName", data.name);
      localStorage.setItem("playerId", data.id);
      if (data.mode) localStorage.setItem("mode", data.mode);
    },
    { name: name || "Tester", id: id || `id-${name || "tester"}`, mode }
  );
  const page = await context.newPage();
  return { context, page };
}

/** Navigate a page to a session and wait until its socket is connected. */
async function join(page, session) {
  await page.goto(`/${session}`);
  await expect(
    page.locator(".app__connection-status_indicator.connected")
  ).toBeVisible();
}

/** A time-estimate card button in the selector, matched exactly by its text. */
function timeCard(page, label) {
  return page.locator(".app__player-card_button", {
    has: page.locator("span", { hasText: new RegExp(`^${label}$`) }),
  });
}

/** The mode-toggle button for a given mode ("numbers" | "time"). */
function modeButton(page, mode) {
  const title = mode === "time" ? "Time estimates" : "Numbers";
  return page.locator(`.app__mode-toggle button[title="${title}"]`);
}

/** The "Reveal cards" button on the table. */
function revealButton(page) {
  return page.locator(".app__play-table_table-button", {
    hasText: "Reveal cards",
  });
}

module.exports = {
  TIME_VARIANTS,
  newClient,
  join,
  timeCard,
  modeButton,
  revealButton,
};
