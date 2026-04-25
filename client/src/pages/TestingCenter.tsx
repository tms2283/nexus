import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, BookOpen, Calculator, FlaskConical, Globe, Lightbulb, Trophy, Clock, ChevronRight, CheckCircle, XCircle, RotateCcw, BarChart3, Star, Zap, Target, ArrowLeft, Map, Palette, Cpu, Scroll } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Question {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  category?: string;
}

interface TestConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  questions: Question[];
  timeLimit: number; // seconds
  passingScore: number; // percentage
}

// ─── IQ Test Questions (Legitimate Psychometric Style) ────────────────────────
const iqQuestions: Question[] = [
  // Matrix Reasoning
  {
    id: "iq1",
    question: "Complete the sequence: 2, 6, 18, 54, ___",
    options: ["108", "162", "216", "72"],
    correct: 1,
    explanation: "Each term is multiplied by 3. 54 × 3 = 162.",
    category: "Numerical Reasoning"
  },
  {
    id: "iq2",
    question: "If all Bloops are Razzles, and all Razzles are Lazzles, then all Bloops are definitely:",
    options: ["Razzles only", "Lazzles", "Neither Razzles nor Lazzles", "Cannot be determined"],
    correct: 1,
    explanation: "Transitive property: Bloops → Razzles → Lazzles, therefore all Bloops are Lazzles.",
    category: "Logical Reasoning"
  },
  {
    id: "iq3",
    question: "Which number is the odd one out? 3, 5, 11, 14, 17, 21",
    options: ["3", "14", "21", "11"],
    correct: 1,
    explanation: "All others are prime numbers. 14 = 2 × 7 is composite.",
    category: "Pattern Recognition"
  },
  {
    id: "iq4",
    question: "A clock shows 3:15. What is the angle between the hour and minute hands?",
    options: ["0°", "7.5°", "15°", "22.5°"],
    correct: 1,
    explanation: "At 3:15, minute hand is at 90°. Hour hand moves 0.5° per minute: 3×30 + 15×0.5 = 97.5°. Difference = 97.5 - 90 = 7.5°.",
    category: "Spatial Reasoning"
  },
  {
    id: "iq5",
    question: "BOOK is to LIBRARY as PAINTING is to:",
    options: ["Canvas", "Artist", "Gallery", "Museum"],
    correct: 2,
    explanation: "A book is stored/displayed in a library; a painting is stored/displayed in a gallery.",
    category: "Verbal Analogies"
  },
  {
    id: "iq6",
    question: "What comes next? A, C, F, J, O, ___",
    options: ["T", "U", "V", "W"],
    correct: 1,
    explanation: "Gaps increase: +2, +3, +4, +5, +6. O is the 15th letter. 15+6=21 = U.",
    category: "Pattern Recognition"
  },
  {
    id: "iq7",
    question: "If you rearrange the letters 'CIFAIPC', you get the name of a(n):",
    options: ["City", "Animal", "Ocean", "Country"],
    correct: 2,
    explanation: "CIFAIPC rearranged = PACIFIC — an ocean.",
    category: "Verbal Reasoning"
  },
  {
    id: "iq8",
    question: "A train travels 120 miles in 2 hours. At the same speed, how far will it travel in 3.5 hours?",
    options: ["180 miles", "200 miles", "210 miles", "240 miles"],
    correct: 2,
    explanation: "Speed = 60 mph. Distance = 60 × 3.5 = 210 miles.",
    category: "Numerical Reasoning"
  },
  {
    id: "iq9",
    question: "Which figure completes the pattern? Row 1: ○ □ △ | Row 2: □ △ ○ | Row 3: △ ○ ___",
    options: ["○", "△", "□", "◇"],
    correct: 2,
    explanation: "Each row contains ○, □, △ exactly once. Row 3 has △ and ○, so the missing shape is □.",
    category: "Matrix Reasoning"
  },
  {
    id: "iq10",
    question: "If 5 machines can make 5 widgets in 5 minutes, how many minutes does it take 100 machines to make 100 widgets?",
    options: ["100 minutes", "20 minutes", "5 minutes", "1 minute"],
    correct: 2,
    explanation: "Each machine makes 1 widget in 5 minutes. 100 machines make 100 widgets simultaneously in 5 minutes.",
    category: "Logical Reasoning"
  },
  {
    id: "iq11",
    question: "What is the missing number? 1, 1, 2, 3, 5, 8, 13, ___",
    options: ["18", "20", "21", "24"],
    correct: 2,
    explanation: "Fibonacci sequence: each number = sum of two preceding. 8 + 13 = 21.",
    category: "Pattern Recognition"
  },
  {
    id: "iq12",
    question: "Doctor is to Patient as Lawyer is to:",
    options: ["Law", "Court", "Client", "Judge"],
    correct: 2,
    explanation: "A doctor serves a patient; a lawyer serves a client.",
    category: "Verbal Analogies"
  },
  {
    id: "iq13",
    question: "How many squares of all sizes are in a 3×3 grid?",
    options: ["9", "12", "14", "16"],
    correct: 2,
    explanation: "1×1: 9, 2×2: 4, 3×3: 1. Total = 9+4+1 = 14.",
    category: "Spatial Reasoning"
  },
  {
    id: "iq14",
    question: "Which word does NOT belong? Violin, Cello, Trumpet, Viola",
    options: ["Violin", "Cello", "Trumpet", "Viola"],
    correct: 2,
    explanation: "Violin, Cello, and Viola are all string instruments. Trumpet is a brass instrument.",
    category: "Verbal Reasoning"
  },
  {
    id: "iq15",
    question: "If today is Wednesday, what day will it be 100 days from now?",
    options: ["Monday", "Tuesday", "Wednesday", "Friday"],
    correct: 3,
    explanation: "100 ÷ 7 = 14 remainder 2. Wednesday + 2 days = Friday.",
    category: "Numerical Reasoning"
  },
];

