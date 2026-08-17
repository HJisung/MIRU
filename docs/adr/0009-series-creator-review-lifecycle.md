# ADR 0009: Series creator review and publication lifecycle

- Status: Accepted
- Date: 2026-08-18

## Decision

Creator Studio is an authenticated use-case boundary over the existing Series
domain, not a new content model. A creator owns Series drafts and submits a new
`SeriesSubmission` review attempt. Submission changes the Series publication
status from `DRAFT` to `PENDING_REVIEW` and locks metadata until the creator
withdraws or an administrator decides it.

Review attempts are append-only history. Withdrawal changes the active attempt
to `WITHDRAWN`; rejection records `REJECTED`, reviewer, reason, and timestamp;
both return the Series to `DRAFT` for editing and resubmission. Approval records
the same evidence as `APPROVED` and grants content-management eligibility.
Approved metadata remains locked in the draft editor. A PostgreSQL partial
unique index permits only one `SUBMITTED` attempt per Series while retaining all
prior attempts.

Review approval, media readiness, and public visibility remain distinct.
Creator-owned Series require an approved submission before publication.
Administrator-owned Series may use the same explicit publication operation
without a submission.

`SINGLE_WORK` publication requires its direct playback asset to be READY.
`EPISODIC` publication requires at least one episode draft with a READY asset.
The Series shell is then published first, after which existing episode publish
operations can make individual episodes public. This removes the previous
parent/episode circular dependency without exposing draft episodes.

After approval, EPISODIC content management remains inside the Series domain.
Seasons are optional. Global `episodeNumber` is unique and canonical across the
Series; non-null `seasonEpisodeNumber` is unique within a Season. Series-wide
reorder takes a transaction-scoped Series lock and moves every Episode through
collision-free temporary positive numbers before assigning the final sequence.
Published Episode metadata corrections update the compatibility publication
projection in the same transaction.

Episode unpublish clears both domain and compatibility publication timestamps
and status without deleting the Episode, media, or playback claim. It is
rejected when it would leave a published EPISODIC Series with no published
Episodes. Video replacement is intentionally deferred until claim release and
reclaim behavior is designed.

## Consequences

- Public Series reads continue to filter strictly to `PUBLISHED`.
- A creator cannot mutate reviewed metadata or another creator's draft.
- Repeated and concurrent submission requests are idempotent at the database
  boundary.
- Creator Studio and administrator review APIs do not expose compatibility
  `LegacyPublication` identifiers.
- Changing work type is rejected after single-work media or episodes exist;
  content is never deleted implicitly.
