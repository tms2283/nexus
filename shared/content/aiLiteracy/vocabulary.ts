/**
 * Vocabulary map — every key term in the AI Literacy course with three
 * reading-level variants. The seed factory selects a variant based on the
 * learner's profile.readingLevel.
 */

import type { ReadingLevel } from "../../types/learnerProfile";

export interface VocabEntry {
  term: string;
  glosses: Record<ReadingLevel, string>;
  /** Optional analogy used by the analogy block. */
  analogy?: string;
}

export const VOCABULARY: Record<string, VocabEntry> = {
  "artificial-intelligence": {
    term: "Artificial Intelligence",
    glosses: {
      plain:
        "Computers doing things that usually need a person — like understanding what you say or recognising a face.",
      standard:
        "Computer systems that perform tasks normally requiring human intelligence: language, perception, decision-making, learning from data.",
      technical:
        "A field of computer science concerned with building systems that approximate cognitive functions through computation, statistics, and learned representations.",
    },
  },
  "machine-learning": {
    term: "Machine Learning",
    glosses: {
      plain: "Teaching a computer by showing it lots of examples instead of writing exact rules.",
      standard:
        "A subfield of AI in which systems improve at a task by adjusting internal parameters based on examples rather than hand-written rules.",
      technical:
        "The discipline of constructing models that generalise from training data by minimising a loss function over a parameterised hypothesis space.",
    },
  },
  "deep-learning": {
    term: "Deep Learning",
    glosses: {
      plain: "A kind of machine learning that uses many layers, similar to stacking filters on a photo.",
      standard:
        "Machine learning using neural networks with many layers — the architecture behind LLMs, image recognition, and speech systems.",
      technical:
        "Representation learning via composed non-linear transformations in deep neural architectures, optimised via gradient descent and backpropagation.",
    },
  },
  llm: {
    term: "Large Language Model",
    glosses: {
      plain: "A program trained on huge amounts of text so it can finish sentences and answer questions in writing.",
      standard:
        "A neural model trained on vast text corpora to predict the next token, capable of generating and understanding natural language.",
      technical:
        "A transformer-based autoregressive language model with billions of parameters, trained on internet-scale corpora using next-token prediction.",
    },
    analogy:
      "Like an autocomplete that has read most of the internet — it predicts what word comes next, then again, and again.",
  },
  hallucination: {
    term: "Hallucination",
    glosses: {
      plain: "When an AI confidently makes up something that is not true.",
      standard:
        "A failure mode in which an AI system generates content that sounds plausible but is factually incorrect or fabricated.",
      technical:
        "An output distribution that assigns high probability to falsifiable claims unsupported by training data or retrievable evidence.",
    },
  },
  bias: {
    term: "Bias",
    glosses: {
      plain: "When an AI's answers favour some groups over others, often because the data did.",
      standard:
        "Systematic skew in an AI system's predictions or behaviour, typically inherited from training data, labels, or design choices.",
      technical:
        "Statistical or representational disparities encoded in model parameters that produce inequitable outcomes across demographic strata.",
    },
  },
  prompt: {
    term: "Prompt",
    glosses: {
      plain: "What you type to the AI to tell it what you want.",
      standard:
        "The natural-language instruction or context provided to an LLM that conditions its output.",
      technical:
        "An input token sequence that conditions a language model's output distribution; prompt engineering shapes inference behaviour without retraining.",
    },
  },
  "narrow-ai": {
    term: "Narrow AI",
    glosses: {
      plain: "AI that is good at one specific job, like playing chess or recognising spam.",
      standard:
        "AI systems that excel at a narrowly scoped task and cannot generalise outside that domain. All current AI is narrow AI.",
      technical:
        "Task-specific AI lacking domain transfer; contrasted with hypothetical artificial general intelligence (AGI).",
    },
  },
};