// ─── Subject Test Questions ───────────────────────────────────────────────────
const scienceQuestions: Question[] = [
  { id: "sci1", question: "What is the powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi apparatus"], correct: 2, explanation: "Mitochondria produce ATP through cellular respiration, earning the 'powerhouse' title." },
  { id: "sci2", question: "What is the speed of light in a vacuum?", options: ["3×10⁶ m/s", "3×10⁸ m/s", "3×10¹⁰ m/s", "3×10⁴ m/s"], correct: 1, explanation: "The speed of light (c) ≈ 299,792,458 m/s ≈ 3×10⁸ m/s." },
  { id: "sci3", question: "Which element has the atomic number 79?", options: ["Silver", "Platinum", "Gold", "Copper"], correct: 2, explanation: "Gold (Au) has atomic number 79." },
  { id: "sci4", question: "What force keeps planets in orbit around the Sun?", options: ["Magnetic force", "Nuclear force", "Gravitational force", "Electromagnetic force"], correct: 2, explanation: "Gravity is the attractive force between masses that keeps planets in orbit." },
  { id: "sci5", question: "DNA is composed of which sugar?", options: ["Ribose", "Glucose", "Fructose", "Deoxyribose"], correct: 3, explanation: "DNA contains deoxyribose sugar; RNA contains ribose." },
  { id: "sci6", question: "What is the pH of pure water at 25°C?", options: ["6", "7", "8", "9"], correct: 1, explanation: "Pure water has a neutral pH of 7." },
  { id: "sci7", question: "Which planet has the most moons?", options: ["Jupiter", "Saturn", "Uranus", "Neptune"], correct: 1, explanation: "Saturn has 146 confirmed moons as of 2023, more than any other planet." },
  { id: "sci8", question: "What is Newton's second law of motion?", options: ["F = mv", "F = ma", "F = m/a", "F = a/m"], correct: 1, explanation: "Newton's second law: Force = mass × acceleration (F = ma)." },
  { id: "sci9", question: "Which gas makes up approximately 78% of Earth's atmosphere?", options: ["Oxygen", "Carbon dioxide", "Argon", "Nitrogen"], correct: 3, explanation: "Nitrogen (N₂) comprises ~78% of Earth's atmosphere." },
  { id: "sci10", question: "What is the process by which plants make food?", options: ["Respiration", "Fermentation", "Photosynthesis", "Transpiration"], correct: 2, explanation: "Photosynthesis converts light energy, CO₂, and water into glucose and oxygen." },
];

const historyQuestions: Question[] = [
  { id: "hist1", question: "In what year did World War II end?", options: ["1943", "1944", "1945", "1946"], correct: 2, explanation: "WWII ended in 1945: V-E Day (May 8) and V-J Day (September 2)." },
  { id: "hist2", question: "Who was the first President of the United States?", options: ["John Adams", "Thomas Jefferson", "Benjamin Franklin", "George Washington"], correct: 3, explanation: "George Washington served as the 1st President from 1789 to 1797." },
  { id: "hist3", question: "The Renaissance began in which country?", options: ["France", "England", "Italy", "Germany"], correct: 2, explanation: "The Renaissance began in Italy (Florence) in the 14th century." },
  { id: "hist4", question: "What year did the Berlin Wall fall?", options: ["1987", "1988", "1989", "1991"], correct: 2, explanation: "The Berlin Wall fell on November 9, 1989." },
  { id: "hist5", question: "Which ancient wonder was located in Alexandria, Egypt?", options: ["Colossus of Rhodes", "Lighthouse of Alexandria", "Hanging Gardens", "Temple of Artemis"], correct: 1, explanation: "The Lighthouse of Alexandria (Pharos) was one of the Seven Wonders of the Ancient World." },
  { id: "hist6", question: "Who wrote the Declaration of Independence?", options: ["Benjamin Franklin", "John Adams", "Thomas Jefferson", "Alexander Hamilton"], correct: 2, explanation: "Thomas Jefferson was the primary author of the Declaration of Independence (1776)." },
  { id: "hist7", question: "The French Revolution began in what year?", options: ["1776", "1789", "1799", "1815"], correct: 1, explanation: "The French Revolution began in 1789 with the storming of the Bastille." },
  { id: "hist8", question: "Which empire was ruled by Genghis Khan?", options: ["Ottoman Empire", "Roman Empire", "Mongol Empire", "Byzantine Empire"], correct: 2, explanation: "Genghis Khan founded and ruled the Mongol Empire, the largest contiguous land empire in history." },
  { id: "hist9", question: "In what year did the United States land on the Moon?", options: ["1967", "1968", "1969", "1970"], correct: 2, explanation: "Apollo 11 landed on the Moon on July 20, 1969." },
  { id: "hist10", question: "Who was the first woman to win a Nobel Prize?", options: ["Rosalind Franklin", "Marie Curie", "Dorothy Hodgkin", "Lise Meitner"], correct: 1, explanation: "Marie Curie won the Nobel Prize in Physics in 1903 (and Chemistry in 1911)." },
];

const mathQuestions: Question[] = [
  { id: "math1", question: "What is the value of π (pi) to 4 decimal places?", options: ["3.1415", "3.1416", "3.1418", "3.1412"], correct: 1, explanation: "π ≈ 3.14159... which rounds to 3.1416 at 4 decimal places." },
  { id: "math2", question: "What is the derivative of x²?", options: ["x", "2x", "x²", "2"], correct: 1, explanation: "d/dx(x²) = 2x by the power rule." },
  { id: "math3", question: "What is 15% of 240?", options: ["32", "36", "40", "44"], correct: 1, explanation: "15% of 240 = 0.15 × 240 = 36." },
  { id: "math4", question: "What is the sum of angles in a triangle?", options: ["90°", "180°", "270°", "360°"], correct: 1, explanation: "The interior angles of any triangle always sum to 180°." },
  { id: "math5", question: "Solve: 2x + 5 = 17", options: ["x = 4", "x = 5", "x = 6", "x = 7"], correct: 2, explanation: "2x = 17 - 5 = 12, therefore x = 6." },
  { id: "math6", question: "What is the area of a circle with radius 5?", options: ["25π", "10π", "5π", "50π"], correct: 0, explanation: "Area = πr² = π × 5² = 25π." },
  { id: "math7", question: "What is log₁₀(1000)?", options: ["2", "3", "4", "10"], correct: 1, explanation: "log₁₀(1000) = log₁₀(10³) = 3." },
  { id: "math8", question: "What is the Pythagorean theorem?", options: ["a² + b = c²", "a² + b² = c²", "a + b = c", "a² - b² = c²"], correct: 1, explanation: "a² + b² = c² where c is the hypotenuse of a right triangle." },
  { id: "math9", question: "What is the probability of rolling a 6 on a fair die?", options: ["1/3", "1/4", "1/6", "1/5"], correct: 2, explanation: "A fair die has 6 equally likely outcomes, so P(6) = 1/6." },
  { id: "math10", question: "What is 8! (8 factorial)?", options: ["5040", "40320", "720", "362880"], correct: 1, explanation: "8! = 8×7×6×5×4×3×2×1 = 40,320." },
];

