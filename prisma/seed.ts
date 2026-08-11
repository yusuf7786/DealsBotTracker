import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { DEFAULT_SETTINGS } from '../src/lib/settings';
import { ALL_ADAPTERS } from '../src/lib/sources/registry';
import { runScanForSource } from '../src/lib/pipeline/scanSource';

/**
 * DEMO MODE bootstrap (spec section 32): populates the database with
 * realistic sample deals, price history, and market comparisons by running
 * the exact same scan pipeline the worker uses against the built-in demo
 * source adapters. Safe to re-run — it's a no-op if products already exist.
 */
async function main() {
  await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', value: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) },
  });

  const existingProducts = await prisma.product.count();
  if (existingProducts > 0) {
    console.log(`Skipping demo seed — ${existingProducts} products already exist.`);
    await prisma.$disconnect();
    return;
  }

  if (process.env.DEMO_MODE !== 'true') {
    console.log('DEMO_MODE is not "true" — skipping demo data seed.');
    await prisma.$disconnect();
    return;
  }

  console.log('Seeding demo catalogue via the real scan pipeline...');
  for (const adapter of ALL_ADAPTERS) {
    const result = await runScanForSource(adapter.meta.key);
    console.log(`  ${adapter.meta.key}: ${result.productsChecked} checked, ${result.dealsDetected} deals`);
  }

  console.log('Demo seed complete.');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
