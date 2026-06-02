-- =============================================================================
-- Backfill: insert every Literature seed book that exists on the frontend
-- (frontend/src/data/books.js) but is missing from the `books` table.
-- =============================================================================
--
-- Safety properties:
--   * Idempotent — every INSERT is gated by NOT EXISTS on (title, author),
--     so re-running this script never produces duplicate rows.
--   * Non-destructive — does not UPDATE, DELETE, or TRUNCATE anything.
--   * Preserves the seed file's id→content mapping for ids 2..15 by
--     specifying explicit ids; the existing row at id=1 ("Postman Seed
--     Book") is left untouched.
--   * "1984" (seed id=1) is inserted WITHOUT an explicit id because its
--     slot is already taken; MySQL assigns the next AUTO_INCREMENT value.
--   * Default copies: total=5, available=5 (sensible library default,
--     matches the existing row).
--   * is_popular mirrors the frontend `featured` flag (1 = featured).
--   * category_id = 1 = Literature (see frontend/src/utils/categories.js).
--
-- Run with:
--   docker exec -i microservices-mysql-1 \
--     mysql -uroot -ppassword digital_library \
--     < microservices/migrations/2026_05_31_seed_literature.sql
-- =============================================================================

START TRANSACTION;

-- ---------------------------------------------------------------------------
-- Seed id 2 -> "Agua Viva"
-- ---------------------------------------------------------------------------
INSERT INTO books (id, title, author, image, description, category_id, total_copies, available_copies, is_popular, created_at)
SELECT 2, 'Agua Viva', 'CLARICE LISPECTOR', '/images/book8.jpg',
       'A poetic reflection on consciousness, existence, and the flow of thought. The narrative moves freely, without structure, like fragments of inner awareness.\n\nIt captures the essence of being alive in the present moment, where meaning is felt rather than explained.',
       1, 5, 5, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title='Agua Viva' AND author='CLARICE LISPECTOR');

-- ---------------------------------------------------------------------------
-- Seed id 3 -> "Giovanni's Room" (Professor's Pick — must keep id=3)
-- ---------------------------------------------------------------------------
INSERT INTO books (id, title, author, image, description, category_id, total_copies, available_copies, is_popular, created_at)
SELECT 3, 'Giovanni''s Room', 'JAMES BALDWIN', '/images/book9.jpg',
       'A story of identity, love, and inner conflict set in Paris. The protagonist struggles with desire and societal expectations that refuse to accept his truth.\n\nRelationships become emotionally complex, revealing fear, shame, and vulnerability.',
       1, 5, 5, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title='Giovanni''s Room' AND author='JAMES BALDWIN');

-- ---------------------------------------------------------------------------
-- Seed id 4 -> "Norwegian Wood"
-- ---------------------------------------------------------------------------
INSERT INTO books (id, title, author, image, description, category_id, total_copies, available_copies, is_popular, created_at)
SELECT 4, 'Norwegian Wood', 'HARUKI MURAKAMI', '/images/book11.jpg',
       'A nostalgic tale of love, loss, and emotional memory in 1960s Tokyo. The past constantly influences the present, shaping every emotional decision.\n\nThe characters navigate grief and connection in a quiet, introspective world.',
       1, 5, 5, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title='Norwegian Wood' AND author='HARUKI MURAKAMI');

-- ---------------------------------------------------------------------------
-- Seed id 5 -> "The Nickel Boys"
-- ---------------------------------------------------------------------------
INSERT INTO books (id, title, author, image, description, category_id, total_copies, available_copies, is_popular, created_at)
SELECT 5, 'The Nickel Boys', 'COLSON WHITEHEAD', '/images/book5.jpg',
       'A powerful story set in a reform school where injustice and abuse are hidden behind authority. Two boys try to survive in a system built on cruelty.\n\nTheir friendship becomes a source of strength as they face oppression and loss of innocence.',
       1, 5, 5, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title='The Nickel Boys' AND author='COLSON WHITEHEAD');

