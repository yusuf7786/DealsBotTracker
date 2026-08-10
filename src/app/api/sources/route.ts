import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serialize } from '@/lib/api/serialize';
import { ALL_ADAPTERS } from '@/lib/sources/registry';

export async function GET() {
  // Ensure every registered adapter has a Source row (in case the worker hasn't run yet).
  for (const adapter of ALL_ADAPTERS) {
    await prisma.source.upsert({
      where: { key: adapter.meta.key },
      update: { apiKeyConfigured: adapter.isConfigured() },
      create: {
        key: adapter.meta.key,
        name: adapter.meta.name,
        type: adapter.meta.type,
        priority: adapter.meta.priority,
        scanFrequencyMinutes: adapter.meta.defaultScanFrequencyMinutes,
        reliabilityWeight: adapter.meta.reliabilityWeight,
        requiresApiKey: adapter.meta.requiresApiKey,
        apiKeyConfigured: adapter.isConfigured(),
      },
    });
  }

  const sources = await prisma.source.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(serialize(sources));
}
