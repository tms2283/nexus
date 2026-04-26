import type { InstrumentPlugin, InstrumentSession, ScoreResult } from '../../core/instrumentTypes';

function parseIntStrict(v: unknown): number | null {
  if (typeof v === 'number' && Number.isInteger(v)) return v;
  if (typeof v !== 'string') return null;
  if (!/^\d+$/.test(v)) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export const aq10Gateway: InstrumentPlugin = {
  definition: {
    id: 'aq10-gateway',
    title: 'AQ-10 (Autism) — Gateway (self-scored total)',
    version: '1.0',
    intro:
      'This gateway avoids shipping copyrighted item wording by asking for a self-scored total. If you have an official AQ-10 form, complete it separately and enter your total here.\n\nTypical guidance uses a threshold of 6+ (out of 10) to suggest elevated autistic traits.',
    items: [
      {
        id: 'aq10_total',
        type: 'multiple-choice',
        required: true,
        prompt: 'Enter your AQ-10 total score (0–10)',
        options: Array.from({ length: 11 }, (_, n) => ({ id: String(n), label: String(n) })),
      },
    ],
  },

  score: (session: InstrumentSession): ScoreResult => {
    const raw = session.responses.find((r) => r.itemId === 'aq10_total')?.value;
    const total = parseIntStrict(raw) ?? 0;
    const bounded = Math.max(0, Math.min(10, total));

    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      totalScore: bounded,
      severity: bounded >= 6 ? 'At/above threshold (6+)' : 'Below threshold',
      triggers: [],
    };
  },
};
