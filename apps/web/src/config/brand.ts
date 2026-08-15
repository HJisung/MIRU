export const brand = {
  name: "miru",
  displayName: "miru",
  tagline: "보고, 나누고, 머무는 곳",
  description: "롱폼 영상, 숏폼, 사진과 이야기를 한곳에서 발견하세요.",
  assets: {
    lockupDark: "/MIRU_LOGO/MIRU_BLACK_LOOKUP.png",
    lockupLight: "/MIRU_LOGO/MIRU_WHITE_LOOKUP.png",
    appIcon: "/MIRU_LOGO/MIRU_APP_BLACK.png",
  },
} as const;

export type BrandToken = typeof brand;
