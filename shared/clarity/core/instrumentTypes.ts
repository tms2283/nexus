export type InstrumentId = string;

export type Likert03 = 0 | 1 | 2 | 3;

export type Likert15 = 1 | 2 | 3 | 4 | 5;

export type LikertValue = number;

export type LikertScale = {
  min: number;
  max: number;
  labels: readonly string[];
};

export type InstrumentItemType = 'likert-0-3' | 'likert-1-5' | 'likert' | 'yes-no' | 'multiple-choice' | 'text';

export type MultipleChoiceOption = {
  id: string;
  label: string;
};

export type InstrumentItem = {
  id: string;
  prompt: string;
  type: InstrumentItemType;
  scale?: LikertScale;
  options?: MultipleChoiceOption[];
  required?: boolean;
};

export type InstrumentDefinition = {
  id: InstrumentId;
  title: string;
  version: string;
  intro?: string;
  items: InstrumentItem[];
};

export type InstrumentResponseValue = LikertValue | boolean | string | null;

export type InstrumentResponse = {
  itemId: string;
  value: InstrumentResponseValue;
};

export type InstrumentSession = {
  sessionId: string;
  instrumentId: InstrumentId;
  instrumentVersion: string;
  startedAt: string;
  completedAt?: string;
  responses: InstrumentResponse[];
};

export type SeverityBand = {
  label: string;
  min: number;
  max: number;
};

export type CrisisTrigger =
  | { type: 'show-crisis-resources'; reason: string; instrumentId: InstrumentId; itemId?: string };

export type ScoreResult = {
  instrumentId: InstrumentId;
  instrumentVersion: string;
  totalScore?: number;
  severity?: string;
  bands?: SeverityBand[];
  subscales?: Record<string, number>;
  triggers: CrisisTrigger[];
};

export type InstrumentPlugin = {
  definition: InstrumentDefinition;
  score: (session: InstrumentSession) => ScoreResult;
};