-- ---------------------------------------------------------------------------
-- Seed id 6 -> "Begin Again"
-- ---------------------------------------------------------------------------
INSERT INTO books (id, title, author, image, description, category_id, total_copies, available_copies, is_popular, created_at)
SELECT 6, 'Begin Again', 'JENNY LYNNE MORRISON', '/images/book6.jpg',
       'A story about rebuilding life after emotional collapse and starting over. It follows the slow process of healing and rediscovery of self.\n\nThrough small moments of change, the character learns resilience and acceptance.',
       1, 5, 5, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title='Begin Again' AND author='JENNY LYNNE MORRISON');

-- ---------------------------------------------------------------------------
-- Seed id 7 -> "The Odd Women"
-- ---------------------------------------------------------------------------
INSERT INTO books (id, title, author, image, description, category_id, total_copies, available_copies, is_popular, created_at)
SELECT 7, 'The Odd Women', 'GEORGE GISSING', '/images/book20.jpg',
       'Set in Victorian England, this novel explores the harsh realities faced by women who remain unmarried in a society defined by rigid gender roles. It follows the struggles of women seeking independence in a world that offers them limited opportunities.\n\nThe story highlights social inequality, financial dependence, and emotional isolation while questioning traditional expectations placed on women.',
       1, 5, 5, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title='The Odd Women' AND author='GEORGE GISSING');

-- ---------------------------------------------------------------------------
-- Seed id 8 -> "The Trial"
-- ---------------------------------------------------------------------------
INSERT INTO books (id, title, author, image, description, category_id, total_copies, available_copies, is_popular, created_at)
SELECT 8, 'The Trial', 'FRANZ KAFKA', '/images/book12.JPG',
       'A man is suddenly arrested and prosecuted by an unknown authority without ever being told his crime. He becomes trapped in a confusing and oppressive system.\n\nThe novel explores bureaucracy, guilt, and existential fear, showing a world where justice is unreachable and truth is impossible to find.',
       1, 5, 5, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title='The Trial' AND author='FRANZ KAFKA');

-- ---------------------------------------------------------------------------
-- Seed id 9 -> "The Great Gatsby"
-- ---------------------------------------------------------------------------
INSERT INTO books (id, title, author, image, description, category_id, total_copies, available_copies, is_popular, created_at)
SELECT 9, 'The Great Gatsby', 'F. SCOTT FITZGERALD', '/images/book13.JPG',
       'Set in the Roaring Twenties, this novel follows Jay Gatsby and his obsessive love for Daisy Buchanan. It portrays a world of wealth, parties, and illusion.\n\nBehind the glamour lies emptiness and moral decay, revealing the fragile nature of the American Dream.',
       1, 5, 5, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title='The Great Gatsby' AND author='F. SCOTT FITZGERALD');

-- ---------------------------------------------------------------------------
-- Seed id 10 -> "Animal Farm"
-- ---------------------------------------------------------------------------
INSERT INTO books (id, title, author, image, description, category_id, total_copies, available_copies, is_popular, created_at)
SELECT 10, 'Animal Farm', 'GEORGE ORWELL', '/images/book14.jpg',
       'A group of farm animals overthrow their human owner in hopes of creating equality. However, their revolution slowly turns into dictatorship.\n\nThe story shows how power corrupts ideals and how oppression can repeat itself even after rebellion.',
       1, 5, 5, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title='Animal Farm' AND author='GEORGE ORWELL');

-- ---------------------------------------------------------------------------
-- Seed id 11 -> "Fahrenheit 451"
-- ---------------------------------------------------------------------------
INSERT INTO books (id, title, author, image, description, category_id, total_copies, available_copies, is_popular, created_at)
SELECT 11, 'Fahrenheit 451', 'RAY BRADBURY', '/images/book15.jpg',
       'In a future where books are banned, firemen burn any that are found. Society is controlled through censorship and entertainment.\n\nThe protagonist begins to question this system, discovering the importance of knowledge and free thought.',
       1, 5, 5, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title='Fahrenheit 451' AND author='RAY BRADBURY');

