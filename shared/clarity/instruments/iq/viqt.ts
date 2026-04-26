import type {
  InstrumentPlugin,
  InstrumentResponse,
  InstrumentSession,
  MultipleChoiceOption,
  ScoreResult,
} from '../../core/instrumentTypes';

type McValue = string | null;

function getChoice(responses: InstrumentResponse[], itemId: string): McValue {
  const found = responses.find((r) => r.itemId === itemId);
  if (!found) return null;
  return typeof found.value === 'string' ? found.value : null;
}

const OPTIONS: MultipleChoiceOption[] = [
  { id: '3', label: '1 & 2' },
  { id: '5', label: '1 & 3' },
  { id: '9', label: '1 & 4' },
  { id: '17', label: '1 & 5' },
  { id: '6', label: '2 & 3' },
  { id: '10', label: '2 & 4' },
  { id: '18', label: '2 & 5' },
  { id: '12', label: '3 & 4' },
  { id: '20', label: '3 & 5' },
  { id: '24', label: '4 & 5' },
  { id: '-1', label: "Don't know" },
];

function makePrompt(words: [string, string, string, string, string]): string {
  const [w1, w2, w3, w4, w5] = words;
  return `Words: (1) ${w1}  (2) ${w2}  (3) ${w3}  (4) ${w4}  (5) ${w5}\n\nSelect the best matching pair:`;
}

type ViqtItem = {
  id: string;
  correctMask: string;
  words: [string, string, string, string, string];
};

// Source: Open-Source Psychometrics Project (openpsychometrics.org) VIQT_data.zip codebook.txt.
// License: The Open-Source Psychometrics Project site content is published under CC BY-NC-SA 4.0.
// This implementation is intended for personal, non-commercial use.
const ITEMS: ViqtItem[] = [
  { id: 'viqt_q1', correctMask: '24', words: ['tiny', 'faded', 'new', 'large', 'big'] },
  { id: 'viqt_q2', correctMask: '3', words: ['shovel', 'spade', 'needle', 'oak', 'club'] },
  { id: 'viqt_q3', correctMask: '10', words: ['walk', 'rob', 'juggle', 'steal', 'discover'] },
  { id: 'viqt_q4', correctMask: '5', words: ['finish', 'embellish', 'cap', 'squeak', 'talk'] },
  { id: 'viqt_q5', correctMask: '9', words: ['recall', 'flex', 'efface', 'remember', 'divest'] },
  { id: 'viqt_q6', correctMask: '9', words: ['implore', 'fancy', 'recant', 'beg', 'answer'] },
  { id: 'viqt_q7', correctMask: '17', words: ['deal', 'claim', 'plea', 'recoup', 'sale'] },
  { id: 'viqt_q8', correctMask: '10', words: ['mindful', 'negligent', 'neurotic', 'lax', 'delectable'] },
  { id: 'viqt_q9', correctMask: '17', words: ['quash', 'evade', 'enumerate', 'assist', 'defeat'] },
  { id: 'viqt_q10', correctMask: '10', words: ['entrapment', 'partner', 'fool', 'companion', 'mirror'] },
  { id: 'viqt_q11', correctMask: '5', words: ['junk', 'squeeze', 'trash', 'punch', 'crack'] },
  { id: 'viqt_q12', correctMask: '17', words: ['trivial', 'crude', 'presidential', 'flow', 'minor'] },
  { id: 'viqt_q13', correctMask: '9', words: ['prattle', 'siren', 'couch', 'chatter', 'good'] },
  { id: 'viqt_q14', correctMask: '5', words: ['above', 'slow', 'over', 'pierce', 'what'] },
  { id: 'viqt_q15', correctMask: '18', words: ['assail', 'designate', 'arcane', 'capitulate', 'specify'] },
  { id: 'viqt_q16', correctMask: '18', words: ['succeed', 'drop', 'squeal', 'spit', 'fall'] },
  { id: 'viqt_q17', correctMask: '3', words: ['fly', 'soar', 'drink', 'peer', 'hop'] },
  { id: 'viqt_q18', correctMask: '12', words: ['disburse', 'perplex', 'muster', 'convene', 'feign'] },
  { id: 'viqt_q19', correctMask: '18', words: ['cistern', 'crimp', 'bastion', 'leeway', 'pleat'] },
  { id: 'viqt_q20', correctMask: '18', words: ['solder', 'beguile', 'distant', 'reveal', 'seduce'] },
  { id: 'viqt_q21', correctMask: '3', words: ['dowager', 'matron', 'spank', 'fiend', 'sire'] },
  { id: 'viqt_q22', correctMask: '18', words: ['worldly', 'solo', 'inverted', 'drunk', 'alone'] },
  { id: 'viqt_q23', correctMask: '6', words: ['protracted', 'standard', 'normal', 'florid', 'unbalanced'] },
  { id: 'viqt_q24', correctMask: '12', words: ['admissible', 'barbaric', 'lackluster', 'drab', 'spiffy'] },
  { id: 'viqt_q25', correctMask: '17', words: ['related', 'intrinsic', 'alien', 'steadfast', 'pertinent'] },
  { id: 'viqt_q26', correctMask: '10', words: ['facile', 'annoying', 'clicker', 'obnoxious', 'counter'] },
  { id: 'viqt_q27', correctMask: '10', words: ['capricious', 'incipient', 'galling', 'nascent', 'chromatic'] },
  { id: 'viqt_q28', correctMask: '9', words: ['noted', 'subsidiary', 'culinary', 'illustrious', 'begrudge'] },
  { id: 'viqt_q29', correctMask: '9', words: ['breach', 'harmony', 'vehement', 'rupture', 'acquiesce'] },
  { id: 'viqt_q30', correctMask: '3', words: ['influence', 'power', 'cauterize', 'bizarre', 'regular'] },
  { id: 'viqt_q31', correctMask: '6', words: ['silence', 'rage', 'anger', 'victory', 'love'] },
  { id: 'viqt_q32', correctMask: '10', words: ['sector', 'mean', 'light', 'harsh', 'predator'] },
  { id: 'viqt_q33', correctMask: '17', words: ['house', 'carnival', 'yeast', 'economy', 'domicile'] },
  { id: 'viqt_q34', correctMask: '3', words: ['depression', 'despondency', 'forswear', 'hysteria', 'integrity'] },
  { id: 'viqt_q35', correctMask: '17', words: ['memorandum', 'catalogue', 'bourgeois', 'trigger', 'note'] },
  { id: 'viqt_q36', correctMask: '24', words: ['fulminant', 'doohickey', 'ligature', 'epistle', 'letter'] },
  { id: 'viqt_q37', correctMask: '17', words: ['titanic', 'equestrian', 'niggardly', 'promiscuous', 'gargantuan'] },
  { id: 'viqt_q38', correctMask: '5', words: ['stanchion', 'strumpet', 'pole', 'pale', 'forstall'] },
  { id: 'viqt_q39', correctMask: '5', words: ['yearn', 'reject', 'hanker', 'despair', 'indolence'] },
  { id: 'viqt_q40', correctMask: '24', words: ['introduce', 'terminate', 'shatter', 'bifurcate', 'fork'] },
  { id: 'viqt_q41', correctMask: '5', words: ['omen', 'opulence', 'harbinger', 'mystic', 'demand'] },
  { id: 'viqt_q42', correctMask: '5', words: ['hightail', 'report', 'abscond', 'perturb', 'surmise'] },
  { id: 'viqt_q43', correctMask: '12', words: ['fugacious', 'vapid', 'fractious', 'querulous', 'extemporaneous'] },
  { id: 'viqt_q44', correctMask: '10', words: ['cardinal', 'pilot', 'full', 'trial', 'inkling'] },
  { id: 'viqt_q45', correctMask: '9', words: ['fixed', 'rotund', 'stagnant', 'permanent', 'shifty'] },
];

