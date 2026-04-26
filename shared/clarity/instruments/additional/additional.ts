import type {
  InstrumentPlugin,
  InstrumentResponse,
  InstrumentSession,
  Likert15,
  ScoreResult,
  SeverityBand,
} from '../../core/instrumentTypes';

const BANDS: SeverityBand[] = [
  { label: 'Very Low', min: 1, max: 20 },
  { label: 'Low', min: 21, max: 40 },
  { label: 'Average', min: 41, max: 60 },
  { label: 'High', min: 61, max: 80 },
  { label: 'Very High', min: 81, max: 100 },
];

function getLikert15(responses: InstrumentResponse[], itemId: string): Likert15 | null {
  const found = responses.find((r) => r.itemId === itemId);
  if (!found) return null;
  const v = found.value;
  if (typeof v === 'number' && v >= 1 && v <= 5) return v as Likert15;
  return null;
}

function calculateScore(responses: InstrumentResponse[], items: { id: string; reverse?: boolean }[]): number {
  let total = 0;
  for (const item of items) {
    const v = getLikert15(responses, item.id);
    if (v !== null) {
      total += item.reverse ? 6 - v : v;
    }
  }
  return total;
}

const eiItems = [
  { id: 'ei1', text: 'I can usually identify what I\'m feeling within minutes', reverse: false },
  { id: 'ei2', text: 'I understand how my emotions affect my performance', reverse: false },
  { id: 'ei3', text: 'I can accurately read other people\'s emotions from their body language', reverse: false },
  { id: 'ei4', text: 'I stay calm under pressure and don\'t let stress affect me', reverse: true },
  { id: 'ei5', text: 'I can defuse conflicts between others effectively', reverse: false },
  { id: 'ei6', text: 'I express my feelings appropriately rather than bottling them up', reverse: false },
  { id: 'ei7', text: 'I show empathy when others are going through difficult times', reverse: false },
  { id: 'ei8', text: 'I bounce back quickly from setbacks', reverse: true },
];

export const emotionalIntelligence: InstrumentPlugin = {
  definition: {
    id: 'emotional-intelligence',
    title: 'Emotional Intelligence Assessment',
    version: '1.0',
    intro: 'Rate how well each statement describes you (1 = Strongly Disagree, 5 = Strongly Agree)',
    items: eiItems.map((item) => ({
      id: item.id,
      type: 'likert-1-5' as const,
      required: true,
      prompt: item.text,
    })),
  },
  score: (session: InstrumentSession): ScoreResult => {
    const total = calculateScore(session.responses, eiItems);
    const maxScore = eiItems.length * 5;
    const percentage = Math.round((total / maxScore) * 100);
    const band = BANDS.find((b) => percentage >= b.min && percentage <= b.max);
    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      totalScore: total,
      severity: band?.label ?? 'Unknown',
      bands: BANDS,
      triggers: [],
    };
  },
};

const asItems = [
  { id: 'as1', text: 'I feel comfortable depending on romantic partners', reverse: false },
  { id: 'as2', text: 'I worry about being abandoned', reverse: true },
  { id: 'as3', text: 'I prefer not to show a partner how I feel deep down', reverse: true },
  { id: 'as4', text: 'I worry that my partner doesn\'t truly love me', reverse: true },
  { id: 'as5', text: 'I find it relatively easy to get close to others', reverse: false },
  { id: 'as6', text: 'I rarely worry about my partner leaving me', reverse: false },
  { id: 'as7', text: 'I am comfortable being without a romantic relationship', reverse: false },
  { id: 'as8', text: 'I often worry that my partner won\'t want to stay with me', reverse: true },
];

const attachmentBands: SeverityBand[] = [
  { label: 'Secure', min: 24, max: 40 },
  { label: 'Anxious', min: 16, max: 23 },
  { label: 'Avoidant', min: 8, max: 15 },
];

