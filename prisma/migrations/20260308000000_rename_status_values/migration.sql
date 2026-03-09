-- Rename APPLIED → FOLLOWED_UP first (so APPLIED slot is free)
ALTER TYPE "Status" RENAME VALUE 'APPLIED' TO 'FOLLOWED_UP';

-- Rename SAVED → APPLIED
ALTER TYPE "Status" RENAME VALUE 'SAVED' TO 'APPLIED';

-- Update default value on Job table
ALTER TABLE "Job" ALTER COLUMN "status" SET DEFAULT 'APPLIED';