const aiKnowledgeQuestions: Question[] = [
  { id: "ai1", question: "What does 'LLM' stand for in AI?", options: ["Large Language Model", "Linear Learning Machine", "Layered Logic Module", "Long-term Learning Memory"], correct: 0, explanation: "LLM = Large Language Model — AI systems trained on vast text data to understand and generate language." },
  { id: "ai2", question: "What technique involves giving an AI model examples in the prompt to guide its output?", options: ["Fine-tuning", "Few-shot prompting", "Reinforcement learning", "Transfer learning"], correct: 1, explanation: "Few-shot prompting provides examples within the prompt to guide the model's response style and format." },
  { id: "ai3", question: "What is 'hallucination' in the context of AI?", options: ["AI generating visual images", "AI producing confident but false information", "AI becoming self-aware", "AI refusing to answer"], correct: 1, explanation: "Hallucination refers to AI generating plausible-sounding but factually incorrect information with apparent confidence." },
  { id: "ai4", question: "What is the primary purpose of the 'temperature' parameter in LLMs?", options: ["Speed of response", "Randomness/creativity of output", "Length of response", "Memory capacity"], correct: 1, explanation: "Temperature controls randomness: 0 = deterministic, 1+ = more creative/random outputs." },
  { id: "ai5", question: "What is 'RAG' in AI systems?", options: ["Recursive Attention Generation", "Retrieval-Augmented Generation", "Rapid AI Generation", "Reinforced Attention Graph"], correct: 1, explanation: "RAG (Retrieval-Augmented Generation) combines a retrieval system with an LLM to ground responses in real documents." },
  { id: "ai6", question: "Which of these is NOT a type of machine learning?", options: ["Supervised learning", "Unsupervised learning", "Deterministic learning", "Reinforcement learning"], correct: 2, explanation: "The three main ML paradigms are supervised, unsupervised, and reinforcement learning. 'Deterministic learning' is not a recognized category." },
  { id: "ai7", question: "What does 'prompt engineering' primarily involve?", options: ["Writing code to train AI models", "Crafting effective inputs to get better AI outputs", "Designing AI hardware", "Building neural network architectures"], correct: 1, explanation: "Prompt engineering is the practice of designing and refining prompts to elicit better, more accurate, or more useful responses from AI models." },
  { id: "ai8", question: "What is a 'transformer' in modern AI?", options: ["A power supply component", "An attention-based neural network architecture", "A data preprocessing tool", "A type of reinforcement learning"], correct: 1, explanation: "The Transformer architecture (introduced in 'Attention Is All You Need', 2017) uses self-attention mechanisms and is the foundation of modern LLMs." },
  { id: "ai9", question: "What is 'fine-tuning' in the context of LLMs?", options: ["Adjusting the prompt wording", "Further training a pre-trained model on specific data", "Reducing model size", "Increasing inference speed"], correct: 1, explanation: "Fine-tuning adapts a pre-trained model to a specific task or domain by training it further on targeted datasets." },
  { id: "ai10", question: "What is the 'context window' of an LLM?", options: ["The visual interface of the AI", "The maximum amount of text the model can process at once", "The training data size", "The model's memory between sessions"], correct: 1, explanation: "The context window is the maximum number of tokens (words/characters) an LLM can process in a single interaction." },
];

const logicQuestions: Question[] = [
  { id: "log1", question: "All mammals are warm-blooded. Whales are mammals. Therefore:", options: ["Whales are fish", "Whales are warm-blooded", "All warm-blooded animals are mammals", "Whales are cold-blooded"], correct: 1, explanation: "Valid syllogism: All mammals → warm-blooded. Whale → mammal. Therefore whale → warm-blooded." },
  { id: "log2", question: "If P → Q and Q → R, then:", options: ["R → P", "P → R", "Q → P", "R → Q"], correct: 1, explanation: "Hypothetical syllogism (transitivity): If P implies Q, and Q implies R, then P implies R." },
  { id: "log3", question: "Which is the contrapositive of 'If it rains, then the ground is wet'?", options: ["If the ground is wet, then it rained", "If it doesn't rain, the ground isn't wet", "If the ground isn't wet, then it didn't rain", "If it rains, the ground isn't wet"], correct: 2, explanation: "Contrapositive of P→Q is ¬Q→¬P. 'If the ground is NOT wet, then it did NOT rain.'" },
  { id: "log4", question: "A is taller than B. B is taller than C. C is taller than D. Who is the shortest?", options: ["A", "B", "C", "D"], correct: 3, explanation: "A > B > C > D, therefore D is the shortest." },
  { id: "log5", question: "What logical fallacy is: 'You can't trust John's opinion on climate change — he drives an SUV'?", options: ["Straw man", "Ad hominem", "False dichotomy", "Slippery slope"], correct: 1, explanation: "Ad hominem attacks the person rather than their argument." },
  { id: "log6", question: "If no A are B, and all C are B, then:", options: ["All C are A", "No C are A", "Some C are A", "Cannot determine"], correct: 1, explanation: "If no A are B, and all C are B, then C and A share no members — no C are A." },
  { id: "log7", question: "Which argument is valid? (P1: All dogs bark. P2: Rex barks.)", options: ["Rex is a dog", "Rex might be a dog", "Rex is not a dog", "Cannot conclude"], correct: 3, explanation: "This is the fallacy of affirming the consequent. Other things bark too. We cannot conclude Rex is a dog." },
  { id: "log8", question: "In Boolean logic, what is TRUE AND FALSE?", options: ["TRUE", "FALSE", "UNDEFINED", "NULL"], correct: 1, explanation: "AND requires both operands to be TRUE. TRUE AND FALSE = FALSE." },
  { id: "log9", question: "What is the negation of 'Some cats are black'?", options: ["All cats are black", "No cats are black", "Some cats are not black", "All cats are not black"], correct: 1, explanation: "The negation of 'Some A are B' is 'No A are B' (¬∃x: Ax ∧ Bx = ∀x: Ax → ¬Bx)." },
  { id: "log10", question: "A says 'B always lies'. B says 'A always tells the truth'. Who is telling the truth?", options: ["A only", "B only", "Both", "Neither — it's a paradox"], correct: 3, explanation: "If A tells the truth, then B lies, so B's statement that A tells the truth is false — contradiction. This is a self-referential paradox." },
];