-- ---------------------------------------------------------------------------
-- Seed id 12 -> "Before the Coffee Gets Cold"
-- ---------------------------------------------------------------------------
INSERT INTO books (id, title, author, image, description, category_id, total_copies, available_copies, is_popular, created_at)
SELECT 12, 'Before the Coffee Gets Cold', 'TOSHIKAZU KAWAGUCHI', '/images/book16.JPG',
       'A café in Tokyo allows customers to travel back in time, but only under strict rules. They must return before their coffee gets cold.\n\nEach story explores regret, love, and emotional closure, showing that the past cannot be changed but can be understood.',
       1, 5, 5, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title='Before the Coffee Gets Cold' AND author='TOSHIKAZU KAWAGUCHI');

-- ---------------------------------------------------------------------------
-- Seed id 13 -> "Vampire in Love"
-- ---------------------------------------------------------------------------
INSERT INTO books (id, title, author, image, description, category_id, total_copies, available_copies, is_popular, created_at)
SELECT 13, 'Vampire in Love', 'ENRIQUE VILA-MATAS', '/images/book17.jpg',
       'A surreal story blending love, obsession, and fiction. Reality and imagination constantly overlap.\n\nThe novel explores identity, storytelling, and the emotional complexity of desire.',
       1, 5, 5, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title='Vampire in Love' AND author='ENRIQUE VILA-MATAS');

-- ---------------------------------------------------------------------------
-- Seed id 14 -> "The Debut"
-- ---------------------------------------------------------------------------
INSERT INTO books (id, title, author, image, description, category_id, total_copies, available_copies, is_popular, created_at)
SELECT 14, 'The Debut', 'ANITA BROOKNER', '/images/book18.jpg',
       'A quiet story about a young woman navigating loneliness and independence. The novel focuses on her emotional world rather than external events.\n\nIt explores isolation, self-discovery, and the difficulty of forming meaningful connections.',
       1, 5, 5, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title='The Debut' AND author='ANITA BROOKNER');

-- ---------------------------------------------------------------------------
-- Seed id 15 -> "Little Women"
-- ---------------------------------------------------------------------------
INSERT INTO books (id, title, author, image, description, category_id, total_copies, available_copies, is_popular, created_at)
SELECT 15, 'Little Women', 'LOUISA MAY ALCOTT', '/images/book19.JPG',
       'The story of the four March sisters growing up during the American Civil War. Each sister follows her own path in life.\n\nThe novel explores family, love, ambition, and the transition from childhood to adulthood.',
       1, 5, 5, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title='Little Women' AND author='LOUISA MAY ALCOTT');

-- ---------------------------------------------------------------------------
-- Seed id 1 -> "1984" — id 1 is already taken by "Postman Seed Book", which
-- the spec forbids modifying. Insert WITHOUT an explicit id so MySQL
-- assigns the next AUTO_INCREMENT value (expected: 16).
-- ---------------------------------------------------------------------------
INSERT INTO books (title, author, image, description, category_id, total_copies, available_copies, is_popular, created_at)
SELECT '1984', 'GEORGE ORWELL', '/images/book1.jpg',
       'A dystopian world where surveillance controls every aspect of life and privacy no longer exists. The government rewrites truth, shaping reality to maintain absolute power.\n\nWinston Smith begins to question the system he lives in, slowly realizing that even thoughts are being controlled. Rebellion becomes dangerous in a society built on fear and manipulation.',
       1, 5, 5, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title='1984' AND author='GEORGE ORWELL');

-- Resync AUTO_INCREMENT past the explicit ids we used above so future
-- admin-created books don't collide with our seed range.
ALTER TABLE books AUTO_INCREMENT = 17;

COMMIT;

-- ---------------------------------------------------------------------------
-- Verification queries (read-only, safe to re-run):
-- ---------------------------------------------------------------------------
SELECT COUNT(*) AS literature_rows FROM books WHERE category_id = 1;
SELECT id, title, author, total_copies, available_copies, is_popular
FROM books WHERE category_id = 1 ORDER BY id;