type AgeBandId = '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';

const AGE_BANDS: { id: AgeBandId; label: string }[] = [
  { id: '18-24', label: '18–24' },
  { id: '25-34', label: '25–34' },
  { id: '35-44', label: '35–44' },
  { id: '45-54', label: '45–54' },
  { id: '55-64', label: '55–64' },
  { id: '65+', label: '65+' },
];

type NormCell = { n: number; mean: number; sd: number };

// Norms computed from OpenPsychometrics VIQT_data.zip (codebook-provided variables)
// using score_full by age band and engnat.
// Filter used in the dataset itself: only users who completed the optional supplemental survey.
const NORMS: Record<AgeBandId, { nativeEnglishYes: NormCell; nativeEnglishNo: NormCell }> = {
  '18-24': {
    nativeEnglishYes: { n: 2058, mean: 29.98182701652088, sd: 8.52369984697897 },
    nativeEnglishNo: { n: 985, mean: 21.03228426395938, sd: 9.440842950190872 },
  },
  '25-34': {
    nativeEnglishYes: { n: 1970, mean: 33.924390862944044, sd: 8.583900166094113 },
    nativeEnglishNo: { n: 737, mean: 24.247489823609254, sd: 10.26332199325309 },
  },
  '35-44': {
    nativeEnglishYes: { n: 1420, mean: 34.89123239436621, sd: 8.239033685450364 },
    nativeEnglishNo: { n: 294, mean: 26.06955782312925, sd: 10.700229662062261 },
  },
  '45-54': {
    nativeEnglishYes: { n: 1313, mean: 36.09398324447825, sd: 7.150096071524925 },
    nativeEnglishNo: { n: 231, mean: 28.31818181818181, sd: 10.539783562740135 },
  },
  '55-64': {
    nativeEnglishYes: { n: 1020, mean: 37.25534313725486, sd: 6.839225344794632 },
    nativeEnglishNo: { n: 92, mean: 28.52173913043478, sd: 10.502616901389532 },
  },
  '65+': {
    nativeEnglishYes: { n: 603, mean: 37.367412935323365, sd: 8.035991211902402 },
    nativeEnglishNo: { n: 46, mean: 31.10108695652174, sd: 9.647967483882201 },
  },
};