// ─── Test Configurations ──────────────────────────────────────────────────────
const tests: TestConfig[] = [
  {
    id: "iq",
    title: "IQ Assessment",
    description: "Psychometric test measuring logical, numerical, verbal, and spatial reasoning. Normed to standard IQ scale.",
    icon: <Brain size={28} />,
    color: "oklch(0.75 0.18 280)",
    questions: iqQuestions,
    timeLimit: 1200, // 20 minutes
    passingScore: 60,
  },
  {
    id: "ai",
    title: "AI Knowledge",
    description: "Assess your understanding of artificial intelligence concepts, LLMs, prompt engineering, and ML fundamentals.",
    icon: <Zap size={28} />,
    color: "oklch(0.75 0.18 200)",
    questions: aiKnowledgeQuestions,
    timeLimit: 600,
    passingScore: 70,
  },
  {
    id: "science",
    title: "Science",
    description: "Covers physics, chemistry, biology, and earth science at a high school to early college level.",
    icon: <FlaskConical size={28} />,
    color: "oklch(0.75 0.20 150)",
    questions: scienceQuestions,
    timeLimit: 600,
    passingScore: 70,
  },
  {
    id: "history",
    title: "World History",
    description: "Key events, figures, and turning points from ancient civilizations to the modern era.",
    icon: <Globe size={28} />,
    color: "oklch(0.75 0.18 40)",
    questions: historyQuestions,
    timeLimit: 600,
    passingScore: 70,
  },
  {
    id: "math",
    title: "Mathematics",
    description: "Arithmetic, algebra, geometry, calculus, and probability — from fundamentals to advanced concepts.",
    icon: <Calculator size={28} />,
    color: "oklch(0.75 0.20 0)",
    questions: mathQuestions,
    timeLimit: 720,
    passingScore: 70,
  },
  {
    id: "logic",
    title: "Logic & Reasoning",
    description: "Deductive reasoning, logical fallacies, Boolean logic, and formal argument analysis.",
    icon: <Lightbulb size={28} />,
    color: "oklch(0.75 0.18 60)",
    questions: logicQuestions,
    timeLimit: 600,
    passingScore: 70,
  },
  {
    id: "geography",
    title: "World Geography",
    description: "Countries, capitals, physical geography, climate zones, and geopolitical regions.",
    icon: <Map size={28} />,
    color: "oklch(0.72 0.20 200)",
    questions: [
      { id: "geo1", question: "What is the capital of Australia?", options: ["Sydney", "Melbourne", "Canberra", "Brisbane"], correct: 2, explanation: "Canberra is Australia's capital, chosen as a compromise between Sydney and Melbourne." },
      { id: "geo2", question: "Which is the world's largest ocean?", options: ["Atlantic", "Indian", "Pacific", "Arctic"], correct: 2, explanation: "The Pacific Ocean covers more than 165 million km\u00b2, larger than all land masses combined." },
      { id: "geo3", question: "The Amazon River flows primarily through which country?", options: ["Colombia", "Peru", "Brazil", "Venezuela"], correct: 2, explanation: "About 60% of the Amazon basin lies within Brazil." },
      { id: "geo4", question: "Which country has the most natural lakes?", options: ["Russia", "USA", "Canada", "Finland"], correct: 2, explanation: "Canada contains roughly 60% of the world's freshwater lakes." },
      { id: "geo5", question: "Mount Everest is located on the border of Nepal and which other country?", options: ["India", "China", "Bhutan", "Pakistan"], correct: 1, explanation: "Everest sits on the Nepal-China (Tibet) border in the Himalayas." },
      { id: "geo6", question: "Which strait separates Europe from Africa?", options: ["Strait of Hormuz", "Strait of Gibraltar", "Bosporus Strait", "Strait of Malacca"], correct: 1, explanation: "The Strait of Gibraltar is only 14 km wide at its narrowest point between Spain and Morocco." },
      { id: "geo7", question: "What is the smallest country in the world by area?", options: ["Monaco", "San Marino", "Vatican City", "Liechtenstein"], correct: 2, explanation: "Vatican City covers just 0.44 km\u00b2 within Rome, Italy." },
      { id: "geo8", question: "The Andes mountain range runs along the western coast of which continent?", options: ["North America", "Africa", "South America", "Asia"], correct: 2, explanation: "The Andes is the world's longest continental mountain range, stretching 7,000 km along South America's western edge." },
      { id: "geo9", question: "Which river is the longest in the world?", options: ["Amazon", "Yangtze", "Mississippi", "Nile"], correct: 3, explanation: "The Nile is generally considered the world's longest river at approximately 6,650 km." },
      { id: "geo10", question: "The island of Greenland is a territory of which country?", options: ["Iceland", "Norway", "Denmark", "Canada"], correct: 2, explanation: "Greenland is an autonomous territory within the Kingdom of Denmark." },
      { id: "geo11", question: "Which ocean does the Panama Canal connect to the Pacific?", options: ["Indian Ocean", "Arctic Ocean", "Atlantic Ocean", "Southern Ocean"], correct: 2, explanation: "The Panama Canal connects the Pacific Ocean to the Atlantic Ocean, cutting through Central America." },
      { id: "geo12", question: "Which continent has the most countries?", options: ["Asia", "Europe", "Africa", "South America"], correct: 2, explanation: "Africa has 54 recognized countries, more than any other continent." },
    ],
    timeLimit: 600,
    passingScore: 70,
  },
  {
    id: "philosophy",
    title: "Philosophy",
    description: "Ethics, epistemology, metaphysics, and the great philosophers from Socrates to Nietzsche.",
    icon: <Scroll size={28} />,
    color: "oklch(0.72 0.18 290)",
    questions: [
      { id: "phi1", question: "Descartes' famous statement 'Cogito, ergo sum' translates to:", options: ["I think, therefore I am", "I exist, therefore I think", "I doubt, therefore I know", "I feel, therefore I live"], correct: 0, explanation: "'Cogito, ergo sum' is Descartes' foundational claim that the act of thinking proves one's existence." },
      { id: "phi2", question: "Which philosopher wrote 'The Republic'?", options: ["Aristotle", "Socrates", "Plato", "Epicurus"], correct: 2, explanation: "Plato wrote The Republic around 375 BCE, exploring justice, the ideal state, and the philosopher-king." },
      { id: "phi3", question: "Utilitarianism holds that the right action is the one that:", options: ["Follows universal moral rules", "Maximizes overall happiness", "Fulfills one's duty", "Imitates virtuous people"], correct: 1, explanation: "Utilitarianism, developed by Bentham and Mill, judges actions by their consequences \u2014 specifically maximizing overall well-being." },
      { id: "phi4", question: "Kant's 'Categorical Imperative' asks us to:", options: ["Act to maximize happiness", "Follow our natural instincts", "Act only according to principles we could universalize", "Obey the laws of the state"], correct: 2, explanation: "Kant's CI states: 'Act only according to that maxim whereby you can at the same time will that it should become a universal law.'" },
      { id: "phi5", question: "The philosophical position that reality exists independently of perception is called:", options: ["Idealism", "Realism", "Solipsism", "Pragmatism"], correct: 1, explanation: "Realism holds that the external world exists independently of our minds, contrasting with idealism." },
      { id: "phi6", question: "Who wrote 'Thus Spoke Zarathustra'?", options: ["Schopenhauer", "Hegel", "Nietzsche", "Kierkegaard"], correct: 2, explanation: "Friedrich Nietzsche wrote Thus Spoke Zarathustra (1883-1885), introducing the concept of the \u00dcbermensch." },
      { id: "phi7", question: "Existentialism is primarily concerned with:", options: ["The nature of knowledge", "Individual freedom and responsibility", "The structure of language", "Mathematical logic"], correct: 1, explanation: "Existentialism (Sartre, Camus, Heidegger) focuses on individual existence, freedom, and the search for meaning." },
      { id: "phi8", question: "The 'Ship of Theseus' paradox explores questions about:", options: ["Navigation ethics", "Identity and change over time", "The nature of ships", "Greek mythology"], correct: 1, explanation: "The paradox asks: if a ship's parts are gradually replaced, is it still the same ship? It probes the nature of identity." },
      { id: "phi9", question: "Which philosopher is associated with the 'Allegory of the Cave'?", options: ["Aristotle", "Socrates", "Plato", "Heraclitus"], correct: 2, explanation: "Plato's Allegory of the Cave (Republic, Book VII) illustrates the difference between the world of appearances and the world of Forms." },
      { id: "phi10", question: "Epistemology is the branch of philosophy that studies:", options: ["The nature of beauty", "The nature of knowledge", "The nature of morality", "The nature of reality"], correct: 1, explanation: "Epistemology examines the nature, sources, and limits of human knowledge." },
    ],
    timeLimit: 600,
    passingScore: 70,
  },
  {
    id: "technology",
    title: "Technology & Computing",
    description: "Computer science fundamentals, internet protocols, hardware, software, and the history of tech.",
    icon: <Cpu size={28} />,
    color: "oklch(0.72 0.20 220)",
    questions: [
      { id: "tech1", question: "What does 'HTTP' stand for?", options: ["HyperText Transfer Protocol", "High Transfer Text Protocol", "HyperText Transmission Program", "Hybrid Text Transfer Protocol"], correct: 0, explanation: "HTTP (HyperText Transfer Protocol) is the foundation of data communication on the World Wide Web." },
      { id: "tech2", question: "In binary, what is the decimal value of 1010?", options: ["8", "10", "12", "14"], correct: 1, explanation: "1010 in binary = 1\u00d72\u00b3 + 0\u00d72\u00b2 + 1\u00d72\u00b9 + 0\u00d72\u2070 = 8+0+2+0 = 10." },
      { id: "tech3", question: "Which data structure follows LIFO (Last In, First Out)?", options: ["Queue", "Stack", "Tree", "Graph"], correct: 1, explanation: "A stack follows LIFO \u2014 the last element pushed is the first to be popped." },
      { id: "tech4", question: "What is the time complexity of binary search?", options: ["O(n)", "O(n\u00b2)", "O(log n)", "O(1)"], correct: 2, explanation: "Binary search halves the search space each iteration, giving O(log n) time complexity." },
      { id: "tech5", question: "Who is credited with inventing the World Wide Web?", options: ["Steve Jobs", "Bill Gates", "Tim Berners-Lee", "Vint Cerf"], correct: 2, explanation: "Tim Berners-Lee invented the WWW in 1989 while working at CERN." },
      { id: "tech6", question: "What does 'RAM' stand for?", options: ["Random Access Memory", "Read And Modify", "Rapid Application Memory", "Readable Array Module"], correct: 0, explanation: "RAM (Random Access Memory) is volatile memory that stores data the CPU is actively using." },
      { id: "tech7", question: "Which protocol is used to assign IP addresses dynamically?", options: ["DNS", "FTP", "DHCP", "SMTP"], correct: 2, explanation: "DHCP (Dynamic Host Configuration Protocol) automatically assigns IP addresses to devices on a network." },
      { id: "tech8", question: "In object-oriented programming, what is 'encapsulation'?", options: ["Inheriting from a parent class", "Bundling data and methods together", "Creating multiple instances", "Overriding parent methods"], correct: 1, explanation: "Encapsulation bundles data (attributes) and methods that operate on that data into a single unit (class)." },
      { id: "tech9", question: "What is the primary function of a CPU's cache?", options: ["Long-term data storage", "Network communication", "Fast temporary storage for frequently accessed data", "Graphics processing"], correct: 2, explanation: "CPU cache is ultra-fast memory that stores frequently accessed data to reduce latency." },
      { id: "tech10", question: "What does 'SQL' stand for?", options: ["Structured Query Language", "Simple Question Language", "System Query Logic", "Sequential Query Layer"], correct: 0, explanation: "SQL (Structured Query Language) is used to manage and query relational databases." },
      { id: "tech11", question: "Which company developed the Android operating system?", options: ["Apple", "Microsoft", "Google", "Samsung"], correct: 2, explanation: "Android was developed by Android Inc., which Google acquired in 2005." },
      { id: "tech12", question: "What is the purpose of a firewall in computer networking?", options: ["Speed up internet connection", "Monitor and filter network traffic", "Store backup data", "Compress files"], correct: 1, explanation: "A firewall monitors and filters incoming/outgoing network traffic based on security rules." },
    ],
    timeLimit: 600,
    passingScore: 70,
  },
  {
    id: "art-history",
    title: "Art & Culture",
    description: "Major art movements, famous works, artists, music theory, and cultural history.",
    icon: <Palette size={28} />,
    color: "oklch(0.72 0.20 330)",
    questions: [
      { id: "art1", question: "Who painted the Mona Lisa?", options: ["Michelangelo", "Raphael", "Leonardo da Vinci", "Botticelli"], correct: 2, explanation: "Leonardo da Vinci painted the Mona Lisa between 1503-1519. It is now housed in the Louvre, Paris." },
      { id: "art2", question: "Which art movement is characterized by depicting everyday modern life with loose brushwork?", options: ["Cubism", "Impressionism", "Surrealism", "Baroque"], correct: 1, explanation: "Impressionism (Monet, Renoir, Degas) used loose brushwork and light to capture fleeting moments." },
      { id: "art3", question: "Beethoven's Symphony No. 9 was composed when he was:", options: ["Fully sighted", "Partially deaf", "Completely deaf", "Blind"], correct: 2, explanation: "Beethoven was almost completely deaf when he composed his Ninth Symphony (1824)." },
      { id: "art4", question: "The Sistine Chapel ceiling was painted by:", options: ["Leonardo da Vinci", "Raphael", "Michelangelo", "Donatello"], correct: 2, explanation: "Michelangelo painted the Sistine Chapel ceiling between 1508-1512 for Pope Julius II." },
      { id: "art5", question: "Pablo Picasso co-founded which art movement?", options: ["Surrealism", "Cubism", "Dadaism", "Fauvism"], correct: 1, explanation: "Picasso and Georges Braque co-founded Cubism around 1907-1908, fragmenting objects into geometric forms." },
      { id: "art6", question: "Which composer wrote 'The Four Seasons'?", options: ["Bach", "Handel", "Vivaldi", "Mozart"], correct: 2, explanation: "Antonio Vivaldi composed The Four Seasons (1723), a set of four violin concertos." },
      { id: "art7", question: "The Starry Night was painted by:", options: ["Paul Gauguin", "Vincent van Gogh", "Paul C\u00e9zanne", "Georges Seurat"], correct: 1, explanation: "Vincent van Gogh painted The Starry Night in June 1889 while in the Saint-Paul-de-Mausole asylum." },
      { id: "art8", question: "Which ancient wonder was located in Alexandria, Egypt?", options: ["The Hanging Gardens", "The Colossus of Rhodes", "The Lighthouse of Alexandria", "The Temple of Artemis"], correct: 2, explanation: "The Lighthouse of Alexandria (Pharos) stood approximately 100-140 meters tall and guided ships into port." },
      { id: "art9", question: "Salvador Dal\u00ed was associated with which art movement?", options: ["Cubism", "Expressionism", "Surrealism", "Abstract Expressionism"], correct: 2, explanation: "Dal\u00ed was a leading figure of Surrealism, known for dreamlike imagery and The Persistence of Memory." },
      { id: "art10", question: "Which Shakespeare play features the line 'To be, or not to be'?", options: ["Macbeth", "Othello", "King Lear", "Hamlet"], correct: 3, explanation: "'To be, or not to be' opens Hamlet's famous soliloquy in Act 3, Scene 1." },
    ],
    timeLimit: 600,
    passingScore: 70,
  },
];

