'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatCurrency } from '@/lib/utils/currency';

export interface PricePoint {
  date: string; // ISO
  price: number;
}

export function PriceHistoryChart({
  points,
  marketPrice,
  currency,
}: {
  points: PricePoint[];
  marketPrice: number;
  currency: string;
}) {
  if (points.length === 0) {
    return <div className="flex h-40 items-center justify-center text-xs text-muted">No price history yet</div>;
  }

  const data = points.map((p) => ({ ...p, label: new Date(p.date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }) }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="rgb(var(--accent))" stopOpacity={0.35} />
              <stop offset="95%" stopColor="rgb(var(--accent))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} minTickGap={30} />
          <YAxis
            tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
          />
          <ReferenceLine y={marketPrice} stroke="rgb(var(--muted))" strokeDasharray="4 4" label={{ value: 'Market', fontSize: 10, fill: 'rgb(var(--muted))', position: 'insideTopLeft' }} />
          <Tooltip
            contentStyle={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--border))', borderRadius: 12, fontSize: 12 }}
            formatter={(value: number) => [formatCurrency(value, currency), 'Price']}
          />
          <Area type="monotone" dataKey="price" stroke="rgb(var(--accent))" strokeWidth={2} fill="url(#priceFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
