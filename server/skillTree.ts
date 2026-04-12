/**
 * skillTree.ts — 80-skill taxonomy for Nexus skill mastery tracking.
 *
 * Structure: 10 domains × ~8 skills each.
 * Each skill has: id, label, domain, prerequisites[], topicTags[], description.
 * Level scale: 0=locked, 1=novice, 2=apprentice, 3=journeyman, 4=expert
 */

export interface Skill {
  id: string;
  label: string;
  domain: string;
  prerequisites: string[];
  topicTags: string[];
  description: string;
}

export const SKILL_DOMAINS = [
  { id: "ai-ml", label: "AI & Machine Learning", color: "oklch(0.75 0.18 55)" },
  { id: "programming", label: "Programming", color: "oklch(0.65 0.22 200)" },
  { id: "mathematics", label: "Mathematics", color: "oklch(0.72 0.2 290)" },
  { id: "science", label: "Science", color: "oklch(0.72 0.18 150)" },
  { id: "critical-thinking", label: "Critical Thinking", color: "oklch(0.78 0.16 30)" },
  { id: "research", label: "Research & Analysis", color: "oklch(0.68 0.2 340)" },
  { id: "history", label: "History & Context", color: "oklch(0.74 0.15 80)" },
  { id: "philosophy", label: "Philosophy", color: "oklch(0.70 0.18 260)" },
  { id: "communication", label: "Communication", color: "oklch(0.73 0.16 160)" },
  { id: "technology", label: "Technology & Systems", color: "oklch(0.71 0.19 220)" },
] as const;