export const attachmentStyle: InstrumentPlugin = {
  definition: {
    id: 'attachment-style',
    title: 'Attachment Style Assessment',
    version: '1.0',
    intro: 'Rate how much you agree with each statement (1 = Strongly Disagree, 5 = Strongly Agree)',
    items: asItems.map((item) => ({
      id: item.id,
      type: 'likert-1-5' as const,
      required: true,
      prompt: item.text,
    })),
  },
  score: (session: InstrumentSession): ScoreResult => {
    const total = calculateScore(session.responses, asItems);
    const band = attachmentBands.find((b) => total >= b.min && total <= b.max);
    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      totalScore: total,
      severity: band?.label ?? 'Mixed',
      bands: attachmentBands,
      triggers: [],
    };
  },
};

const csItems = [
  { id: 'cs1', text: 'I tend to make decisions quickly without overthinking', reverse: false },
  { id: 'cs2', text: 'I often change my mind after considering new information', reverse: false },
  { id: 'cs3', text: 'I tend to notice patterns that others might miss', reverse: false },
  { id: 'cs4', text: 'I prefer concrete facts over abstract theories', reverse: true },
  { id: 'cs5', text: 'I often see multiple sides of an issue', reverse: false },
  { id: 'cs6', text: 'I trust my gut instinct even without evidence', reverse: false },
  { id: 'cs7', text: 'I analyze problems systematically step by step', reverse: false },
  { id: 'cs8', text: 'I often think about the future more than the past', reverse: false },
];

export const cognitiveStyle: InstrumentPlugin = {
  definition: {
    id: 'cognitive-style',
    title: 'Cognitive Style & Thinking Patterns',
    version: '1.0',
    intro: 'Rate how well each statement describes your thinking style (1 = Strongly Disagree, 5 = Strongly Agree)',
    items: csItems.map((item) => ({
      id: item.id,
      type: 'likert-1-5' as const,
      required: true,
      prompt: item.text,
    })),
  },
  score: (session: InstrumentSession): ScoreResult => {
    const total = calculateScore(session.responses, csItems);
    const maxScore = csItems.length * 5;
    const percentage = Math.round((total / maxScore) * 100);
    const band = BANDS.find((b) => percentage >= b.min && percentage <= b.max);
    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      totalScore: total,
      severity: band?.label ?? 'Unknown',
      bands: BANDS,
      triggers: [],
    };
  },
};

const sbItems = [
  { id: 'sb1', text: 'I enjoy being the center of attention at gatherings', reverse: false },
  { id: 'sb2', text: 'I prefer one-on-one conversations over group discussions', reverse: true },
  { id: 'sb3', text: 'I find it easy to start conversations with strangers', reverse: false },
  { id: 'sb4', text: 'I often take charge in group situations', reverse: false },
  { id: 'sb5', text: 'I prefer listening to talking in conversations', reverse: true },
  { id: 'sb6', text: 'I enjoy meeting new people and making connections', reverse: false },
  { id: 'sb7', text: 'I maintain a large circle of acquaintances', reverse: false },
  { id: 'sb8', text: 'I prefer deep friendships over many casual friends', reverse: false },
];

export const socialBehavior: InstrumentPlugin = {
  definition: {
    id: 'social-behavior',
    title: 'Social Behavior Patterns',
    version: '1.0',
    intro: 'Rate how well each statement describes you (1 = Strongly Disagree, 5 = Strongly Agree)',
    items: sbItems.map((item) => ({
      id: item.id,
      type: 'likert-1-5' as const,
      required: true,
      prompt: item.text,
    })),
  },
  score: (session: InstrumentSession): ScoreResult => {
    const total = calculateScore(session.responses, sbItems);
    const maxScore = sbItems.length * 5;
    const percentage = Math.round((total / maxScore) * 100);
    const band = BANDS.find((b) => percentage >= b.min && percentage <= b.max);
    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      totalScore: total,
      severity: band?.label ?? 'Unknown',
      bands: BANDS,
      triggers: [],
    };
  },
};

const scItems = [
  { id: 'sc1', text: 'When stressed, I tend to withdraw and isolate myself', reverse: true },
  { id: 'sc2', text: 'I exercise or engage in physical activity when stressed', reverse: false },
  { id: 'sc3', text: 'I talk to friends or family about my problems', reverse: false },
  { id: 'sc4', text: 'I use humor to lighten difficult situations', reverse: false },
  { id: 'sc5', text: 'I tend to avoid thinking about stressful situations', reverse: true },
  { id: 'sc6', text: 'I create organized plans to tackle problems', reverse: false },
  { id: 'sc7', text: 'I use relaxation techniques like meditation or breathing', reverse: false },
  { id: 'sc8', text: 'I get overwhelmed easily when facing multiple stressors', reverse: true },
];

