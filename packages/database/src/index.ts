import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

export { PrismaClient };
export {
  MediaKind,
  MediaPurpose,
  MediaStatus,
  PostFormat,
  PostStatus,
  PostVisibility,
  UserRole,
  ReportReason,
  ReportStatus,
  DomainPublicationStatus,
  SeriesWorkType,
  SeriesSubmissionStatus,
  ShortFormType,
  CommunityPostType,
  PlaylistVisibility,
} from "./generated/prisma/enums.js";

export function createDatabaseClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export type DatabaseClient = ReturnType<typeof createDatabaseClient>;
