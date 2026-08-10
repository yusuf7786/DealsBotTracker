import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serialize } from '@/lib/api/serialize';
import { toNumber } from '@/lib/utils/currency';
import { explainDeal } from '@/lib/engines/aiExplain';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const deal = await prisma.deal.findUnique({
    where: { id: params.id },
    include: {
      product: {
        include: {
          listings: { where: { active: true }, orderBy: { currentPrice: 'asc' } },
          marketPrices: { orderBy: { computedAt: 'desc' }, take: 60 },
        },
      },
      bestListing: true,
    },
  });

  if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const priceObservations = await prisma.priceObservation.findMany({
    where: { listing: { productId: deal.productId } },
    orderBy: { observedAt: 'asc' },
    take: 500,
  });

  const explanation = await explainDeal({
    productName: `${deal.product.brand} ${deal.product.productName}`,
    percentBelowMarket: deal.savingsPercent,
    sourceCount: deal.sourcesUsed,
    isNearAllTimeLow: deal.isNearAllTimeLow,
    lowestKnownPrice: deal.product.lowestKnownPrice ? toNumber(deal.product.lowestKnownPrice) : null,
    currentPrice: toNumber(deal.currentPrice),
    dealScore: deal.dealScore,
  });

  return NextResponse.json(
    serialize({
      ...deal,
      aiExplanation: explanation,
      priceHistory: priceObservations.map((p) => ({ date: p.observedAt, price: toNumber(p.price) })),
    })
  );
}
