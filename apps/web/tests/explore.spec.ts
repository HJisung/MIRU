import { expect, test } from "@playwright/test";

test("a visitor opens a Home Single from the Home service", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "오늘 볼 영상" })).toBeVisible();
  const video = page.getByRole("link", { name: "Crossing Jeju by bicycle" }).last();
  await expect(video).toBeVisible();
  await video.click();
  await expect(page).toHaveURL(/\/watch\//);
  await expect(page.getByText("HOME · SINGLE", { exact: true })).toBeVisible();
  await expect(page.getByText("Wind, volcanic roads, and one very long afternoon.", { exact: true })).toBeVisible();
});

test("Series is a separate primary service with episodic work detail", async ({ page }) => {
  await page.goto("/series");
  await expect(page.getByRole("heading", { name: "작품으로 만나는 이야기" })).toBeVisible();
  await page.getByRole("link", { name: /손으로 만드는 도시/ }).click();
  await expect(page).toHaveURL(/\/series\//);
  await expect(page.getByRole("heading", { name: "에피소드" })).toBeVisible();
  await expect(page.getByText("서울의 마지막 활판 인쇄공")).toBeVisible();
  await expect(page.getByText("흙이 그릇이 되는 시간")).toBeVisible();
});
