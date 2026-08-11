import { prisma } from './prisma';

export interface AppSettings {
  currency: string;
  country: string;
  categories: string[];
  minDealScore: number;
  minPercentBelowMarket: number;
  thresholds: { exceptional: number; excellent: number; good: number };
  scanFrequencyMinutes: { high: number; normal: number; low: number };
  notificationChannels: { email: boolean; telegram: boolean; webpush: boolean; whatsapp: boolean };
  theme: 'system' | 'light' | 'dark';
}

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'ZAR',
  country: 'ZA',
  categories: [
    'Smartphones', 'Laptops', 'Tablets', 'Gaming', 'TVs', 'Audio', 'Appliances', 'Wearables',
  ],
  minDealScore: 60,
  minPercentBelowMarket: 10,
  thresholds: { exceptional: 90, excellent: 75, good: 60 },
  scanFrequencyMinutes: { high: 10, normal: 30, low: 180 },
  notificationChannels: { email: true, telegram: true, webpush: true, whatsapp: false },
  theme: 'system',
};

let cache: AppSettings | null = null;
let cacheAt = 0;
const CACHE_TTL_MS = 10_000;

export async function getSettings(): Promise<AppSettings> {
  if (cache && Date.now() - cacheAt < CACHE_TTL_MS) return cache;
  const row = await prisma.settings.findUnique({ where: { id: 'singleton' } });
  const settings = row ? ({ ...DEFAULT_SETTINGS, ...(row.value as Partial<AppSettings>) } as AppSettings) : DEFAULT_SETTINGS;
  cache = settings;
  cacheAt = Date.now();
  return settings;
}

export async function updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const merged = { ...current, ...partial };
  const jsonValue = JSON.parse(JSON.stringify(merged));
  await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: { value: jsonValue },
    create: { id: 'singleton', value: jsonValue },
  });
  cache = merged;
  cacheAt = Date.now();
  return merged;
}
