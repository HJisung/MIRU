-- Retain review history while allowing only one active review per Series.
CREATE UNIQUE INDEX "SeriesSubmission_one_active_review_per_series"
ON "SeriesSubmission" ("seriesId")
WHERE "status" = 'SUBMITTED';
