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
  await expect(page).toHaveURL(/\/watch\/home\//);
  await expect(page.getByText("HOME · SINGLE", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Wind, volcanic roads, and one very long afternoon.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("a SINGLE_WORK Series plays without a fake episode", async ({ page }) => {
  await page.goto("/series/40000000-0000-4000-8000-000000000002");
  await expect(page.getByText("SINGLE WORK", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "작품 재생" }).click();
  await expect(page).toHaveURL(/\/watch\/series\//);
  await expect(page.getByText("SERIES · SINGLE WORK")).toBeVisible();
});

test("Series is a separate primary service with episodic work detail", async ({
  page,
}) => {
  await page.goto("/series");
  await expect(
    page.getByRole("navigation", { name: "시리즈 분류" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "손으로 만드는 도시" }).first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "손으로 만드는 도시" }).first().click();
  await expect(page).toHaveURL(/\/series\//);
  await expect(page.getByRole("heading", { name: "에피소드" })).toBeVisible();
  await expect(page.getByText("서울의 마지막 활판 인쇄공")).toBeVisible();
  await expect(page.getByText("흙이 그릇이 되는 시간")).toBeVisible();
});

test("Shortform episode promotion uses the product episode route", async ({
  page,
}) => {
  await page.goto("/shorts");
  const link = page.getByRole("link", {
    name: "본편 보기 · 흙이 그릇이 되는 시간",
  });
  await expect(link).toHaveAttribute("href", /\/watch\/episode\//);
});

test("Shortform renders video and a navigable image carousel from its explicit domain", async ({
  page,
}) => {
  await page.goto("/shorts");
  await expect(page.getByText("조용한 서울의 아침")).toBeVisible();
  await expect(page.getByText("1 / 2")).toBeVisible();
  await page.getByRole("button", { name: "다음 이미지" }).click();
  await expect(page.getByText("2 / 2")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "본편 보기 · 손으로 만드는 도시" }),
  ).toHaveAttribute("href", /\/series\//);
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

test("creation surface exposes the Home video upload flow", async ({
  page,
}) => {
  await page.goto("/create?type=video");
  await expect(
    page.getByRole("heading", { name: "Home 영상 업로드" }),
  ).toBeVisible();
  await expect(page.getByText(/MP4, MOV, WebM · 최대 500MB/)).toBeVisible();
});

test("video creation surfaces reuse recoverable processing state", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "miru:pending-home-video",
      JSON.stringify({
        assetId: crypto.randomUUID(),
        draftId: crypto.randomUUID(),
      }),
    );
  });
  await page.goto("/create?type=video");
  await expect(
    page.getByRole("button", { name: "처리 상태 다시 확인" }),
  ).toBeVisible();

  await page.goto("/create?type=series-single");
  await expect(
    page.getByRole("heading", { name: "Series SINGLE_WORK 영상 연결" }),
  ).toBeVisible();
  await page.goto("/create?type=series-episode");
  await expect(
    page.getByRole("heading", { name: "Series Episode 업로드" }),
  ).toBeVisible();
  await page.goto("/create?type=shortform-video");
  await expect(
    page.getByRole("heading", { name: "Shortform VIDEO 업로드" }),
  ).toBeVisible();
});

test("Episode and Shortform resume publishing from an existing product", async ({
  page,
}) => {
  for (const workflow of [
    {
      mode: "series-episode",
      pageType: "series-episode",
      productId: "50000000-0000-4000-8000-000000000001",
      publishPath: "/series/episodes/",
    },
    {
      mode: "shortform",
      pageType: "shortform-video",
      productId: "60000000-0000-4000-8000-000000000001",
      publishPath: "/shortforms/",
    },
  ]) {
    let createRequests = 0;
    let publishRequests = 0;
    await page.addInitScript((value) => {
      localStorage.setItem(
        `miru:pending-${value.mode}`,
        JSON.stringify({
          assetId: "70000000-0000-4000-8000-000000000001",
          mode: value.mode,
          phase: "PRODUCT_CREATED",
          productId: value.productId,
          description: "recover me",
        }),
      );
    }, workflow);
    await page.route("http://localhost:4000/api/v1/**", async (route) => {
      const url = route.request().url();
      if (url.includes(workflow.publishPath + workflow.productId)) {
        publishRequests += 1;
        await route.fulfill({ status: 200, json: {} });
      } else {
        createRequests += 1;
        await route.fulfill({ status: 500, json: {} });
      }
    });
    await page.goto(`/create?type=${workflow.pageType}`);
    await page.getByRole("button", { name: "생성 작업 계속하기" }).click();
    await expect.poll(() => publishRequests).toBe(1);
    expect(createRequests).toBe(0);
    await page.unroute("http://localhost:4000/api/v1/**");
  }
});

test("SINGLE_WORK only opens watch when the Series is public", async ({
  page,
}) => {
  const seriesId = "40000000-0000-4000-8000-000000000099";
  async function prepare(status: "DRAFT" | "PUBLISHED") {
    await page.addInitScript(
      ({ seriesId }) => {
        localStorage.setItem(
          "miru:pending-series-single",
          JSON.stringify({
            assetId: "70000000-0000-4000-8000-000000000099",
            mode: "series-single",
            phase: "MEDIA_READY",
            seriesId,
            description: "",
          }),
        );
      },
      { seriesId, status },
    );
    await page.route(
      `http://localhost:4000/api/v1/series/${seriesId}/single-work/video`,
      (route) => route.fulfill({ status: 200, json: { id: seriesId, status } }),
    );
  }

  await prepare("DRAFT");
  await page.goto("/create?type=series-single");
  await page.getByRole("button", { name: "생성 작업 계속하기" }).click();
  await expect(page).toHaveURL(/type=series-single/);
  await expect(page.getByText(/Series가 공개되기 전까지/)).toBeVisible();

  await page.unrouteAll({ behavior: "wait" });
  await prepare("PUBLISHED");
  await page.goto("/create?type=series-single");
  await page.getByRole("button", { name: "생성 작업 계속하기" }).click();
  await expect(page).toHaveURL(new RegExp(`/watch/series/${seriesId}`));
});

test("Shortform overlays preserve intentional player and action pointer targets", async ({
  page,
}) => {
  await page.goto("/shorts");
  await expect(page.getByRole("button", { name: "공유" }).first()).toBeVisible();
  await page.getByRole("button", { name: "공유" }).first().click();
  const gradient = page.locator(".pointer-events-none.bg-gradient-to-t").first();
  await expect(gradient).toHaveCSS("pointer-events", "none");
  await expect(
    page.getByRole("link", { name: /본편 보기/ }).first(),
  ).toHaveCSS("pointer-events", "auto");
});
