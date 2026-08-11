import { describe, it, expect } from 'vitest';
import { normalizeProduct, computeMatchConfidence } from '@/lib/engines/productMatching';

describe('normalizeProduct', () => {
  it('extracts storage, colour, and produces distinct canonical keys per variant', () => {
    const a = normalizeProduct({ title: 'iPhone 17 256GB Blue Dual-Sim', brand: 'Apple', category: 'Smartphones' });
    const b = normalizeProduct({ title: 'iPhone 17 512GB Blue Dual-Sim', brand: 'Apple', category: 'Smartphones' });
    const c = normalizeProduct({ title: 'iPhone 17 Pro 256GB Blue Dual-Sim', brand: 'Apple', category: 'Smartphones' });
    const refurb = normalizeProduct({ title: 'Refurbished iPhone 17 256GB Blue Dual-Sim', brand: 'Apple', category: 'Smartphones' });

    expect(a.storage).toBe('256GB');
    expect(b.storage).toBe('512GB');
    expect(a.canonicalKey).not.toBe(b.canonicalKey); // different storage
    expect(a.canonicalKey).not.toBe(c.canonicalKey); // different variant (Pro)
    expect(a.canonicalKey).not.toBe(refurb.canonicalKey); // different condition
    expect(refurb.condition).toBe('refurbished');
  });

  it('does not merge Wi-Fi and Cellular variants', () => {
    const wifi = normalizeProduct({ title: 'iPad Air 128GB Wi-Fi Starlight', brand: 'Apple', category: 'Tablets' });
    const cellular = normalizeProduct({ title: 'iPad Air 128GB Wi-Fi + Cellular Starlight', brand: 'Apple', category: 'Tablets' });
    expect(wifi.canonicalKey).not.toBe(cellular.canonicalKey);
  });

  it('produces the same canonical key for the same product from different sources', () => {
    const a = normalizeProduct({ title: 'Samsung Galaxy S26 Ultra 256GB Titanium Black Dual-Sim', brand: 'Samsung', category: 'Smartphones' });
    const b = normalizeProduct({ title: 'Samsung Galaxy S26 Ultra 256GB Titanium Black Dual-Sim', brand: 'Samsung', category: 'Smartphones' });
    expect(a.canonicalKey).toBe(b.canonicalKey);
  });

  it('lowers match confidence when key attributes are unknown', () => {
    const complete = normalizeProduct({ title: 'Samsung Galaxy S26 Ultra 256GB Titanium Black Dual-Sim', brand: 'Samsung', category: 'Smartphones' });
    const vague = normalizeProduct({ title: 'Samsung Phone', brand: 'Samsung', category: 'Smartphones' });
    expect(computeMatchConfidence(complete)).toBeGreaterThan(computeMatchConfidence(vague));
  });
});
