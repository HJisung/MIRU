import { expect, test } from "@playwright/test";

const homeId = "50000000-0000-4000-8000-000000000071";
const episodeId = "70000000-0000-4000-8000-000000000071";
const shortformId = "90000000-0000-4000-8000-000000000071";
const playlistId = "a0000000-0000-4000-8000-000000000071";
const firstItemId = "a1000000-0000-4000-8000-000000000071";
const secondItemId = "a1000000-0000-4000-8000-000000000072";

const home = {
  id: homeId,
  type: "HOME_VIDEO",
  title: "Native Home 영상",
  caption: "Legacy publication 없이 탐색됩니다.",
  publishedAt: "2026-08-19T01:00:00.000Z",
  likeCount: 4,
  commentCount: 1,
  engagementTarget: { type: "HOME_VIDEO", id: homeId },
  author: {
    id: "10000000-0000-4000-8000-000000000071",
    handle: "native",
    displayName: "Native Creator",
    avatarUrl: null,
  },
  media: [
    {
      id: "20000000-0000-4000-8000-000000000071",
      url: "/demo/dawn-city.png",
      posterUrl: null,
      mimeType: "image/png",
      width: 1600,
      height: 900,
      durationMs: 1000,
    },
  ],
  series: null,
};

const episode = {
  ...home,
  id: episodeId,
  type: "SERIES_EPISODE",
  title: "Native Episode",
  engagementTarget: { type: "SERIES_EPISODE", id: episodeId },
  series: {
    id: "40000000-0000-4000-8000-000000000071",
    title: "Native Series",
    episodeNumber: 2,
    episodeCount: 4,
  },
};

const shortform = {
  ...home,
  id: shortformId,
  type: "SHORTFORM",
  title: "Native Shortform",
  engagementTarget: { type: "SHORTFORM", id: shortformId },
  media: [{ ...home.media[0], mimeType: "video/mp4" }],
};

test("native discovery and following cards use canonical product routes", async ({
  page,
}) => {
  await page.route("**/api/v1/feed/discovery", (route) =>
    route.fulfill({
      status: 200,
      json: { items: [home, episode, shortform], nextCursor: null },
    }),
  );
  await page.route("**/api/v1/feed/following", (route) =>
    route.fulfill({
      status: 200,
      json: { items: [episode], nextCursor: null },
    }),
  );

  await page.goto("/discover");
  await expect(page.getByRole("heading", { name: "MIRU 탐색" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Native Home 영상", exact: true }),
  ).toHaveAttribute("href", `/watch/home/${homeId}`);
  await expect(
    page.getByRole("link", { name: "Native Episode", exact: true }),
  ).toHaveAttribute("href", `/watch/episode/${episodeId}`);
  await expect(
    page.getByRole("link", { name: "Native Shortform", exact: true }),
  ).toHaveAttribute("href", `/shorts/${shortformId}`);
  await page.getByRole("tab", { name: "팔로잉" }).click();
  await expect(
    page.getByRole("link", { name: "Native Episode", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Native Home 영상", exact: true }),
  ).toHaveCount(0);
});

test("viewer adds a typed product to a Playlist from discovery", async ({
  page,
}) => {
  let received: unknown;
  await page.route("**/api/v1/feed/discovery", (route) =>
    route.fulfill({ status: 200, json: { items: [home], nextCursor: null } }),
  );
  await page.route("**/api/v1/playlists/me", (route) =>
    route.fulfill({
      status: 200,
      json: {
        items: [
          {
            id: playlistId,
            title: "나중에 볼 영상",
            description: "",
            visibility: "PRIVATE",
            items: [],
          },
        ],
      },
    }),
  );
  await page.route(`**/api/v1/playlists/${playlistId}/items`, async (route) => {
    received = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: {} });
  });
  await page.goto("/discover");
  await page
    .getByRole("button", { name: "Native Home 영상 Playlist에 추가" })
    .click();
  await page.getByRole("button", { name: "나중에 볼 영상" }).click();
  await expect(page.getByRole("status")).toHaveText("Playlist에 추가했습니다.");
  expect(received).toEqual({ type: "HOME_VIDEO", id: homeId });
});

test("owner creates, reorders, and removes native Playlist items", async ({
  page,
}) => {
  const items = [
    {
      id: firstItemId,
      position: 1,
      available: true,
      target: { type: "HOME_VIDEO", id: homeId },
      title: "첫 영상",
      href: `/watch/home/${homeId}`,
    },
    {
      id: secondItemId,
      position: 2,
      available: false,
      target: { type: "SERIES_EPISODE", id: episodeId },
      title: null,
      href: null,
    },
  ];
  let orderBody: unknown;
  let removed = false;
  await page.route(`**/api/v1/playlists/${playlistId}/manage`, (route) =>
    route.fulfill({
      status: 200,
      json: {
        id: playlistId,
        title: "정리함",
        description: "Native items",
        visibility: "PRIVATE",
        items,
      },
    }),
  );
  await page.route(
    `**/api/v1/playlists/${playlistId}/items/order`,
    async (route) => {
      orderBody = route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        json: {
          id: playlistId,
          title: "정리함",
          description: "Native items",
          visibility: "PRIVATE",
          items: [items[1], items[0]],
        },
      });
    },
  );
  await page.route(
    `**/api/v1/playlists/${playlistId}/items/${firstItemId}`,
    (route) => {
      removed = true;
      return route.fulfill({
        status: 200,
        json: {
          id: playlistId,
          title: "정리함",
          description: "Native items",
          visibility: "PRIVATE",
          items: [items[1]],
        },
      });
    },
  );
  await page.goto(`/playlists/${playlistId}`);
  await expect(page.getByRole("heading", { name: "정리함" })).toBeVisible();
  await expect(page.getByText("현재 볼 수 없는 콘텐츠")).toBeVisible();
  await page.getByRole("button", { name: "첫 영상 아래로" }).click();
  await expect
    .poll(() => orderBody)
    .toEqual({ itemIds: [secondItemId, firstItemId] });
  await page.getByRole("button", { name: "첫 영상 삭제" }).click();
  await expect.poll(() => removed).toBe(true);
  await expect(page.getByText("첫 영상")).toHaveCount(0);
});