// ─── IQ Score Calculator ──────────────────────────────────────────────────────
function calculateIQ(correct: number, total: number, timeUsed: number, timeLimit: number): number {
  const accuracy = correct / total;
  const timeBonus = Math.max(0, (timeLimit - timeUsed) / timeLimit) * 0.1;
  const rawScore = accuracy + timeBonus;
  // Normalize to IQ scale: mean 100, SD 15
  // Raw 1.0 → ~130, Raw 0.5 → ~100, Raw 0.0 → ~70
  const iq = Math.round(70 + rawScore * 60);
  return Math.min(145, Math.max(70, iq));
}

function getIQLabel(iq: number): { label: string; color: string; desc: string } {
  if (iq >= 130) return { label: "Very Superior", color: "oklch(0.75 0.18 280)", desc: "Top 2% of the population" };
  if (iq >= 120) return { label: "Superior", color: "oklch(0.75 0.18 200)", desc: "Top 9% of the population" };
  if (iq >= 110) return { label: "High Average", color: "oklch(0.75 0.20 150)", desc: "Top 25% of the population" };
  if (iq >= 90) return { label: "Average", color: "oklch(0.75 0.18 60)", desc: "Middle 50% of the population" };
  if (iq >= 80) return { label: "Low Average", color: "oklch(0.75 0.18 40)", desc: "Bottom 25% of the population" };
  return { label: "Below Average", color: "oklch(0.75 0.20 0)", desc: "Consider reviewing fundamentals" };
}

