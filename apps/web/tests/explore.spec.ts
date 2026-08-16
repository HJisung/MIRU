import { expect, test } from "@playwright/test";

test("a visitor opens a Home Single from the Home service", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "홈 분류" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /두 바퀴로 만나는 섬 Collection/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "색상 모드 전환" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  const uploadContrast = await page
    .getByRole("link", { name: /업로드/ })
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, foreground: style.color };
    });
  expect(uploadContrast.background).not.toBe(uploadContrast.foreground);
  const video = page
    .getByRole("link", { name: "Crossing Jeju by bicycle" })
    .last();
  await expect(video).toBeVisible();
  await video.click();
  await expect(page).toHaveURL(/\/watch\//);
  await expect(page.getByText("HOME · SINGLE", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Wind, volcanic roads, and one very long afternoon.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("Series is a separate primary service with episodic work detail", async ({
  page,
}) => {
  await page.goto("/series");
  await expect(
    page.getByRole("navigation", { name: "시리즈 분류" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "손으로 만드는 도시" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "손으로 만드는 도시" }).first().click();
  await expect(page).toHaveURL(/\/series\//);
  await expect(page.getByRole("heading", { name: "에피소드" })).toBeVisible();
  await expect(page.getByText("서울의 마지막 활판 인쇄공")).toBeVisible();
  await expect(page.getByText("흙이 그릇이 되는 시간")).toBeVisible();
});

test("Shortform renders video and a navigable image carousel from its explicit domain", async ({
  page,
}) => {
  await page.goto("/shorts");
  await expect(page.getByText("조용한 서울의 아침")).toBeVisible();
  await expect(page.getByText("1 / 2")).toBeVisible();
  await page.getByRole("button", { name: "다음 이미지" }).click();
  await expect(page.getByText("2 / 2")).toBeVisible();
  await expect(page.getByRole("link", { name: "본편 보기 · 손으로 만드는 도시" })).toHaveAttribute("href", /\/series\//);
});

test("Post Home and a managed Category are distinct community timelines", async ({
  page,
}) => {
  await page.goto("/posts");
  await expect(
    page.getByRole("link", { name: "Post Home", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("The city gets softer just before everyone wakes up."),
  ).toBeVisible();
  await expect(
    page.getByText("도메인을 명확하게 나누면 코드를 따라가기 쉬워집니다."),
  ).toHaveCount(0);

  await page.goto("/posts/c/develop");
  await expect(page).toHaveURL(/\/posts\/c\/develop/);
  await expect(
    page.getByText("도메인을 명확하게 나누면 코드를 따라가기 쉬워집니다."),
  ).toBeVisible();
  await expect(
    page.getByText("The city gets softer just before everyone wakes up."),
  ).toHaveCount(0);
});
