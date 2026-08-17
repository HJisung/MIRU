import { expect, test } from "@playwright/test";

const seriesId = "40000000-0000-4000-8000-000000000099";
const submissionId = "71000000-0000-4000-8000-000000000099";

function managed(status?: "SUBMITTED" | "REJECTED" | "APPROVED") {
  const submission = status
    ? {
        id: submissionId,
        status,
        submittedAt: "2026-08-18T00:00:00.000Z",
        reviewedAt: status === "SUBMITTED" ? null : "2026-08-18T01:00:00.000Z",
        decisionReason:
          status === "REJECTED"
            ? "시놉시스를 더 구체적으로 작성해 주세요."
            : null,
        reviewer: null,
      }
    : null;
  return {
    id: seriesId,
    title: "브라우저에서 만든 작품",
    synopsis: "Creator Studio 브라우저 흐름을 검증합니다.",
    description: "",
    workType: "SINGLE_WORK",
    publicationStatus: status === "SUBMITTED" ? "PENDING_REVIEW" : "DRAFT",
    genres: ["영화"],
    tags: [],
    ageRating: null,
    productionInfo: null,
    releaseDate: null,
    hasPlayableContent: false,
    canManageContent: status === "APPROVED",
    createdAt: "2026-08-18T00:00:00.000Z",
    updatedAt: "2026-08-18T00:00:00.000Z",
    submissions: submission ? [submission] : [],
    latestSubmission: submission,
  };
}

test("creator creates a Series draft and submits it from Studio", async ({
  page,
}) => {
  let state = managed();
  await page.route("http://localhost:4000/api/v1/series", async (route) => {
    await route.fulfill({ status: 201, json: state });
  });
  await page.route(
    `http://localhost:4000/api/v1/series/${seriesId}/manage`,
    async (route) => route.fulfill({ status: 200, json: state }),
  );
  await page.route(
    `http://localhost:4000/api/v1/series/${seriesId}/submissions`,
    async (route) => {
      state = managed("SUBMITTED");
      await route.fulfill({ status: 200, json: state.latestSubmission });
    },
  );

  await page.goto("/studio/series/new");
  await page.getByLabel("제목").fill("브라우저에서 만든 작품");
  await page
    .getByLabel("시놉시스")
    .fill("Creator Studio 브라우저 흐름을 검증합니다.");
  await page.getByRole("button", { name: "초안 저장" }).click();
  await expect(page).toHaveURL(new RegExp(`/studio/series/${seriesId}`));
  await page.getByRole("button", { name: "심사 신청" }).click();
  await expect(
    page.getByText("심사 중", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("관리자 검토를 기다리고 있습니다."),
  ).toBeVisible();
});

test("administrator reviews a submitted Series", async ({ page }) => {
  const submitted = managed("SUBMITTED");
  const review = {
    ...submitted.latestSubmission,
    applicant: {
      id: "10000000-0000-4000-8000-000000000099",
      handle: "browser.creator",
      displayName: "브라우저 크리에이터",
      avatarUrl: null,
    },
    series: submitted,
  };
  await page.route("**/api/v1/admin/series-submissions", (route) =>
    route.fulfill({ status: 200, json: { items: [review] } }),
  );
  await page.route(
    `**/api/v1/admin/series-submissions/${submissionId}/reject`,
    (route) =>
      route.fulfill({ status: 200, json: { ...review, status: "REJECTED" } }),
  );
  await page.goto("/admin/series-reviews");
  await expect(
    page.getByRole("heading", { name: "Series 심사" }),
  ).toBeVisible();
  await page
    .getByLabel("심사 의견")
    .fill("시놉시스를 더 구체적으로 작성해 주세요.");
  await page.getByRole("button", { name: "반려" }).click();
});

test("creator sees the durable review decision", async ({ page }) => {
  await page.route(
    `http://localhost:4000/api/v1/series/${seriesId}/manage`,
    (route) => route.fulfill({ status: 200, json: managed("REJECTED") }),
  );
  await page.goto(`/studio/series/${seriesId}`);
  await expect(page.getByText("반려됨", { exact: true })).toBeVisible();
  await expect(page.getByText(/시놉시스를 더 구체적으로/)).toBeVisible();
});

test("unauthenticated Studio access shows a login path", async ({ page }) => {
  await page.route("**/api/v1/series/mine", (route) =>
    route.fulfill({
      status: 401,
      json: { message: "Authentication required" },
    }),
  );
  await page.goto("/studio/series");
  await expect(page.getByRole("link", { name: "로그인하기" })).toBeVisible();
});

test("MEMBER admin access shows a denial path", async ({ page }) => {
  await page.route("**/api/v1/admin/series-submissions", (route) =>
    route.fulfill({
      status: 403,
      json: { message: "Administrator role required" },
    }),
  );
  await page.goto("/admin/series-reviews");
  await expect(
    page.getByRole("alert").filter({ hasText: "Administrator role required" }),
  ).toBeVisible();
});

test("public visitor receives not found for an unpublished Series", async ({
  page,
}) => {
  const response = await page.goto(`/series/${seriesId}`, {
    waitUntil: "commit",
  });
  expect(response?.status()).toBe(404);
});
