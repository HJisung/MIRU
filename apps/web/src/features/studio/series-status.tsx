import type { ManagedSeries, SeriesSubmission } from "@stream/api-contract";

const labels: Record<string, string> = {
  DRAFT: "심사 신청 전",
  SUBMITTED: "심사 중",
  REJECTED: "반려됨",
  WITHDRAWN: "철회됨",
  APPROVED: "승인됨",
  PUBLISHED: "공개 중",
  PENDING_REVIEW: "심사 중",
};

export function seriesStatus(series: ManagedSeries) {
  return series.publicationStatus === "PUBLISHED"
    ? "공개 중"
    : (labels[series.latestSubmission?.status ?? series.publicationStatus] ??
        series.publicationStatus);
}

export function nextAction(series: ManagedSeries) {
  if (series.publicationStatus === "PUBLISHED") return "공개 상태 관리";
  switch (series.latestSubmission?.status) {
    case "SUBMITTED":
      return "관리자 검토를 기다리고 있습니다.";
    case "REJECTED":
      return "반려 사유를 반영한 뒤 다시 제출하세요.";
    case "APPROVED":
      return series.hasPlayableContent
        ? "공개할 준비가 되었습니다."
        : "영상 콘텐츠를 연결하세요.";
    default:
      return "작품 정보를 확인하고 심사를 신청하세요.";
  }
}

export function StatusBadge({ series }: { series: ManagedSeries }) {
  return (
    <span className="rounded-full border border-line bg-panel px-3 py-1 text-xs font-semibold text-muted">
      {seriesStatus(series)}
    </span>
  );
}

export function Decision({ submission }: { submission?: SeriesSubmission }) {
  if (!submission?.decisionReason) return null;
  return (
    <p className="mt-3 rounded-xl bg-accent-soft px-4 py-3 text-sm text-ink">
      <strong>심사 의견</strong> · {submission.decisionReason}
    </p>
  );
}
