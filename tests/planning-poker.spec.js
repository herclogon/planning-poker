// @ts-check
const { test, expect } = require("@playwright/test");
const {
  newClient,
  join,
  timeCard,
  modeButton,
  revealButton,
} = require("./helpers");

const avrScore = (page) => page.locator(".app__avr-score");

test.describe("voting modes", () => {
  test("numbers mode reveals an average", async ({ browser }) => {
    const { page } = await newClient(browser, { name: "Alice", id: "alice" });
    await join(page, "e2e-numbers-average");

    // In numbers mode the variants are random, so read the value we click.
    const firstCard = page.locator(".app__player-card_button").first();
    const value = (await firstCard.locator("span").innerText()).trim();

    await firstCard.click();
    await revealButton(page).click();

    // A single voter's average equals the voted (integer) value.
    await expect(avrScore(page)).toContainText(`Average: ${value}`);
  });

  test("time mode shows text estimates and a consensus on reveal", async ({
    browser,
  }) => {
    const { page } = await newClient(browser, {
      name: "Alice",
      id: "alice",
      mode: "time",
    });
    await join(page, "e2e-time-basic");

    // All five ordered estimates are offered.
    await expect(timeCard(page, "Полдня")).toBeVisible();
    await expect(timeCard(page, "Слишком долго")).toBeVisible();

    await timeCard(page, "До недели").click();
    await revealButton(page).click();

    await expect(avrScore(page)).toContainText("Consensus:");
    await expect(avrScore(page)).toContainText("До недели");
  });

  test("consensus breaks ties toward the more pessimistic estimate", async ({
    browser,
  }) => {
    const a = await newClient(browser, { name: "Alice", id: "alice", mode: "time" });
    const b = await newClient(browser, { name: "Bob", id: "bob", mode: "time" });
    const session = "e2e-consensus-tie";
    await join(a.page, session);
    await join(b.page, session);

    await timeCard(a.page, "Полдня").click();
    await timeCard(b.page, "До недели").click();

    // Wait until Alice has received Bob's card before revealing (each card is
    // rendered twice — once in the top row, once in the bottom row).
    await expect(
      a.page.locator(".app__table-card_player-name", { hasText: "Bob" })
    ).toHaveCount(2);

    await revealButton(a.page).click();

    // 1 vs 1 tie between "Полдня" and "До недели" -> the more pessimistic wins.
    await expect(avrScore(a.page)).toContainText("До недели");
  });
});

test.describe("mode synchronization", () => {
  test("switching mode syncs to another connected client", async ({
    browser,
  }) => {
    const a = await newClient(browser, { name: "Alice", id: "alice" });
    const b = await newClient(browser, { name: "Bob", id: "bob" });
    const session = "e2e-live-sync";
    await join(a.page, session);
    await join(b.page, session);

    // Both start in numbers mode: no time estimate is present yet.
    await expect(timeCard(b.page, "До недели")).toHaveCount(0);

    await modeButton(a.page, "time").click();

    // Bob adopts the time mode broadcast by Alice.
    await expect(timeCard(b.page, "До недели")).toBeVisible();
    await expect(modeButton(b.page, "time")).toHaveClass(/active/);
  });

  test("a late joiner adopts the current mode", async ({ browser }) => {
    const a = await newClient(browser, { name: "Alice", id: "alice" });
    const session = "e2e-late-join";
    await join(a.page, session);

    await modeButton(a.page, "time").click();
    await expect(timeCard(a.page, "Полдня")).toBeVisible();

    // Bob joins only after the switch and should still land in time mode.
    const b = await newClient(browser, { name: "Bob", id: "bob" });
    await join(b.page, session);

    await expect(timeCard(b.page, "Полдня")).toBeVisible();
    await expect(modeButton(b.page, "time")).toHaveClass(/active/);
  });

  test("switching back to numbers syncs too", async ({ browser }) => {
    const a = await newClient(browser, { name: "Alice", id: "alice", mode: "time" });
    const b = await newClient(browser, { name: "Bob", id: "bob", mode: "time" });
    const session = "e2e-sync-back";
    await join(a.page, session);
    await join(b.page, session);

    await expect(timeCard(a.page, "Полдня")).toBeVisible();

    await modeButton(b.page, "numbers").click();

    // Alice leaves time mode: the time estimates disappear for her.
    await expect(timeCard(a.page, "Полдня")).toHaveCount(0);
    await expect(modeButton(a.page, "numbers")).toHaveClass(/active/);
  });
});

test.describe("guards and hidden controls", () => {
  test("scale editing entry is hidden", async ({ browser }) => {
    const { page } = await newClient(browser, { name: "Alice", id: "alice" });
    await join(page, "e2e-edit-hidden");

    await expect(page.locator(".app__edit-values-btn")).toHaveCount(0);
  });

  test("the mode toggle is disabled during the reveal countdown", async ({
    browser,
  }) => {
    const { page } = await newClient(browser, {
      name: "Alice",
      id: "alice",
      mode: "time",
    });
    await join(page, "e2e-guard-countdown");

    await timeCard(page, "Полдня").click();
    await revealButton(page).click();

    // While the 3s countdown runs the toggle stays visible but disabled.
    await expect(page.locator(".app__play-table_table-delay-label")).toBeVisible();
    await expect(modeButton(page, "numbers")).toBeDisabled();
    await expect(modeButton(page, "time")).toBeDisabled();
  });
});
