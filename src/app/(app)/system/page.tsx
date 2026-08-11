import { prisma } from '@/lib/prisma';
import { StatCard } from '@/components/StatCard';

export const dynamic = 'force-dynamic';

export default async function SystemStatusPage() {
  const [productCount, listingCount, activeDealCount, notificationsSent, sources, recentScans] = await Promise.all([
    prisma.product.count(),
    prisma.listing.count(),
    prisma.deal.count({ where: { status: 'active' } }),
    prisma.notificationLog.count({ where: { status: 'sent' } }),
    prisma.source.findMany({ orderBy: { name: 'asc' } }),
    prisma.scanRun.findMany({ orderBy: { startedAt: 'desc' }, take: 15, include: { source: true } }),
  ]);

  let dbHealthy = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbHealthy = false;
  }

  const failedSources = sources.filter((s) => s.status === 'error');
  const recentErrors = recentScans.flatMap((r) =>
    Array.isArray(r.errors) ? (r.errors as string[]).map((e) => ({ id: r.id, source: r.source.name, error: e, at: r.startedAt })) : []
  );

  return (
    <div className="space-y-5 pb-6">
      <h1 className="text-lg font-semibold">🛠️ System Status</h1>
      <p className="text-xs text-muted">Private diagnostics — visible only to you.</p>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Database" value={dbHealthy ? 'Healthy' : 'Down'} />
        <StatCard label="Products Tracked" value={String(productCount)} />
        <StatCard label="Prices Tracked" value={String(listingCount)} />
        <StatCard label="Active Deals" value={String(activeDealCount)} />
        <StatCard label="Notifications Sent" value={String(notificationsSent)} />
        <StatCard label="Failed Sources" value={String(failedSources.length)} />
      </div>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold">Sources</h2>
        <ul className="space-y-2">
          {sources.map((s) => (
            <li key={s.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted">
                  {s.lastScanAt ? `Last scan: ${new Date(s.lastScanAt).toLocaleString('en-ZA')}` : 'Never scanned'}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                  s.status === 'error' ? 'bg-danger/15 text-danger' : s.status === 'scanning' ? 'bg-excellent/15 text-excellent' : 'bg-good/15 text-good'
                }`}
              >
                {s.status}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold">Recent Scan Runs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted">
              <tr>
                <th className="pb-2 pr-3">Source</th>
                <th className="pb-2 pr-3">Started</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2 pr-3">Checked</th>
                <th className="pb-2 pr-3">Deals</th>
                <th className="pb-2">Notified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentScans.map((r) => (
                <tr key={r.id}>
                  <td className="py-1.5 pr-3">{r.source.name}</td>
                  <td className="py-1.5 pr-3">{new Date(r.startedAt).toLocaleTimeString('en-ZA')}</td>
                  <td className="py-1.5 pr-3 capitalize">{r.status}</td>
                  <td className="py-1.5 pr-3">{r.productsChecked}</td>
                  <td className="py-1.5 pr-3">{r.dealsDetected}</td>
                  <td className="py-1.5">{r.notificationsSent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {recentErrors.length > 0 && (
        <section className="rounded-2xl border border-danger/30 bg-danger/5 p-4">
          <h2 className="mb-3 text-sm font-semibold text-danger">Recent Errors</h2>
          <ul className="space-y-2">
            {recentErrors.slice(0, 20).map((e, i) => (
              <li key={i} className="text-xs">
                <span className="font-medium">{e.source}</span> — {e.error}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
