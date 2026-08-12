-- Source list narrowed to Amazon ZA and Takealot only (the two of the
-- original five with an actual accessible API). Remove Makro, Incredible
-- Connection, and VodaBucks data so they don't linger. Safe to run more
-- than once.

DELETE FROM "Deal" WHERE "bestListingId" IN (
  SELECT id FROM "Listing" WHERE source IN ('makro', 'incredible-connection', 'vodabucks')
);

DELETE FROM "Listing" WHERE source IN ('makro', 'incredible-connection', 'vodabucks');

DELETE FROM "Source" WHERE key IN ('makro', 'incredible-connection', 'vodabucks');