// Adult (18+) overall fallbacks.
const FALLBACK_NATIVE_ENGLISH: NormCell = { n: 8386, mean: 34.11401144765101, sd: 8.474358698767988 };
const FALLBACK_NON_NATIVE_ENGLISH: NormCell = { n: 2386, mean: 23.836818943839088, sd: 10.380320902359815 };

function getNorm(ageBand: AgeBandId, nativeEnglish: boolean): NormCell {
  const cell = nativeEnglish ? NORMS[ageBand].nativeEnglishYes : NORMS[ageBand].nativeEnglishNo;

  // Stability guard: if a norm group is very small, use the overall adult/native-English norms.
  // (This avoids producing wildly unstable estimates.)
  if (cell.n < 100 || cell.sd <= 0) return nativeEnglish ? FALLBACK_NATIVE_ENGLISH : FALLBACK_NON_NATIVE_ENGLISH;
  return cell;
}

const WRONG_PENALTY = 0.35;

function scoreSession(session: InstrumentSession) {
  const ageBandRaw = (getChoice(session.responses, 'viqt_age_band') ?? '').trim();
  const ageBand = AGE_BANDS.some((b) => b.id === ageBandRaw)
    ? (ageBandRaw as AgeBandId)
    : null;
  const nativeEnglish = session.responses.some((r) => r.itemId === 'viqt_native_english' && r.value === true);

  let right = 0;
  let wrong = 0;
  let dontKnow = 0;

  for (const item of ITEMS) {
    const v = getChoice(session.responses, item.id);
    if (!v || v === '-1') {
      dontKnow += 1;
      continue;
    }
    if (v === item.correctMask) right += 1;
    else wrong += 1;
  }

  const scoreFull = right - WRONG_PENALTY * wrong;
  const norm = ageBand
    ? getNorm(ageBand, nativeEnglish)
    : (nativeEnglish ? FALLBACK_NATIVE_ENGLISH : FALLBACK_NON_NATIVE_ENGLISH);
  const z = norm.sd > 0 ? (scoreFull - norm.mean) / norm.sd : 0;
  const iqEstimate = Math.round(100 + 15 * z);

  return { right, wrong, dontKnow, scoreFull, iqEstimate, ageBand, nativeEnglish, norm };
}

export const viqt: InstrumentPlugin = {
  definition: {
    id: 'viqt',
    title: 'Vocabulary IQ Test (VIQT; non-clinical estimate)',
    version: '1.0',
    intro:
      'This is an unproctored vocabulary-based cognitive test. It provides an IQ-scaled estimate (mean 100, SD 15) using internet-based norms from the Open-Source Psychometrics Project dataset, stratified by age band and native-language status.\n\nNotes: This is not a clinical instrument and is not a substitute for professionally administered testing. Results may be less accurate for non-native English speakers and on repeat attempts.\n\nScoring: +1 for a correct answer, -0.35 for an incorrect answer, and 0 for “Don\'t know”.\n\nSource: Open-Source Psychometrics Project (openpsychometrics.org) — VIQT_data.zip / codebook.txt (CC BY-NC-SA 4.0).',
    items: [
      {
        id: 'viqt_age_band',
        type: 'multiple-choice',
        required: true,
        prompt: 'Select your age band:',
        options: AGE_BANDS.map((b) => ({ id: b.id, label: b.label })),
      },
      {
        id: 'viqt_native_english',
        type: 'yes-no',
        required: true,
        prompt: 'Is English your native language?',
      },
      ...ITEMS.map((it) => ({
        id: it.id,
        type: 'multiple-choice' as const,
        required: true,
        prompt: makePrompt(it.words),
        options: OPTIONS,
      })),
    ],
  },

  score: (session: InstrumentSession): ScoreResult => {
    const { right, wrong, dontKnow, scoreFull, iqEstimate, ageBand, nativeEnglish, norm } = scoreSession(session);

    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      totalScore: iqEstimate,
      severity: `Norms used: age ${ageBand ?? 'unknown'}, native English ${nativeEnglish ? 'yes' : 'no'} (n=${norm.n}, mean=${norm.mean.toFixed(2)}, sd=${norm.sd.toFixed(2)})`,
      subscales: {
        'Correct (count)': right,
        'Wrong (count)': wrong,
        "Don't know (count)": dontKnow,
        'Raw score (score_full)': Number(scoreFull.toFixed(2)),
      },
      triggers: [],
    };
  },
};
