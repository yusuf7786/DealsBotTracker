'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScanNowButton } from '@/components/ScanNowButton';

interface Settings {
  currency: string;
  country: string;
  categories: string[];
  minDealScore: number;
  minPercentBelowMarket: number;
  thresholds: { exceptional: number; excellent: number; good: number };
  notificationChannels: { email: boolean; telegram: boolean; webpush: boolean; whatsapp: boolean };
  theme: string;
}

interface Source {
  id: string;
  key: string;
  name: string;
  enabled: boolean;
  priority: string;
  scanFrequencyMinutes: number;
  requiresApiKey: boolean;
  apiKeyConfigured: boolean;
  status: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  async function load() {
    const [s, src] = await Promise.all([fetch('/api/settings').then((r) => r.json()), fetch('/api/sources').then((r) => r.json())]);
    setSettings(s);
    setSources(src);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(partial: Partial<Settings>) {
    setSaving(true);
    const res = await fetch('/api/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(partial) });
    setSettings(await res.json());
    setSaving(false);
  }

  async function toggleChannel(channel: keyof Settings['notificationChannels']) {
    if (!settings) return;
    await save({ notificationChannels: { ...settings.notificationChannels, [channel]: !settings.notificationChannels[channel] } });
  }

  async function toggleSource(id: string, enabled: boolean) {
    await fetch(`/api/sources/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ enabled }) });
    load();
  }

  async function updateFrequency(id: string, minutes: number) {
    await fetch(`/api/sources/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scanFrequencyMinutes: minutes }) });
    load();
  }

  async function sendTest() {
    setTestResult(null);
    const res = await fetch('/api/notifications/test', { method: 'POST' });
    const data = await res.json();
    setTestResult(res.ok ? `Sent: ${data.sent}, Failed: ${data.failed}` : data.error);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  if (!settings) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="space-y-4 pb-6">
      <h1 className="text-lg font-semibold">⚙️ Settings</h1>

      <Section title="Deal Thresholds">
        <div className="space-y-3 text-sm">
          <label className="flex items-center justify-between">
            <span>Minimum deal score to notify</span>
            <input
              type="number"
              defaultValue={settings.minDealScore}
              onBlur={(e) => save({ minDealScore: Number(e.target.value) })}
              className="w-20 rounded-lg border border-border bg-surface-2 px-2 py-1 text-right"
            />
          </label>
          <label className="flex items-center justify-between">
            <span>Minimum % below market</span>
            <input
              type="number"
              defaultValue={settings.minPercentBelowMarket}
              onBlur={(e) => save({ minPercentBelowMarket: Number(e.target.value) })}
              className="w-20 rounded-lg border border-border bg-surface-2 px-2 py-1 text-right"
            />
          </label>
          {(['exceptional', 'excellent', 'good'] as const).map((tier) => (
            <label key={tier} className="flex items-center justify-between capitalize">
              <span>{tier} tier score ≥</span>
              <input
                type="number"
                defaultValue={settings.thresholds[tier]}
                onBlur={(e) => save({ thresholds: { ...settings.thresholds, [tier]: Number(e.target.value) } })}
                className="w-20 rounded-lg border border-border bg-surface-2 px-2 py-1 text-right"
              />
            </label>
          ))}
        </div>
      </Section>

      <Section title="Notification Channels">
        <div className="space-y-2">
          {(['email', 'telegram', 'webpush', 'whatsapp'] as const).map((channel) => (
            <label key={channel} className="flex items-center justify-between text-sm capitalize">
              {channel === 'webpush' ? 'Push notifications' : channel}
              <input type="checkbox" checked={settings.notificationChannels[channel]} onChange={() => toggleChannel(channel)} className="h-4 w-4 accent-accent" />
            </label>
          ))}
        </div>
        <button onClick={sendTest} className="mt-3 rounded-lg border border-border px-3 py-1.5 text-xs font-medium">
          Send test notification
        </button>
        {testResult && <p className="mt-2 text-xs text-muted">{testResult}</p>}
      </Section>

      <Section title="Currency & Region">
        <div className="space-y-3 text-sm">
          <label className="flex items-center justify-between">
            <span>Currency</span>
            <input defaultValue={settings.currency} onBlur={(e) => save({ currency: e.target.value })} className="w-24 rounded-lg border border-border bg-surface-2 px-2 py-1 text-right" />
          </label>
          <label className="flex items-center justify-between">
            <span>Country</span>
            <input defaultValue={settings.country} onBlur={(e) => save({ country: e.target.value })} className="w-24 rounded-lg border border-border bg-surface-2 px-2 py-1 text-right" />
          </label>
        </div>
      </Section>

      <Section title="Data Sources & Scan Frequency">
        <ul className="space-y-3">
          {sources.map((s) => (
            <li key={s.id} className="rounded-xl bg-surface-2 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted">
                    {s.apiKeyConfigured
                      ? 'Live — connected to real API'
                      : s.requiresApiKey
                        ? 'Simulated — no API key set yet'
                        : 'Simulated — no public API available'}{' '}
                    · {s.status}
                  </p>
                </div>
                <input type="checkbox" checked={s.enabled} onChange={(e) => toggleSource(s.id, e.target.checked)} className="h-4 w-4 accent-accent" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted">Every</span>
                <input
                  type="number"
                  defaultValue={s.scanFrequencyMinutes}
                  onBlur={(e) => updateFrequency(s.id, Number(e.target.value))}
                  className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-right text-xs"
                />
                <span className="text-xs text-muted">min</span>
                <div className="ml-auto">
                  <ScanNowButton sourceKey={s.key} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Account">
        <button onClick={logout} className="w-full rounded-lg border border-danger/30 px-3 py-2 text-sm font-medium text-danger">
          Sign out
        </button>
      </Section>

      {saving && <p className="text-center text-xs text-muted">Saving…</p>}
    </div>
  );
}