export const SKILLS: Skill[] = [
  // ─── AI & Machine Learning ──────────────────────────────────────────────
  { id: "ai-ml-fundamentals", label: "AI Fundamentals", domain: "ai-ml", prerequisites: [], topicTags: ["ai", "machine learning", "artificial intelligence"], description: "Core concepts of AI, its history, and current capabilities." },
  { id: "ml-supervised", label: "Supervised Learning", domain: "ai-ml", prerequisites: ["ai-ml-fundamentals"], topicTags: ["supervised learning", "classification", "regression", "training data"], description: "Training models on labeled data to predict outcomes." },
  { id: "ml-unsupervised", label: "Unsupervised Learning", domain: "ai-ml", prerequisites: ["ai-ml-fundamentals"], topicTags: ["clustering", "dimensionality reduction", "embeddings"], description: "Finding patterns in unlabeled data." },
  { id: "ml-neural-networks", label: "Neural Networks", domain: "ai-ml", prerequisites: ["ml-supervised"], topicTags: ["neural networks", "deep learning", "backpropagation", "layers"], description: "Architectures and training of artificial neural networks." },
  { id: "ml-transformers", label: "Transformers & LLMs", domain: "ai-ml", prerequisites: ["ml-neural-networks"], topicTags: ["transformers", "attention", "llm", "gpt", "bert"], description: "Attention mechanisms and large language model architectures." },
  { id: "ml-prompt-engineering", label: "Prompt Engineering", domain: "ai-ml", prerequisites: ["ai-ml-fundamentals"], topicTags: ["prompt engineering", "few-shot", "chain of thought", "prompting"], description: "Crafting effective prompts to elicit desired AI outputs." },
  { id: "ml-ethics", label: "AI Ethics & Safety", domain: "ai-ml", prerequisites: ["ai-ml-fundamentals"], topicTags: ["ai ethics", "bias", "fairness", "alignment", "safety"], description: "Ethical considerations, bias, fairness, and AI safety." },
  { id: "ml-rl", label: "Reinforcement Learning", domain: "ai-ml", prerequisites: ["ml-supervised", "ml-unsupervised"], topicTags: ["reinforcement learning", "reward", "agent", "policy"], description: "Training agents through reward-based feedback." },

  // ─── Programming ─────────────────────────────────────────────────────────
  { id: "prog-fundamentals", label: "Programming Fundamentals", domain: "programming", prerequisites: [], topicTags: ["programming", "variables", "functions", "loops", "conditionals"], description: "Core programming concepts applicable to any language." },
  { id: "prog-data-structures", label: "Data Structures", domain: "programming", prerequisites: ["prog-fundamentals"], topicTags: ["arrays", "linked lists", "trees", "graphs", "hash tables"], description: "Organizing and storing data efficiently." },
  { id: "prog-algorithms", label: "Algorithms", domain: "programming", prerequisites: ["prog-data-structures"], topicTags: ["sorting", "searching", "dynamic programming", "complexity"], description: "Problem-solving strategies and computational complexity." },
  { id: "prog-oop", label: "Object-Oriented Design", domain: "programming", prerequisites: ["prog-fundamentals"], topicTags: ["oop", "classes", "inheritance", "polymorphism", "encapsulation"], description: "Designing software with objects, classes, and inheritance." },
  { id: "prog-functional", label: "Functional Programming", domain: "programming", prerequisites: ["prog-fundamentals"], topicTags: ["functional", "pure functions", "immutability", "higher-order functions"], description: "Programming with pure functions and immutable data." },
  { id: "prog-web", label: "Web Development", domain: "programming", prerequisites: ["prog-fundamentals"], topicTags: ["html", "css", "javascript", "react", "api", "http"], description: "Building web applications and understanding the browser/server model." },
  { id: "prog-databases", label: "Databases & SQL", domain: "programming", prerequisites: ["prog-fundamentals"], topicTags: ["sql", "database", "orm", "relational", "nosql", "queries"], description: "Storing, querying, and managing structured data." },
  { id: "prog-systems", label: "Systems Programming", domain: "programming", prerequisites: ["prog-algorithms"], topicTags: ["operating systems", "concurrency", "memory", "processes", "threads"], description: "Low-level programming and systems concepts." },

  // ─── Mathematics ─────────────────────────────────────────────────────────
  { id: "math-logic", label: "Logic & Proof", domain: "mathematics", prerequisites: [], topicTags: ["logic", "proof", "boolean algebra", "sets", "propositions"], description: "Formal reasoning, logical operators, and mathematical proof." },
  { id: "math-statistics", label: "Statistics & Probability", domain: "mathematics", prerequisites: ["math-logic"], topicTags: ["probability", "statistics", "distributions", "hypothesis testing", "bayes"], description: "Quantifying uncertainty and drawing conclusions from data." },
  { id: "math-linear-algebra", label: "Linear Algebra", domain: "mathematics", prerequisites: ["math-logic"], topicTags: ["vectors", "matrices", "eigenvalues", "linear algebra"], description: "Vector spaces, matrix operations, and transformations." },
  { id: "math-calculus", label: "Calculus", domain: "mathematics", prerequisites: ["math-logic"], topicTags: ["derivatives", "integrals", "limits", "optimization", "calculus"], description: "Differential and integral calculus, optimization." },
  { id: "math-discrete", label: "Discrete Mathematics", domain: "mathematics", prerequisites: ["math-logic"], topicTags: ["combinatorics", "graph theory", "number theory", "discrete math"], description: "Combinatorics, graph theory, and discrete structures." },
  { id: "math-information-theory", label: "Information Theory", domain: "mathematics", prerequisites: ["math-statistics"], topicTags: ["entropy", "information theory", "compression", "channel capacity"], description: "Measuring and transmitting information efficiently." },
  { id: "math-optimization", label: "Optimization", domain: "mathematics", prerequisites: ["math-calculus", "math-linear-algebra"], topicTags: ["gradient descent", "optimization", "convex", "loss functions"], description: "Finding minima/maxima in continuous and discrete problems." },
  { id: "math-numerical", label: "Numerical Methods", domain: "mathematics", prerequisites: ["math-calculus"], topicTags: ["numerical methods", "approximation", "simulation", "floating point"], description: "Computational approaches to mathematical problems." },

  // ─── Science ──────────────────────────────────────────────────────────────
  { id: "sci-scientific-method", label: "Scientific Method", domain: "science", prerequisites: [], topicTags: ["scientific method", "hypothesis", "experiment", "evidence"], description: "Forming hypotheses, designing experiments, and interpreting evidence." },
  { id: "sci-physics-classical", label: "Classical Physics", domain: "science", prerequisites: ["sci-scientific-method"], topicTags: ["mechanics", "thermodynamics", "electromagnetism", "physics"], description: "Newton's laws, energy, heat, and electromagnetism." },
  { id: "sci-physics-modern", label: "Modern Physics", domain: "science", prerequisites: ["sci-physics-classical"], topicTags: ["quantum mechanics", "relativity", "particle physics"], description: "Quantum mechanics, relativity, and the subatomic world." },
  { id: "sci-chemistry", label: "Chemistry", domain: "science", prerequisites: ["sci-scientific-method"], topicTags: ["chemistry", "molecules", "reactions", "periodic table", "bonds"], description: "Atomic structure, chemical bonds, and reactions." },
  { id: "sci-biology", label: "Biology", domain: "science", prerequisites: ["sci-scientific-method"], topicTags: ["biology", "cells", "genetics", "evolution", "ecology"], description: "Living systems from cells to ecosystems." },
  { id: "sci-neuroscience", label: "Neuroscience", domain: "science", prerequisites: ["sci-biology"], topicTags: ["neuroscience", "brain", "cognition", "neurons", "consciousness"], description: "The brain, neural circuits, and cognitive processes." },
  { id: "sci-cognitive-science", label: "Cognitive Science", domain: "science", prerequisites: ["sci-neuroscience"], topicTags: ["cognition", "learning", "memory", "perception", "cognitive"], description: "How minds process information, learn, and reason." },
  { id: "sci-complexity", label: "Complex Systems", domain: "science", prerequisites: ["sci-scientific-method"], topicTags: ["emergence", "complex systems", "chaos", "networks", "self-organization"], description: "Emergent behavior, chaos, and self-organizing systems." },

  // ─── Critical Thinking ────────────────────────────────────────────────────
  { id: "ct-logic-fallacies", label: "Logical Fallacies", domain: "critical-thinking", prerequisites: [], topicTags: ["logical fallacies", "cognitive biases", "rhetoric", "argumentation"], description: "Identifying flawed reasoning and common argument mistakes." },
  { id: "ct-cognitive-biases", label: "Cognitive Biases", domain: "critical-thinking", prerequisites: ["ct-logic-fallacies"], topicTags: ["cognitive biases", "heuristics", "confirmation bias", "anchoring"], description: "Systematic errors in human thinking and judgment." },
  { id: "ct-epistemology", label: "Epistemology", domain: "critical-thinking", prerequisites: ["ct-logic-fallacies"], topicTags: ["epistemology", "knowledge", "belief", "justification", "truth"], description: "The nature, sources, and limits of knowledge." },
  { id: "ct-argument-analysis", label: "Argument Analysis", domain: "critical-thinking", prerequisites: ["ct-logic-fallacies"], topicTags: ["argument analysis", "premises", "conclusions", "deduction", "induction"], description: "Deconstructing and evaluating arguments systematically." },
  { id: "ct-decision-theory", label: "Decision Theory", domain: "critical-thinking", prerequisites: ["ct-cognitive-biases"], topicTags: ["decision theory", "expected value", "rational choice", "uncertainty"], description: "Frameworks for making rational decisions under uncertainty." },
  { id: "ct-systems-thinking", label: "Systems Thinking", domain: "critical-thinking", prerequisites: ["ct-argument-analysis"], topicTags: ["systems thinking", "feedback loops", "mental models", "second-order effects"], description: "Understanding problems as parts of interconnected systems." },
  { id: "ct-metacognition", label: "Metacognition", domain: "critical-thinking", prerequisites: ["ct-cognitive-biases"], topicTags: ["metacognition", "learning how to learn", "self-reflection", "deliberate practice"], description: "Thinking about your own thinking and optimizing learning." },
  { id: "ct-first-principles", label: "First Principles Reasoning", domain: "critical-thinking", prerequisites: ["ct-epistemology"], topicTags: ["first principles", "reasoning from scratch", "Socratic method", "decomposition"], description: "Reasoning from foundational truths rather than analogy." },

  // ─── Research & Analysis ─────────────────────────────────────────────────
  { id: "res-literature-review", label: "Literature Review", domain: "research", prerequisites: [], topicTags: ["literature review", "academic research", "sources", "citations"], description: "Finding, evaluating, and synthesizing existing knowledge." },
  { id: "res-information-literacy", label: "Information Literacy", domain: "research", prerequisites: ["res-literature-review"], topicTags: ["information literacy", "source evaluation", "fact-checking", "credibility"], description: "Evaluating source quality, detecting misinformation." },
  { id: "res-data-analysis", label: "Data Analysis", domain: "research", prerequisites: ["res-literature-review"], topicTags: ["data analysis", "interpretation", "visualization", "patterns"], description: "Extracting insights from structured and unstructured data." },
  { id: "res-rag-systems", label: "RAG & Knowledge Systems", domain: "research", prerequisites: ["res-information-literacy"], topicTags: ["rag", "retrieval augmented generation", "embeddings", "vector search"], description: "Retrieval-augmented generation and personal knowledge bases." },
  { id: "res-synthesis", label: "Knowledge Synthesis", domain: "research", prerequisites: ["res-data-analysis"], topicTags: ["synthesis", "summarization", "connecting ideas", "insight extraction"], description: "Combining ideas from multiple sources into coherent understanding." },
  { id: "res-citation-practice", label: "Citation & Attribution", domain: "research", prerequisites: ["res-literature-review"], topicTags: ["citations", "apa", "mla", "academic writing", "bibliography"], description: "Proper attribution across APA, MLA, Chicago, and Harvard formats." },

  // ─── History & Context ────────────────────────────────────────────────────
  { id: "hist-world-history", label: "World History", domain: "history", prerequisites: [], topicTags: ["world history", "civilizations", "empires", "historical events"], description: "Major civilizations, events, and patterns across human history." },
  { id: "hist-history-of-science", label: "History of Science", domain: "history", prerequisites: ["hist-world-history"], topicTags: ["history of science", "scientific revolution", "paradigm shifts"], description: "How scientific knowledge developed and transformed society." },
  { id: "hist-history-of-computing", label: "History of Computing", domain: "history", prerequisites: ["hist-world-history"], topicTags: ["history of computing", "turing", "internet", "programming history"], description: "The evolution from mechanical computers to modern AI." },
  { id: "hist-economics", label: "Economic History", domain: "history", prerequisites: ["hist-world-history"], topicTags: ["economics", "markets", "capitalism", "economic history", "trade"], description: "Economic systems, markets, and their historical development." },
  { id: "hist-geopolitics", label: "Geopolitics", domain: "history", prerequisites: ["hist-world-history"], topicTags: ["geopolitics", "nations", "power", "conflict", "diplomacy"], description: "How geography, resources, and power shape world affairs." },
  { id: "hist-cultural-analysis", label: "Cultural Analysis", domain: "history", prerequisites: ["hist-world-history"], topicTags: ["culture", "art history", "society", "anthropology"], description: "Understanding societies through their cultural outputs." },

  // ─── Philosophy ───────────────────────────────────────────────────────────
  { id: "phil-introduction", label: "Introduction to Philosophy", domain: "philosophy", prerequisites: [], topicTags: ["philosophy", "metaphysics", "ontology", "existence"], description: "Core philosophical questions about existence, knowledge, and reality." },
  { id: "phil-ethics", label: "Ethics", domain: "philosophy", prerequisites: ["phil-introduction"], topicTags: ["ethics", "morality", "consequentialism", "deontology", "virtue ethics"], description: "Frameworks for determining right and wrong action." },
  { id: "phil-philosophy-of-mind", label: "Philosophy of Mind", domain: "philosophy", prerequisites: ["phil-introduction"], topicTags: ["consciousness", "qualia", "mind-body problem", "philosophy of mind"], description: "Consciousness, subjective experience, and mental causation." },
  { id: "phil-philosophy-of-science", label: "Philosophy of Science", domain: "philosophy", prerequisites: ["phil-introduction"], topicTags: ["philosophy of science", "falsification", "paradigms", "causation"], description: "What makes scientific knowledge reliable and how it grows." },
  { id: "phil-political-philosophy", label: "Political Philosophy", domain: "philosophy", prerequisites: ["phil-ethics"], topicTags: ["political philosophy", "justice", "rights", "democracy", "social contract"], description: "Theories of justice, governance, and political legitimacy." },
  { id: "phil-logic", label: "Formal Logic", domain: "philosophy", prerequisites: ["phil-introduction"], topicTags: ["formal logic", "predicate logic", "proofs", "syllogism"], description: "Symbolic logic, propositional calculus, and formal proofs." },
  { id: "phil-ai-philosophy", label: "Philosophy of AI", domain: "philosophy", prerequisites: ["phil-philosophy-of-mind"], topicTags: ["philosophy of ai", "turing test", "chinese room", "intelligence", "personhood"], description: "What AI is, whether it can think, and what it means for humanity." },

  // ─── Communication ────────────────────────────────────────────────────────
  { id: "comm-writing", label: "Clear Writing", domain: "communication", prerequisites: [], topicTags: ["writing", "clarity", "prose", "structure", "essays"], description: "Writing with precision, clarity, and persuasive structure." },
  { id: "comm-technical-writing", label: "Technical Writing", domain: "communication", prerequisites: ["comm-writing"], topicTags: ["technical writing", "documentation", "specification", "readability"], description: "Explaining complex technical concepts clearly and accurately." },
  { id: "comm-rhetoric", label: "Rhetoric & Persuasion", domain: "communication", prerequisites: ["comm-writing"], topicTags: ["rhetoric", "persuasion", "ethos", "pathos", "logos"], description: "Crafting persuasive arguments using classical rhetorical techniques." },
  { id: "comm-socratic-dialogue", label: "Socratic Dialogue", domain: "communication", prerequisites: ["comm-rhetoric"], topicTags: ["socratic method", "questioning", "dialogue", "elicitation"], description: "Using questions to guide others toward insight and discovery." },
  { id: "comm-explanation", label: "The Art of Explanation", domain: "communication", prerequisites: ["comm-writing"], topicTags: ["explanation", "analogies", "teaching", "feynman technique"], description: "Breaking down complex ideas so anyone can understand them." },

  // ─── Technology & Systems ────────────────────────────────────────────────
  { id: "tech-internet", label: "How the Internet Works", domain: "technology", prerequisites: [], topicTags: ["internet", "tcp/ip", "http", "dns", "networking"], description: "Protocols, infrastructure, and the architecture of the internet." },
  { id: "tech-security", label: "Cybersecurity Fundamentals", domain: "technology", prerequisites: ["tech-internet"], topicTags: ["security", "encryption", "authentication", "vulnerabilities", "privacy"], description: "Protecting systems, data, and identities online." },
  { id: "tech-cloud", label: "Cloud Computing", domain: "technology", prerequisites: ["tech-internet"], topicTags: ["cloud", "aws", "serverless", "containers", "deployment"], description: "Cloud infrastructure, services, and deployment models." },
  { id: "tech-distributed-systems", label: "Distributed Systems", domain: "technology", prerequisites: ["tech-cloud"], topicTags: ["distributed systems", "consensus", "cap theorem", "microservices"], description: "Designing systems that run across multiple machines." },
  { id: "tech-data-engineering", label: "Data Engineering", domain: "technology", prerequisites: ["tech-cloud", "prog-databases"], topicTags: ["data pipelines", "etl", "data warehouses", "streaming", "batch processing"], description: "Building systems to collect, store, and process data at scale." },
  { id: "tech-hardware", label: "Computer Architecture", domain: "technology", prerequisites: [], topicTags: ["cpu", "memory", "hardware", "computer architecture", "isa"], description: "How CPUs, memory, and hardware systems work together." },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function getSkillById(id: string): Skill | undefined {
  return SKILLS.find(s => s.id === id);
}

export function getSkillsByDomain(domain: string): Skill[] {
  return SKILLS.filter(s => s.domain === domain);
}

export function getPrerequisiteChain(skillId: string, visited = new Set<string>()): string[] {
  if (visited.has(skillId)) return [];
  visited.add(skillId);
  const skill = getSkillById(skillId);
  if (!skill) return [];
  const chain: string[] = [];
  for (const prereq of skill.prerequisites) {
    chain.push(...getPrerequisiteChain(prereq, visited), prereq);
  }
  return [...new Set(chain)];
}

export function matchSkillsToTopics(topics: string[]): string[] {
  const lowerTopics = topics.map(t => t.toLowerCase());
  return SKILLS.filter(skill =>
    skill.topicTags.some(tag => lowerTopics.some(t => t.includes(tag) || tag.includes(t)))
  ).map(s => s.id);
}