export const stressCoping: InstrumentPlugin = {
  definition: {
    id: 'stress-coping',
    title: 'Stress & Coping Strategies',
    version: '1.0',
    intro: 'Rate how often you use each coping strategy (1 = Never, 5 = Always)',
    items: scItems.map((item) => ({
      id: item.id,
      type: 'likert-1-5' as const,
      required: true,
      prompt: item.text,
    })),
  },
  score: (session: InstrumentSession): ScoreResult => {
    const total = calculateScore(session.responses, scItems);
    const maxScore = scItems.length * 5;
    const percentage = Math.round((total / maxScore) * 100);
    const band = BANDS.find((b) => percentage >= b.min && percentage <= b.max);
    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      totalScore: total,
      severity: band?.label ?? 'Unknown',
      bands: BANDS,
      triggers: [],
    };
  },
};

const spItems = [
  { id: 'sp1', text: 'I\'m generally confident in my abilities', reverse: false },
  { id: 'sp2', text: 'I often compare myself to others', reverse: true },
  { id: 'sp3', text: 'I accept myself including my flaws', reverse: false },
  { id: 'sp4', text: 'I believe I can improve and grow', reverse: false },
  { id: 'sp5', text: 'I\'m aware of my strengths and weaknesses', reverse: false },
  { id: 'sp6', text: 'I feel good about who I am as a person', reverse: false },
  { id: 'sp7', text: 'I\'m my own harshest critic', reverse: true },
  { id: 'sp8', text: 'I set high standards for myself', reverse: false },
];

export const selfPerception: InstrumentPlugin = {
  definition: {
    id: 'self-perception',
    title: 'Self Perception Assessment',
    version: '1.0',
    intro: 'Rate how well each statement describes you (1 = Strongly Disagree, 5 = Strongly Agree)',
    items: spItems.map((item) => ({
      id: item.id,
      type: 'likert-1-5' as const,
      required: true,
      prompt: item.text,
    })),
  },
  score: (session: InstrumentSession): ScoreResult => {
    const total = calculateScore(session.responses, spItems);
    const maxScore = spItems.length * 5;
    const percentage = Math.round((total / maxScore) * 100);
    const band = BANDS.find((b) => percentage >= b.min && percentage <= b.max);
    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      totalScore: total,
      severity: band?.label ?? 'Unknown',
      bands: BANDS,
      triggers: [],
    };
  },
};

const phItems = [
  { id: 'ph1', text: 'I believe life has inherent meaning', reverse: false },
  { id: 'ph2', text: 'I believe people are fundamentally good', reverse: false },
  { id: 'ph3', text: 'I think free will exists, not just determinism', reverse: false },
  { id: 'ph4', text: 'I believe knowledge comes primarily from experience', reverse: false },
  { id: 'ph5', text: 'I think ethics are absolute, not relative', reverse: false },
  { id: 'ph6', text: 'I believe in something beyond the material world', reverse: false },
  { id: 'ph7', text: 'I think happiness is the highest good', reverse: false },
  { id: 'ph8', text: 'I believe change is the only constant', reverse: false },
];

export const philosophicalViews: InstrumentPlugin = {
  definition: {
    id: 'philosophical-views',
    title: 'Philosophical Worldview Assessment',
    version: '1.0',
    intro: 'Rate how much you agree with each philosophical statement (1 = Strongly Disagree, 5 = Strongly Agree)',
    items: phItems.map((item) => ({
      id: item.id,
      type: 'likert-1-5' as const,
      required: true,
      prompt: item.text,
    })),
  },
  score: (session: InstrumentSession): ScoreResult => {
    const total = calculateScore(session.responses, phItems);
    const maxScore = phItems.length * 5;
    const percentage = Math.round((total / maxScore) * 100);
    const band = BANDS.find((b) => percentage >= b.min && percentage <= b.max);
    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      totalScore: total,
      severity: band?.label ?? 'Unknown',
      bands: BANDS,
      triggers: [],
    };
  },
};