import { expect, test } from "@playwright/test";

const fruits = [
  { value: "1", label: "Apple" },
  { value: "2", label: "Banana" },
  { value: "3", label: "Mango" },
  { value: "4", label: "Durian", disabled: true },
  { value: "5", label: "Pineapple" },
  {
    value: "6",
    label:
      "Philippine carabao mango from Guimaras, extra sweet, harvested this week",
  },
];

test("picking each fruit in the combo box changes the value", async ({ page }) => {
  // Six fruits with a 2-second pause each needs more than the default 30s.
  test.setTimeout(60_000);

  // /admin needs a signed-in user, so this lands on the login page first.
  // Typing before the page's JavaScript has loaded can be lost, so if the
  // first try stays on the login page, fill the form in and log in again.
  await page.goto("/admin/test");
  await expect(async () => {
    await page.getByLabel("Username").fill(process.env.E2E_USERNAME ?? "");
    await page.getByLabel("Password").fill(process.env.E2E_PASSWORD ?? "");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page).toHaveURL(/\/admin\/test$/, { timeout: 3000 });
  }).toPass({ timeout: 20_000 });

  const combobox = page.getByRole("combobox", { name: "Fruit" });

  for (const fruit of fruits) {
    // A click that lands before the page's JavaScript has loaded does
    // nothing, so keep clicking until the list opens.
    await expect(async () => {
      await combobox.click();
      await expect(combobox).toHaveAttribute("aria-expanded", "true", {
        timeout: 1000,
      });
    }).toPass();

    // exact, or "Apple" would also match "Pineapple".
    const option = page.getByRole("option", { name: fruit.label, exact: true });

    if (fruit.disabled) {
      // Durian can't be picked; check it's greyed out, then close the list.
      await expect(option).toHaveAttribute("aria-disabled", "true");
      await page.waitForTimeout(2000);
      await page.keyboard.press("Escape");
      continue;
    }

    await option.click();
    await expect(combobox).toHaveText(fruit.label);
    await expect(
      page.getByText(`Picked value: ${fruit.value} (${fruit.label})`),
    ).toBeVisible();

    // Only here so a person watching can see each pick.
    await page.waitForTimeout(2000);
  }
});
