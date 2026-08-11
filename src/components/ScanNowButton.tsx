'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ScanNowButton({ sourceKey }: { sourceKey?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function scanNow() {
    setLoading(true);
    try {
      await fetch('/api/scan/trigger', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sourceKey ? { sourceKey } : {}),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={scanNow}
      disabled={loading}
      className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
    >
      {loading ? 'Scanning…' : 'Scan now'}
    </button>
  );
}
