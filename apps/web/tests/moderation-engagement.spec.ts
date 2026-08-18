import { expect, test } from "@playwright/test";

const reportId = "99000000-0000-4000-8000-000000000001";
const report = {
  id: reportId,
  reason: "SPAM",
  details: "반복적으로 무관한 링크를 게시합니다.",
  status: "OPEN",
  createdAt: "2026-08-18T00:00:00.000Z",
  updatedAt: "2026-08-18T00:00:00.000Z",
  reporter: {
    id: "10000000-0000-4000-8000-000000000001",
    handle: "reporter",
    displayName: "Reporter",
    avatarUrl: null,
  },
  target: {
    type: "COMMUNITY_POST",
    id: "90000000-0000-4000-8000-000000000001",
  },
  moderationStatus: "ACTIVE",
  content: {
    title: null,
    body: "신고된 Community Post 본문",
    author: {
      id: "10000000-0000-4000-8000-000000000002",
      handle: "creator",
      displayName: "Creator",
      avatarUrl: null,
    },
  },
};

test("moderator reviews and removes a reported product with audit history", async ({
  page,
}) => {
  let detail = { ...report, audit: [] as Array<Record<string, unknown>> };
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({ status: 200, json: { role: "MODERATOR" } }),
  );
  await page.route("**/api/v1/moderation/reports?status=OPEN", (route) =>
    route.fulfill({ status: 200, json: { items: [report], nextCursor: null } }),
  );
  await page.route(`**/api/v1/moderation/reports/${reportId}`, (route) =>
    route.fulfill({ status: 200, json: detail }),
  );
  await page.route(
    `**/api/v1/moderation/reports/${reportId}/review`,
    (route) => {
      detail = {
        ...detail,
        status: "REVIEWING",
        audit: [
          {
            id: "98000000-0000-4000-8000-000000000001",
            action: "REVIEW_STARTED",
            previousStatus: "OPEN",
            resultingStatus: "REVIEWING",
            note: "검토 시작",
            createdAt: "2026-08-18T00:01:00.000Z",
            actor: report.reporter,
          },
        ],
      };
      return route.fulfill({ status: 201, json: detail });
    },
  );
  await page.route(
    `**/api/v1/moderation/reports/${reportId}/remove-content`,
    (route) => {
      detail = {
        ...detail,
        status: "RESOLVED",
        moderationStatus: "REMOVED",
        audit: [
          ...detail.audit,
          {
            id: "98000000-0000-4000-8000-000000000002",
            action: "CONTENT_REMOVED",
            previousStatus: "REVIEWING",
            resultingStatus: "RESOLVED",
            note: "정책 위반 제거",
            createdAt: "2026-08-18T00:02:00.000Z",
            actor: report.reporter,
          },
        ],
      };
      return route.fulfill({ status: 201, json: detail });
    },
  );

  await page.goto("/admin/moderation");
  await expect(page.getByRole("heading", { name: "신고 검토" })).toBeVisible();
  await page.getByText("신고된 Community Post 본문").click();
  await page.getByLabel("처리 메모").fill("검토 시작");
  await page.getByRole("button", { name: "검토 시작" }).click();
  await expect(page.getByText("REVIEWING", { exact: true })).toBeVisible();
  await page.getByLabel("처리 메모").fill("정책 위반 제거");
  await page.getByRole("button", { name: "콘텐츠 공개 제거" }).click();
  await expect(page.getByRole("alertdialog", { name: "콘텐츠 공개 제거 확인" })).toBeVisible();
  await page.getByRole("button", { name: "제거 확인" }).click();
  await expect(page.getByText("RESOLVED", { exact: true })).toBeVisible();
  await expect(page.getByText("CONTENT_REMOVED")).toBeVisible();
});

test("member does not receive moderation controls", async ({ page }) => {
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({ status: 200, json: { role: "MEMBER" } }),
  );
  await page.goto("/admin/moderation");
  await expect(
    page.getByText("MODERATOR 또는 ADMIN 권한이 필요합니다.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "콘텐츠 공개 제거" })).toHaveCount(0);
});

test("Home engagement controls send the authoritative product ID", async ({ page }) => {
  const productId = "50000000-0000-4000-8000-000000000001";
  let called = "";
  await page.route(`**/api/v1/engagement/HOME_VIDEO/${productId}/like`, (route) => {
    called = route.request().url();
    return route.fulfill({ status: 200, json: { liked: true, likeCount: 1 } });
  });
  await page.goto(`/watch/home/${productId}`);
  await page.getByRole("button", { name: /좋아요/ }).click();
  await expect.poll(() => called).toContain(`/engagement/HOME_VIDEO/${productId}/like`);
});
