-- A label's colour is now any hex the picker produces, not a key into a fixed
-- palette. Nothing has been created under the old scheme yet, so only the
-- default needs moving (to slate 500, what 'slate' used to mean).
ALTER TABLE "PlanLabel" ALTER COLUMN "colour" SET DEFAULT '#64748b';
UPDATE "PlanLabel" SET "colour" = '#64748b' WHERE "colour" !~ '^#[0-9a-fA-F]{6}$';
