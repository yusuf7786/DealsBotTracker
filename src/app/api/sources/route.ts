import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serialize } from '@/lib/api/serialize';
import { ALL_ADAPTERS } from '@/lib/sources/registry';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Ensure every registered adapter has a Source row (in case the worker hasn't run yet).
  for (const adapter of ALL_ADAPTERS) {
    await prisma.source.upsert({
      where: { key: adapter.meta.key },
      update: { apiKeyConfigured: adapter.hasRealCredentials() },
      create: {
        key: adapter.meta.key,
        name: adapter.meta.name,
        type: adapter.meta.type,
        priority: adapter.meta.priority,
        scanFrequencyMinutes: adapter.meta.defaultScanFrequencyMinutes,
        reliabilityWeight: adapter.meta.reliabilityWeight,
        requiresApiKey: adapter.meta.requiresApiKey,
        apiKeyConfigured: adapter.hasRealCredentials(),
      },
    });
  }

  // Only show sources that are still registered — old/retired adapter keys
  // (e.g. from a previous source configuration) are left in the database
  // for historical listings but shouldn't clutter the Settings list.
  const currentKeys = ALL_ADAPTERS.map((a) => a.meta.key);
  const sources = await prisma.source.findMany({ where: { key: { in: currentKeys } }, orderBy: { name: 'asc' } });
  return NextResponse.json(serialize(sources));
}
