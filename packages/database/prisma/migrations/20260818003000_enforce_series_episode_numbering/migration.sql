-- Episode numbers are positive product order values.
ALTER TABLE "SeriesEpisode"
ADD CONSTRAINT "SeriesEpisode_episodeNumber_positive"
CHECK ("episodeNumber" > 0);

ALTER TABLE "SeriesEpisode"
ADD CONSTRAINT "SeriesEpisode_seasonEpisodeNumber_valid"
CHECK (
  "seasonEpisodeNumber" IS NULL
  OR ("seasonId" IS NOT NULL AND "seasonEpisodeNumber" > 0)
);

-- PostgreSQL permits multiple NULL values, so unseasoned episodes remain valid.
CREATE UNIQUE INDEX "SeriesEpisode_seasonId_seasonEpisodeNumber_key"
ON "SeriesEpisode" ("seasonId", "seasonEpisodeNumber");
