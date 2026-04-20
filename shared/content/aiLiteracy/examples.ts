/**
 * Example bank — concrete worked examples organised by domain. The seed
 * factory selects examples whose `domain` matches the learner's
 * inferredBackground or interests.
 */

export interface DomainExample {
  id: string;
  title: string;
  /** Domain tag used for matching against learner profile. */
  domain: "developer" | "designer" | "business" | "healthcare" | "education" | "general";
  topic: string;
  body: string;
}

export const EXAMPLES: DomainExample[] = [
  // ── Narrow AI ────────────────────────────────────────────────────────────────
  {
    id: "narrow-ai-developer",
    title: "Narrow AI in software development",
    domain: "developer",
    topic: "narrow-ai",
    body: "GitHub Copilot suggests the next line of code by predicting the most likely token sequence given your file context. It is brilliant at completing syntax it has seen before — and can confidently invent function names, method signatures, and library calls that do not exist. The same model that writes Python fluently has no model of what your software is actually supposed to do. It can't tell you whether your architecture is sound. It optimises for 'what code tends to look like here' not 'what would make this system correct.'",
  },
  {
    id: "narrow-ai-designer",
    title: "Narrow AI in design tools",
    domain: "designer",
    topic: "narrow-ai",
    body: "Figma's auto-layout suggestions and Photoshop's generative fill are narrow AI: they excel at one perceptual task and have no idea what the design is for or who it is serving. A generative fill that seamlessly extends a background has no concept of brand identity, accessibility, or whether this image will be used in a medical context where misleading imagery could cause harm. The output looks great; the judgment of whether it's appropriate remains entirely yours.",
  },
  {
    id: "narrow-ai-business",
    title: "Narrow AI in business operations",
    domain: "business",
    topic: "narrow-ai",
    body: "A spam classifier in Gmail is narrow AI: it sorts incoming mail with 99%+ accuracy on the task it was trained for, but has no model of why a message matters to you or your business. A cold outreach email from your most important prospect might get filtered the same as actual spam. The model that scores sales leads knows nothing about strategic relationships. Every AI system solves its training task — and only its training task.",
  },
  {
    id: "narrow-ai-healthcare",
    title: "Narrow AI in medical imaging",
    domain: "healthcare",
    topic: "narrow-ai",
    body: "FDA-cleared AI tools can detect diabetic retinopathy from retinal photographs with accuracy matching specialist ophthalmologists — for that specific condition, in images similar to the training set. Deploy the same model to detect a different condition, or use it on images from a scanner it wasn't trained on, and accuracy drops unpredictably. The AI is narrow in a very specific way: trained on a narrow distribution, validated on a narrow benchmark, and silently unreliable outside that boundary.",
  },
  {
    id: "narrow-ai-education",
    title: "Narrow AI in education technology",
    domain: "education",
    topic: "narrow-ai",
    body: "An AI-powered reading tutor can reliably assess reading fluency (words per minute, pronunciation accuracy) by listening to a student read aloud. It cannot assess reading comprehension, engagement, or whether a child is having a hard day. Schools that deploy these tools alongside a skilled teacher get good diagnostic data. Schools that use them as a replacement for teacher attention may get accurate fluency scores while missing the student entirely.",
  },
  {
    id: "narrow-ai-general",
    title: "Narrow AI in everyday apps",
    domain: "general",
    topic: "narrow-ai",
    body: "Every 'smart' feature in your apps is a narrow AI. Spotify's recommendation algorithm knows your listening habits and predicts what you'll skip vs. let play — but it has no concept of mood, context, or why you sometimes want to hear something completely different from your usual taste. Google Maps predicts travel time with remarkable accuracy on routes it has data for — and can be confidently wrong on unusual routes or in areas with sparse historical data. Narrow doesn't mean weak; it means bounded.",
  },

  // ── Hallucination ─────────────────────────────────────────────────────────
  {
    id: "hallucination-developer",
    title: "Hallucinated APIs and library functions",
    domain: "developer",
    topic: "hallucination",
    body: "Ask an LLM to use a niche library and it may generate method calls that look syntactically correct — right naming conventions, plausible parameter names, idiomatic style — but simply never shipped. The function is invented. The module path doesn't exist. This is a particularly costly hallucination because the code looks right: it follows the patterns of real code so closely that it passes a cursory review. Developers without deep domain knowledge of the library are most at risk. Rule: verify every method call against official documentation, not just LLM output.",
  },
  {
    id: "hallucination-business",
    title: "Hallucinated market research and citations",
    domain: "business",
    topic: "hallucination",
    body: "An LLM asked to support a business case with statistics and citations can produce convincing-looking sources — real-sounding journal names, plausible volume and issue numbers, credible authors — that simply do not exist. The statistic '67% of companies report X' may have no published source. This is especially dangerous in business contexts where AI-generated slides and reports are sometimes shared without checking the underlying sources. One practical rule: if you cannot find the primary source yourself in five minutes of searching, treat the statistic as unverified.",
  },
  {
    id: "hallucination-healthcare",
    title: "Hallucinated drug information",
    domain: "healthcare",
    topic: "hallucination",
    body: "Healthcare professionals have documented LLMs providing incorrect drug dosages, contraindications, and interaction warnings while sounding authoritative and up-to-date. The model's confident tone is the same whether it is citing an accurate FDA guideline or confabulating one. In clinical settings, this makes AI output about specific pharmacological questions particularly dangerous to rely on without verification against clinical resources like UpToDate or official prescribing information.",
  },
  {
    id: "hallucination-general",
    title: "Hallucinated facts in everyday use",
    domain: "general",
    topic: "hallucination",
    body: "People have used AI-generated historical facts in school papers, cited non-existent news articles in social media posts, and shared AI-invented quotes attributed to real public figures. In each case, the hallucination was plausible enough to slip past the person using it. The tell-tale sign is often specificity: a very specific-sounding claim ('In the 2019 Stanford study involving 4,200 participants…') with no traceable primary source is a red flag for hallucination. Specific-sounding is not the same as verified.",
  },

  // ── Bias ─────────────────────────────────────────────────────────────────
  {
    id: "bias-healthcare",
    title: "Diagnostic bias in dermatology AI",
    domain: "healthcare",
    topic: "bias",
    body: "Skin-lesion classifiers trained primarily on images from light-skinned populations consistently underperform on darker skin tones — a finding replicated across multiple published studies. The models are not malicious; they learned what they were shown. The training datasets underrepresented darker skin, so the model's learned representations are less reliable for that group. In a clinical setting, a diagnostic AI that is significantly less accurate for a specific patient demographic creates a fairness problem at exactly the moment when accurate diagnosis matters most.",
  },
  {
    id: "bias-business",
    title: "Hiring bias encoded in résumé screening",
    domain: "business",
    topic: "bias",
    body: "Amazon famously scrapped an AI hiring tool in 2018 after discovering it systematically downranked résumés from women. The model had been trained on a decade of successful hires — predominantly male in technical roles — and learned to reproduce that pattern. Even after explicit gender references were removed from inputs, the model penalised résumés that contained words correlating with female applicants (like 'women's chess club'). The lesson: training an AI on historical data doesn't just describe the past; it prescribes the future. If you want different outcomes, you need to deliberately intervene in the training process.",
  },
  {
    id: "bias-developer",
    title: "Bias in code generation and technical culture",
    domain: "developer",
    topic: "bias",
    body: "Code generation models trained on public repositories reflect the demographics and norms of those repositories' authors — predominantly English-speaking, Western, and male. This can surface in subtle ways: variable naming conventions, coding style assumptions, and even comments in generated code. More practically: technical documentation written with AI assistance that assumes a specific type of developer as the audience may exclude other readers. Models trained on biased input produce biased output, even when bias is not the intended subject.",
  },
  {
    id: "bias-education",
    title: "Bias in AI-assisted grading",
    domain: "education",
    topic: "bias",
    body: "Research on automated essay scoring found that AI graders can penalise non-standard dialects of English — rating African American Vernacular English (AAVE) lower than Standard American English for equivalent content quality. The model learned that 'high-scoring essays' looked a certain way syntactically, and applied that pattern regardless of substantive quality. For educators using AI grading tools: understanding what writing was in the training data — and whose writing was considered 'high quality' — is essential to knowing whose students might be disadvantaged by the tool.",
  },
  {
    id: "bias-general",
    title: "Facial recognition and racial disparity",
    domain: "general",
    topic: "bias",
    body: "A 2019 NIST study evaluated 189 facial recognition algorithms from 99 developers. The vast majority showed significantly higher false-positive rates for African American and Asian faces compared to Caucasian faces — in some algorithms, 100 times higher. False positives in a facial recognition system used for law enforcement can result in wrongful identification and arrest. The harms of AI bias are not theoretical; they fall on real people, disproportionately people from groups already marginalised by other social systems.",
  },

  // ── Prompt ────────────────────────────────────────────────────────────────
  {
    id: "prompt-developer",
    title: "Vague vs precise prompts for code generation",
    domain: "developer",
    topic: "prompt",
    body: "'Write a function to parse dates' produces a generic implementation that may not match your language, format, or edge case requirements. 'Write a Python 3.11 function that parses ISO 8601 date strings (including timezone offsets) into timezone-aware datetime objects, raising ValueError with a descriptive message on invalid input, with type hints and a docstring' produces something you can actually use. The specificity of the output mirrors the specificity of the prompt — every vague word in your request becomes a guess the model makes.",
  },
  {
    id: "prompt-design",
    title: "Sharp vs vague prompts for design briefs",
    domain: "designer",
    topic: "prompt",
    body: "'Make this better' produces a generic mood-board of superficial changes. 'Increase the visual weight of the primary CTA button to create stronger hierarchy on mobile viewports while keeping the colour within the existing brand palette and maintaining WCAG 2.1 AA contrast ratio' produces actionable, specific changes. The model cannot make design judgment calls that require understanding business goals, user research, or brand strategy — but it can execute well-specified constraints. Your job is to be specific enough that it doesn't have to guess.",
  },
  {
    id: "prompt-business",
    title: "Effective prompting for business writing",
    domain: "business",
    topic: "prompt",
    body: "'Write an executive summary' produces a generic template. 'Write a 300-word executive summary of the attached Q3 report for a CFO audience. Lead with the revenue variance (−8% vs forecast), then the two primary causes, then the recovery plan. Tone: direct and accountable, not defensive. No jargon. Use numbers wherever possible.' produces a draft that reflects actual business judgment. The more context you front-load — audience, goal, constraints, tone — the less the model has to invent.",
  },
  {
    id: "prompt-general",
    title: "The three things that always help any prompt",
    domain: "general",
    topic: "prompt",
    body: "After thousands of user studies and practitioner observations, three prompt elements consistently improve output quality across almost any task: (1) Specify the audience ('explain this to a 14-year-old' vs 'explain this to a cardiologist') — different audiences need different things. (2) Specify constraints ('under 100 words,' 'no bullet points,' 'must include a call to action') — constraints eliminate guessing. (3) Specify format ('respond as a numbered list,' 'write this as a conversation,' 'give me three options') — format shapes how the information is structured for your use. None of these require technical knowledge; they just require knowing what you actually want.",
  },

  // ── Training Data ──────────────────────────────────────────────────────────
  {
    id: "training-data-general",
    title: "Why AI knowledge goes stale",
    domain: "general",
    topic: "training-data",
    body: "Most AI models are trained once on a fixed dataset and then frozen. The training data has a cutoff date — after which, the model has no knowledge of events. When you ask a model with a 2023 training cutoff about a law passed in 2024, or a company that rebranded last year, or a scientific study published last month, the model doesn't say 'I don't know' — it often generates a plausible-sounding answer based on older patterns. Check the knowledge cutoff of any AI tool you rely on for current information.",
  },
  {
    id: "training-data-business",
    title: "Training data determines what the model knows — and doesn't",
    domain: "business",
    topic: "training-data",
    body: "An AI system trained on English-language business documents will perform well on English-language business tasks and poorly on the same tasks in other languages. A model trained on US financial regulations will have limited knowledge of EU or APAC regulatory frameworks. A model trained on public company data will not have insight into private company dynamics. The model's knowledge is bounded by its training corpus — and the training corpus reflects who created the data, in what language, from what industry, in what time period. Understanding those boundaries helps you know when to trust the output and when to verify.",
  },

  // ── AGI ──────────────────────────────────────────────────────────────────
  {
    id: "agi-general",
    title: "The gap between AI today and AGI",
    domain: "general",
    topic: "agi",
    body: "When AlphaGo defeated the world's best Go player in 2016, many articles declared AI had 'surpassed human intelligence.' AlphaGo then immediately retired — because it was built for one game and one game only. It could not play chess. It could not answer a question in English. It could not make a cup of tea. This is exactly the distinction between narrow AI (what we have) and AGI (what we do not have). Every impressive AI achievement you read about is narrow: one benchmark, one domain, one carefully structured task. General intelligence — flexible, transferable, applicable to novel situations — remains out of reach.",
  },

  // ── AI Augmentation ───────────────────────────────────────────────────────
  {
    id: "augmentation-developer",
    title: "AI as a coding copilot, not a replacement",
    domain: "developer",
    topic: "ai-augmentation",
    body: "Studies of AI-assisted coding (GitHub Copilot, Cursor) consistently show developers completing certain tasks 30-55% faster with AI assistance — writing boilerplate, generating test cases, translating between languages. The developers who benefit most are those who treat the AI as a pair-programmer who writes first drafts quickly but needs review: they verify the logic, catch the edge cases, and maintain the architectural understanding the AI lacks. Developers who trust AI output without review accumulate subtle bugs. The tool amplifies the developer's judgment — for better and worse.",
  },
  {
    id: "augmentation-business",
    title: "AI augmenting knowledge workers",
    domain: "business",
    topic: "ai-augmentation",
    body: "A Harvard Business School study gave consultants access to GPT-4 for knowledge work tasks. Consultants with AI assistance completed 12.2% more tasks, 25% faster, and produced work rated 40% higher quality by evaluators — compared to a control group without AI access. The gains were largest for workers who were already good at their jobs. AI did not level the playing field; it amplified existing skill. The implication: learning to work effectively with AI is itself a professional skill — one worth developing deliberately.",
  },
];
