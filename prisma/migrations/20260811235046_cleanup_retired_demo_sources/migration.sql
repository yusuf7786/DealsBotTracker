-- Data cleanup: this deployment's source list changed from generic
-- "Demo Source A/B/C/D/E" placeholders to 5 named retailers (Amazon ZA,
-- Takealot, Makro, Incredible Connection, VodaBucks). Remove any leftover
-- rows from the retired source keys so they don't linger as phantom
-- "sellers" mixed in with the real named sources. Safe to run more than
-- once — later runs simply match zero rows.

DELETE FROM "Deal" WHERE "bestListingId" IN (
  SELECT id FROM "Listing" WHERE source IN (
    'demo-source-a', 'demo-source-b', 'demo-source-c', 'demo-source-d', 'demo-source-e', 'example-retailer-api'
  )
);

DELETE FROM "Listing" WHERE source IN (
  'demo-source-a', 'demo-source-b', 'demo-source-c', 'demo-source-d', 'demo-source-e', 'example-retailer-api'
);

DELETE FROM "Source" WHERE key IN (
  'demo-source-a', 'demo-source-b', 'demo-source-c', 'demo-source-d', 'demo-source-e', 'example-retailer-api'
);
