DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "CommunityPostMedia"
    GROUP BY "assetId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Cannot enforce single Community media ownership: duplicate CommunityPostMedia.assetId values exist',
      HINT = 'Resolve duplicate Community media ownership before applying the unique-index migration.';
  END IF;
END $$;
