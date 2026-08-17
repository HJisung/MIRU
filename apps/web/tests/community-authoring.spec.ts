import { expect, test, type Page } from "@playwright/test";
import { resolve } from "node:path";

async function signIn(page: Page, prefix: string) {
  const suffix = crypto.randomUUID().slice(0, 8);
  const response = await page.request.post(
    "http://localhost:4000/api/v1/auth/register",
    {
      data: {
        email: `${prefix}_${suffix}@example.test`,
        handle: `${prefix.slice(0, 8)}_${suffix}`,
        displayName: "Community Browser",
        password: "correct-horse-battery-staple",
      },
    },
  );
  expect(response.status()).toBe(201);
  const cookie = response.headers()["set-cookie"]?.split(";")[0];
  expect(cookie).toBeTruthy();
  const separator = cookie!.indexOf("=");
  await page.context().addCookies([
    {
      name: cookie!.slice(0, separator),
      value: cookie!.slice(separator + 1),
      domain: "localhost",
      path: "/",
    },
  ]);
}

test("a member publishes TEXT and LINK Posts from the composer", async ({
  page,
}) => {
  await signIn(page, "post_text");
  const text = `브라우저 텍스트 ${crypto.randomUUID().slice(0, 8)}`;
  await page.goto("/create");
  await expect(page.getByRole("heading", { name: "Post 만들기" })).toBeVisible();
  await page.getByLabel("본문 (필수)").fill(`${text}\n둘째 줄`);
  await page.getByRole("button", { name: "게시하기" }).click();
  await expect(page).toHaveURL(/\/posts\/[0-9a-f-]+$/);
  await expect(page.getByText(text, { exact: false })).toBeVisible();

  await page.goto("/create?category=develop");
  await page.getByRole("tab", { name: "링크" }).click();
  await expect(page.getByLabel("카테고리")).toHaveValue("develop");
  await page.getByLabel("본문").fill("안전한 외부 링크");
  await page.getByLabel("외부 링크").fill("https://example.com/resource");
  await page.getByRole("button", { name: "게시하기" }).click();
  await expect(page.getByRole("link", { name: /example\.com/ })).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );
});

test("the proven direct IMAGE upload publishes through the unified composer", async ({
  page,
}) => {
  await signIn(page, "post_image");
  await page.goto("/create");
  await page.getByRole("tab", { name: "이미지" }).click();
  await page.locator('input[type="file"]').setInputFiles(
    resolve(process.cwd(), "public/demo/dawn-city.png"),
  );
  await page.getByLabel("본문").fill("브라우저 이미지 Post");
  await page.getByRole("button", { name: "게시하기" }).click();
  await expect(page).toHaveURL(/\/posts\/[0-9a-f-]+$/, { timeout: 30_000 });
  await expect(page.getByRole("img", { name: "브라우저 이미지 Post" })).toBeVisible();
});

test("VIDEO composer exposes recoverable processing and publishing stages", async ({
  page,
}) => {
  const postId = crypto.randomUUID();
  const assetId = crypto.randomUUID();
  await page.route("http://localhost:4000/api/v1/community-categories", (route) =>
    route.fulfill({ status: 200, json: { items: [] } }),
  );
  await page.route("http://localhost:4000/api/v1/media/video-uploads", (route) =>
    route.fulfill({
      status: 201,
      json: {
        assetId,
        uploadUrl: "http://storage.test/upload",
        requiredHeaders: { "content-type": "video/mp4" },
      },
    }),
  );
  await page.route("http://storage.test/upload", (route) =>
    route.fulfill({ status: 200 }),
  );
  await page.route(
    `http://localhost:4000/api/v1/media/video-assets/${assetId}/complete`,
    (route) => route.fulfill({ status: 200, json: { id: assetId, status: "UPLOADED" } }),
  );
  await page.route(
    `http://localhost:4000/api/v1/media/video-assets/${assetId}/status`,
    (route) => route.fulfill({ status: 200, json: { id: assetId, status: "READY" } }),
  );
  await page.route("http://localhost:4000/api/v1/community-posts/video", (route) =>
    route.fulfill({ status: 201, json: { id: postId } }),
  );
  await page.goto("/create");
  await page.getByRole("tab", { name: "동영상" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "fixture.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("browser-fixture"),
  });
  await page.getByLabel("본문").fill("브라우저 동영상 Post");
  await page.getByRole("button", { name: "게시하기" }).click();
  await expect(page).toHaveURL(new RegExp(`/posts/${postId}$`));
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("miru:pending-community-video")))
    .toBeNull();
});

test("an author edits and archives a Post while another member is denied", async ({
  page,
}) => {
  await signIn(page, "post_manage");
  await page.goto("/create");
  await page.getByLabel("본문 (필수)").fill("관리 전 본문");
  await page.getByRole("button", { name: "게시하기" }).click();
  await expect(page).toHaveURL(/\/posts\/[0-9a-f-]+$/);
  const postId = page.url().split("/").pop()!;
  await page.goto("/posts/manage");
  const card = page.locator("form").filter({ hasText: "관리 전 본문" });
  await card.locator("textarea").fill("관리 후 본문");
  await card.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("수정했습니다.")).toBeVisible();

  const otherContext = await page.context().browser()!.newContext();
  const otherPage = await otherContext.newPage();
  await signIn(otherPage, "post_other");
  const denied = await otherPage.request.patch(
    `http://localhost:4000/api/v1/community-posts/${postId}`,
    { data: { body: "탈취" } },
  );
  expect(denied.status()).toBe(404);
  await otherContext.close();

  await page
    .locator("form")
    .filter({ hasText: "관리 후 본문" })
    .getByRole("button", { name: "보관" })
    .click();
  await expect(page.getByText("보관 처리했습니다.")).toBeVisible();
  const publicResponse = await page.goto(`/posts/${postId}`);
  expect(publicResponse?.status()).toBe(404);
});
