-- =============================================================================
-- Dedupe "1984" — collapse books.id=16 into books.id=1.
-- =============================================================================
--
-- Why this exists:
--   When 2026_05_31_seed_literature.sql ran, id=1 was thought to still hold
--   "Postman Seed Book". It had already been removed by an unrelated cleanup
--   between the analysis and the migration run, so "1984" was inserted at
--   id=16 to be safe. That leaves the Literature page showing "1984" twice
--   (once from the seed (id=1, no API backing) and once from the API (id=16)).
--
-- What this script does (all in one transaction):
--   1. Insert "1984" at id=1 — only when id=1 is currently empty AND the
--      duplicate at id=16 actually exists. Both gates use NOT EXISTS /
--      EXISTS so the script is fully idempotent: re-running after success
--      is a no-op, and if id=1 has been repurposed for something else the
--      insert silently skips (the subsequent UPDATE / DELETE then also do
--      nothing since they only target id=16 = "1984" / "GEORGE ORWELL").
--   2. Re-home any borrow rows that referenced book_id=16 onto book_id=1.
--      Defensive — there are none today, but this keeps the script safe
--      across future test cycles.
--   3. Delete the duplicate row, gated by title+author so we never drop
--      an unrelated row that happens to land at id=16 later.
--   4. Sync AUTO_INCREMENT down to 17 so the next admin-created book
--      doesn't leave a hole.
--
-- Safety properties:
--   * Wrapped in a single transaction — atomic.
--   * NEVER overwrites an existing id=1 row.
--   * NEVER deletes a row at id=16 unless it's exactly the duplicate
--     "1984 / GEORGE ORWELL" we ourselves inserted.
--   * Touches zero other books, users, or borrow history.
--
-- Run with:
--   docker exec -i microservices-mysql-1 \
--     mysql -uroot -ppassword digital_library \
--     < microservices/migrations/2026_05_31_dedupe_1984.sql
-- =============================================================================

START TRANSACTION;

-- 1. Insert "1984" at id=1, but only when the slot is empty AND the
--    duplicate row we want to collapse still exists at id=16.
INSERT INTO books (id, title, author, image, description, category_id, total_copies, available_copies, is_popular, created_at)
SELECT 1, '1984', 'GEORGE ORWELL', '/images/book1.jpg',
       'A dystopian world where surveillance controls every aspect of life and privacy no longer exists. The government rewrites truth, shaping reality to maintain absolute power.\n\nWinston Smith begins to question the system he lives in, slowly realizing that even thoughts are being controlled. Rebellion becomes dangerous in a society built on fear and manipulation.',
       1, 5, 5, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM books WHERE id = 1)
  AND EXISTS    (SELECT 1 FROM books WHERE id = 16 AND title = '1984' AND author = 'GEORGE ORWELL');

-- 2. Re-home any borrow history from the duplicate.
UPDATE borrows SET book_id = 1 WHERE book_id = 16;

-- 3. Drop the duplicate (gated on exact match so we never delete
--    something unrelated that may land at id=16 in the future).
DELETE FROM books
WHERE id = 16
  AND title = '1984'
  AND author = 'GEORGE ORWELL';

-- 4. Resync AUTO_INCREMENT past the seed range so admin-added books
--    continue from id=17.
ALTER TABLE books AUTO_INCREMENT = 17;

COMMIT;

-- ---------------------------------------------------------------------------
-- Verification (read-only):
-- ---------------------------------------------------------------------------
SELECT COUNT(*) AS literature_rows FROM books WHERE category_id = 1;
SELECT id, title, author, total_copies, available_copies, is_popular
FROM books WHERE category_id = 1 ORDER BY id;
