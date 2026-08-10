/**
 * AI DEAL ANALYSIS (optional, deterministic-numbers-only)
 *
 * Generates a short natural-language explanation of a deal from numbers
 * that were already computed by the deterministic engines above. This
 * function NEVER decides whether something is a deal — it only describes
 * a decision the numeric pipeline already made. If ANTHROPIC_API_KEY is
 * not configured, a rule-based template is used instead so the feature
 * degrades gracefully rather than being unavailable.
 */

export interface DealExplanationInput {
  productName: string;
  percentBelowMarket: number;
  sourceCount: number;
  isNearAllTimeLow: boolean;
  lowestKnownPrice: number | null;
  currentPrice: number;
  dealScore: number;
}

function templateExplanation(input: DealExplanationInput): string {
  const parts: string[] = [];
  parts.push(
    `Strong deal: currently ${input.percentBelowMarket.toFixed(1)}% below the ${input.sourceCount}-source market price.`
  );
  if (input.isNearAllTimeLow && input.lowestKnownPrice) {
    const diff = input.currentPrice - input.lowestKnownPrice;
    parts.push(
      diff <= 0
        ? 'This matches its lowest recorded price.'
        : `Only R${Math.round(diff)} above its historical low.`
    );
  }
  parts.push(`Deal score ${input.dealScore}/100.`);
  return parts.join(' ');
}

export async function explainDeal(input: DealExplanationInput): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return templateExplanation(input);
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 80,
        messages: [
          {
            role: 'user',
            content:
              `In one sentence (max 30 words), explain why this is a good deal using ONLY these facts — ` +
              `do not invent numbers: product="${input.productName}", ` +
              `percentBelowMarket=${input.percentBelowMarket}%, sources=${input.sourceCount}, ` +
              `nearAllTimeLow=${input.isNearAllTimeLow}, dealScore=${input.dealScore}/100.`,
          },
        ],
      }),
    });
    if (!res.ok) return templateExplanation(input);
    const data = (await res.json()) as { content?: { text?: string }[] };
    const text = data.content?.[0]?.text?.trim();
    return text || templateExplanation(input);
  } catch {
    return templateExplanation(input);
  }
}