// ─── Timer Component ──────────────────────────────────────────────────────────
function Timer({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (remaining <= 0) {
      if (!expiredRef.current) { expiredRef.current = true; onExpire(); }
      return;
    }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onExpire]);

  const pct = (remaining / seconds) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const color = pct > 50 ? "oklch(0.75 0.20 150)" : pct > 25 ? "oklch(0.75 0.18 60)" : "oklch(0.75 0.20 0)";

  return (
    <div className="flex items-center gap-3">
      <Clock size={16} style={{ color }} />
      <span className="font-mono text-sm font-semibold" style={{ color }}>
        {mins}:{secs.toString().padStart(2, "0")}
      </span>
      <div className="w-24 h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ─── Active Test Component ────────────────────────────────────────────────────
function ActiveTest({ test, onComplete }: { test: TestConfig; onComplete: (score: number, answers: number[], timeUsed: number) => void }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(test.questions.length).fill(-1));
  const [selected, setSelected] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [startTime] = useState(Date.now());
  const [timeUsed, setTimeUsed] = useState(0);

  const q = test.questions[current];
  const isLast = current === test.questions.length - 1;

  const handleSelect = (idx: number) => {
    if (showFeedback) return;
    setSelected(idx);
  };

  const handleNext = useCallback(() => {
    if (selected === null) return;
    const newAnswers = [...answers];
    newAnswers[current] = selected;
    setAnswers(newAnswers);
    setShowFeedback(true);
    setTimeout(() => {
      setShowFeedback(false);
      setSelected(null);
      if (isLast) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        setTimeUsed(elapsed);
        const score = newAnswers.filter((a, i) => a === test.questions[i].correct).length;
        onComplete(score, newAnswers, elapsed);
      } else {
        setCurrent(c => c + 1);
      }
    }, 1500);
  }, [selected, answers, current, isLast, startTime, test.questions, onComplete]);

  const handleTimeUp = useCallback(() => {
    const elapsed = test.timeLimit;
    const score = answers.filter((a, i) => a === test.questions[i].correct).length;
    onComplete(score, answers, elapsed);
  }, [answers, test, onComplete]);

  if (!q) return null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: `${test.color}22`, color: test.color }}>
            {current + 1}
          </div>
          <span className="text-sm text-muted-foreground">of {test.questions.length} questions</span>
        </div>
        <Timer seconds={test.timeLimit} onExpire={handleTimeUp} />
      </div>

      <Progress value={((current + 1) / test.questions.length) * 100} className="mb-8 h-1" />

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div key={current} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
          {q.category && (
            <div className="text-xs font-medium mb-3 px-3 py-1 rounded-full inline-block" style={{ background: `${test.color}22`, color: test.color }}>
              {q.category}
            </div>
          )}
          <h2 className="text-xl font-semibold text-foreground mb-8 leading-relaxed">{q.question}</h2>

          <div className="space-y-3">
            {q.options.map((opt, idx) => {
              let borderColor = "border-border/60";
              let bg = "bg-transparent";
              let textColor = "text-foreground";

              if (showFeedback) {
                if (idx === q.correct) { borderColor = "border-[oklch(0.70_0.20_150)]"; bg = "bg-[oklch(0.70_0.20_150_/_0.15)]"; textColor = "text-[oklch(0.80_0.20_150)]"; }
                else if (idx === selected && selected !== q.correct) { borderColor = "border-[oklch(0.70_0.20_0)]"; bg = "bg-[oklch(0.70_0.20_0_/_0.15)]"; textColor = "text-[oklch(0.80_0.20_0)]"; }
              } else if (selected === idx) {
                borderColor = `border-[${test.color}]`;
                bg = `bg-[${test.color}_/_0.1]`;
              }

              return (
                <motion.button
                  key={idx}
                  whileHover={!showFeedback ? { x: 4 } : {}}
                  onClick={() => handleSelect(idx)}
                  className={`w-full text-left p-4 rounded-xl border ${borderColor} ${bg} ${textColor} transition-all duration-200 flex items-center gap-4 ${!showFeedback ? "cursor-pointer hover:border-border/60" : "cursor-default"}`}
                >
                  <span className="w-7 h-7 rounded-full border border-border/60 flex items-center justify-center text-xs font-bold flex-shrink-0 text-muted-foreground">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-sm leading-relaxed">{opt}</span>
                  {showFeedback && idx === q.correct && <CheckCircle size={18} className="ml-auto text-[oklch(0.70_0.20_150)] flex-shrink-0" />}
                  {showFeedback && idx === selected && selected !== q.correct && <XCircle size={18} className="ml-auto text-[oklch(0.70_0.20_0)] flex-shrink-0" />}
                </motion.button>
              );
            })}
          </div>

          {showFeedback && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 rounded-xl bg-[var(--surface-1)] border border-border/60">
              <p className="text-sm text-muted-foreground"><span className="text-foreground font-medium">Explanation: </span>{q.explanation}</p>
            </motion.div>
          )}

          {!showFeedback && (
            <Button onClick={handleNext} disabled={selected === null} className="mt-8 w-full h-12 text-base font-semibold" style={{ background: test.color, color: "oklch(0.15 0.02 280)" }}>
              {isLast ? "Submit Test" : "Next Question"} <ChevronRight size={18} className="ml-2" />
            </Button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Results Component ────────────────────────────────────────────────────────
function TestResults({ test, score, answers, timeUsed, onRetry, onBack }: { test: TestConfig; score: number; answers: number[]; timeUsed: number; onRetry: () => void; onBack: () => void }) {
  const pct = Math.round((score / test.questions.length) * 100);
  const passed = pct >= test.passingScore;
  const iqScore = test.id === "iq" ? calculateIQ(score, test.questions.length, timeUsed, test.timeLimit) : null;
  const iqInfo = iqScore ? getIQLabel(iqScore) : null;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto text-center">
      {/* Score Circle */}
      <div className="relative w-40 h-40 mx-auto mb-8">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          <circle cx="60" cy="60" r="50" fill="none" stroke={test.color} strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 50}`}
            strokeDashoffset={`${2 * Math.PI * 50 * (1 - pct / 100)}`}
            strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-foreground">{pct}%</span>
          <span className="text-xs text-muted-foreground">{score}/{test.questions.length}</span>
        </div>
      </div>

      {/* IQ Score (if applicable) */}
      {iqScore && iqInfo && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="mb-6 p-6 glass rounded-2xl border border-border/60">
          <div className="text-5xl font-bold mb-2" style={{ color: iqInfo.color }}>{iqScore}</div>
          <div className="text-xl font-semibold text-foreground mb-1">{iqInfo.label}</div>
          <div className="text-sm text-muted-foreground">{iqInfo.desc}</div>
          <div className="mt-4 text-xs text-muted-foreground/60">
            Note: This is an indicative assessment. Official IQ testing requires a certified psychologist.
          </div>
        </motion.div>
      )}

      <div className="mb-4">
        {passed ? (
          <div className="flex items-center justify-center gap-2 text-[oklch(0.75_0.20_150)] mb-2">
            <Trophy size={24} /> <span className="text-xl font-bold">Excellent Work!</span>
          </div>
        ) : (
          <div className="text-xl font-semibold text-foreground mb-2">Keep Practicing</div>
        )}
        <p className="text-muted-foreground">Time used: {Math.floor(timeUsed / 60)}m {timeUsed % 60}s</p>
      </div>

      {/* Per-question review */}
      <div className="text-left space-y-2 mb-8 max-h-64 overflow-y-auto pr-1">
        {test.questions.map((q, i) => {
          const userAns = answers[i];
          const correct = userAns === q.correct;
          return (
            <div key={q.id} className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${correct ? "border-[oklch(0.70_0.20_150_/_0.2)] bg-[oklch(0.70_0.20_150_/_0.05)]" : "border-[oklch(0.70_0.20_0_/_0.2)] bg-[oklch(0.70_0.20_0_/_0.05)]"}`}>
              {correct ? <CheckCircle size={16} className="text-[oklch(0.70_0.20_150)] flex-shrink-0 mt-0.5" /> : <XCircle size={16} className="text-[oklch(0.70_0.20_0)] flex-shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-medium truncate">{q.question}</p>
                {!correct && <p className="text-xs text-muted-foreground mt-0.5">Correct: {q.options[q.correct]}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1 h-11"><ArrowLeft size={16} className="mr-2" />All Tests</Button>
        <Button onClick={onRetry} className="flex-1 h-11" style={{ background: test.color, color: "oklch(0.15 0.02 280)" }}><RotateCcw size={16} className="mr-2" />Retry</Button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TestingCenter() {
  const { addXP, cookieId } = usePersonalization();
  const [activeTest, setActiveTest] = useState<TestConfig | null>(null);
  const [phase, setPhase] = useState<"select" | "active" | "results">("select");
  const [resultData, setResultData] = useState<{ score: number; answers: number[]; timeUsed: number } | null>(null);
  const addXPMutation = trpc.visitor.addXP.useMutation();
  const saveResultMutation = trpc.testing.saveResult.useMutation();
  const saveIQResultMutation = trpc.testing.saveIQResult.useMutation();

  const startTest = (test: TestConfig) => {
    setActiveTest(test);
    setResultData(null);
    setPhase("active");
  };

  const handleComplete = useCallback((score: number, answers: number[], timeUsed: number) => {
    setResultData({ score, answers, timeUsed });
    setPhase("results");
    const pct = score / (activeTest?.questions.length ?? 1);
    const xp = Math.round(pct * 50) + 10;
    addXP(xp);
    // Save result to DB
    if (activeTest) {
      const answersRecord: Record<string, number> = {};
      answers.forEach((a, i) => { answersRecord[String(i)] = a; });
      saveResultMutation.mutate({
        cookieId,
        testId: activeTest.id,
        score,
        totalQuestions: activeTest.questions.length,
        answers: answersRecord,
        timeTakenSeconds: Math.round(timeUsed),
      });
      // For IQ test, also save detailed IQ result
      if (activeTest.id === "iq") {
        const iqScore = calculateIQ(score, activeTest.questions.length, timeUsed, activeTest.timeLimit);
        const percentile = Math.round(Math.max(1, Math.min(99, ((iqScore - 100) / 15) * 34 + 50)));
        // Compute category scores from answers
        const categoryScores: Record<string, number> = {};
        const categoryCounts: Record<string, number> = {};
        activeTest.questions.forEach((q, i) => {
          const cat = q.category ?? "General";
          if (!categoryScores[cat]) { categoryScores[cat] = 0; categoryCounts[cat] = 0; }
          categoryCounts[cat]++;
          if (answers[i] === q.correct) categoryScores[cat]++;
        });
        const catPct: Record<string, number> = {};
        Object.keys(categoryScores).forEach(cat => {
          catPct[cat] = Math.round((categoryScores[cat] / categoryCounts[cat]) * 100);
        });
        saveIQResultMutation.mutate({
          cookieId,
          iqScore,
          percentile,
          rawScore: score,
          categoryScores: catPct,
          timeTakenSeconds: Math.round(timeUsed),
        });
      }
    }
    if (pct >= 0.8) toast.success(`Outstanding! +${xp} XP earned`);
    else if (pct >= 0.6) toast.success(`Good work! +${xp} XP earned`);
    else toast(`Test complete. +${xp} XP earned. Keep practicing!`);
  }, [activeTest, addXP, addXPMutation, cookieId, saveResultMutation, saveIQResultMutation]);

  return (
    <PageWrapper pageName="testing">
      <div className="min-h-screen pt-24 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          {phase === "select" && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full card-nexus text-sm text-muted-foreground mb-6">
                <Target size={14} /> <span>Establish Your Baseline</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
                Testing <span className="gradient-text">Center</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Assess your knowledge across multiple domains. Establish a baseline, track improvement over time, and let Nexus personalize your learning path based on your results.
              </p>
            </motion.div>
          )}

          {/* Test Selection Grid */}
          {phase === "select" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tests.map((test, i) => (
                <motion.div key={test.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  className="card-nexus p-6 cursor-pointer group hover:border-border/60 transition-all duration-300"
                  onClick={() => startTest(test)}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `${test.color}22`, color: test.color }}>
                    {test.icon}
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-[oklch(0.85_0.12_280)] transition-colors">{test.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{test.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><BookOpen size={12} />{test.questions.length} questions</span>
                    <span className="flex items-center gap-1"><Clock size={12} />{Math.floor(test.timeLimit / 60)} min</span>
                    <span className="flex items-center gap-1"><Star size={12} />Up to 60 XP</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/60">
                    <Button size="sm" className="w-full h-9 text-sm font-semibold group-hover:opacity-100 opacity-80 transition-opacity" style={{ background: test.color, color: "oklch(0.15 0.02 280)" }}>
                      Start Assessment <ChevronRight size={14} className="ml-1" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Active Test */}
          {phase === "active" && activeTest && (
            <div>
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setPhase("select")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft size={16} /> Back
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${activeTest.color}22`, color: activeTest.color }}>
                    {activeTest.icon}
                  </div>
                  <h2 className="text-xl font-bold text-foreground">{activeTest.title}</h2>
                </div>
              </div>
              <ActiveTest test={activeTest} onComplete={handleComplete} />
            </div>
          )}

          {/* Results */}
          {phase === "results" && activeTest && resultData && (
            <div>
              <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${activeTest.color}22`, color: activeTest.color }}>
                    {activeTest.icon}
                  </div>
                  <h2 className="text-xl font-bold text-foreground">{activeTest.title} — Results</h2>
                </div>
              </div>
              <TestResults
                test={activeTest}
                score={resultData.score}
                answers={resultData.answers}
                timeUsed={resultData.timeUsed}
                onRetry={() => startTest(activeTest)}
                onBack={() => setPhase("select")}
              />
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
