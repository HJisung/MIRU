import { expect, test } from "@playwright/test";

test("a visitor can explore the feed and open a post", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "오늘의 발견" })).toBeVisible();
  const firstPost = page.getByRole("link", { name: /The city gets softer/ }).last();
  await expect(firstPost).toBeVisible();
  await page.goto((await firstPost.getAttribute("href")) ?? "/");
  await expect(page.getByText("The city gets softer just before everyone wakes up.", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "둘러보기로 돌아가기" })).toBeVisible();
});
