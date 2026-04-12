import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const resources = [
  // ── AI Theory & Foundations ──────────────────────────────────────────────────
  { title: "Attention Is All You Need", url: "https://arxiv.org/abs/1706.03762", description: "The landmark 2017 paper introducing the Transformer architecture that powers all modern LLMs including GPT, Claude, and Gemini.", category: "AI Theory", tags: JSON.stringify(["transformers","attention","deep-learning","foundational"]), type: "paper", featured: 1 },
  { title: "The Illustrated Transformer", url: "https://jalammar.github.io/illustrated-transformer/", description: "Jay Alammar's visual, step-by-step explanation of how Transformers work — the best visual guide to attention mechanisms available.", category: "AI Theory", tags: JSON.stringify(["transformers","visualization","explainer","beginner-friendly"]), type: "article", featured: 1 },
  { title: "Neural Networks: Zero to Hero (Karpathy)", url: "https://karpathy.ai/zero-to-hero.html", description: "Andrej Karpathy's legendary lecture series building neural networks from scratch — from micrograd to GPT. The gold standard for learning deep learning.", category: "AI Theory", tags: JSON.stringify(["neural-networks","deep-learning","pytorch","karpathy","video-series"]), type: "course", featured: 1 },
  { title: "Deep Learning Book (Goodfellow et al.)", url: "https://www.deeplearningbook.org/", description: "The definitive textbook on deep learning by Ian Goodfellow, Yoshua Bengio, and Aaron Courville. Free online.", category: "AI Theory", tags: JSON.stringify(["deep-learning","textbook","mathematics","free"]), type: "book", featured: 0 },
  { title: "Distill.pub — Interactive ML Research", url: "https://distill.pub/", description: "Beautifully illustrated, interactive articles explaining complex ML concepts. Highest quality ML explanations on the internet.", category: "AI Theory", tags: JSON.stringify(["visualization","research","interactive","explainer"]), type: "article", featured: 1 },
  { title: "The Scaling Laws Paper", url: "https://arxiv.org/abs/2001.08361", description: "OpenAI's 2020 paper showing that LLM performance scales predictably with compute, data, and parameters — the foundation of the scaling hypothesis.", category: "AI Theory", tags: JSON.stringify(["scaling","llm","openai","research"]), type: "paper", featured: 0 },
  { title: "RLHF Explained", url: "https://huggingface.co/blog/rlhf", description: "Hugging Face's clear explanation of Reinforcement Learning from Human Feedback — the technique that made ChatGPT useful.", category: "AI Theory", tags: JSON.stringify(["rlhf","alignment","fine-tuning","chatgpt"]), type: "article", featured: 0 },
  { title: "What Is a Vector Embedding?", url: "https://www.pinecone.io/learn/vector-embeddings/", description: "Pinecone's comprehensive guide to vector embeddings — the mathematical foundation of semantic search, RAG, and recommendation systems.", category: "AI Theory", tags: JSON.stringify(["embeddings","vectors","semantic-search","rag"]), type: "article", featured: 0 },

  // ── Practical AI & LLM Usage ─────────────────────────────────────────────────
  { title: "Prompt Engineering Guide", url: "https://www.promptingguide.ai/", description: "The most comprehensive free guide to prompt engineering techniques: zero-shot, few-shot, chain-of-thought, ReAct, and more.", category: "Practical AI", tags: JSON.stringify(["prompt-engineering","llm","techniques","free"]), type: "article", featured: 1 },
  { title: "OpenAI Cookbook", url: "https://cookbook.openai.com/", description: "Official collection of practical examples and best practices for building with OpenAI APIs — RAG, function calling, embeddings, and more.", category: "Practical AI", tags: JSON.stringify(["openai","api","cookbook","code-examples"]), type: "article", featured: 1 },
  { title: "LangChain Documentation", url: "https://docs.langchain.com/", description: "The leading framework for building LLM-powered applications — agents, chains, RAG pipelines, and tool use.", category: "Practical AI", tags: JSON.stringify(["langchain","agents","rag","framework"]), type: "article", featured: 0 },
  { title: "Building LLM Applications (Chip Huyen)", url: "https://huyenchip.com/2023/04/11/llm-engineering.html", description: "Chip Huyen's essential guide to the engineering challenges of building production LLM applications — latency, cost, evaluation, and more.", category: "Practical AI", tags: JSON.stringify(["llm-engineering","production","evaluation","best-practices"]), type: "article", featured: 1 },
  { title: "AI for Everyone (Coursera)", url: "https://www.coursera.org/learn/ai-for-everyone", description: "Andrew Ng's non-technical course explaining AI concepts, capabilities, and limitations for business and general audiences.", category: "Practical AI", tags: JSON.stringify(["andrew-ng","coursera","non-technical","business"]), type: "course", featured: 0 },
  { title: "Hugging Face Course", url: "https://huggingface.co/learn/nlp-course/", description: "Free, hands-on NLP course using Transformers library — fine-tuning, tokenization, and deploying models.", category: "Practical AI", tags: JSON.stringify(["huggingface","nlp","transformers","free","hands-on"]), type: "course", featured: 1 },
  { title: "Gemini API Documentation", url: "https://ai.google.dev/docs", description: "Official Google Gemini API docs — multimodal capabilities, function calling, grounding, and code execution.", category: "Practical AI", tags: JSON.stringify(["gemini","google","api","multimodal"]), type: "article", featured: 0 },
  { title: "Anthropic Prompt Library", url: "https://docs.anthropic.com/en/prompt-library/library", description: "Curated collection of effective prompts for Claude covering summarization, analysis, coding, creative writing, and more.", category: "Practical AI", tags: JSON.stringify(["anthropic","claude","prompts","examples"]), type: "article", featured: 0 },
  { title: "AI Tools Directory", url: "https://theresanaiforthat.com/", description: "The largest database of AI tools — searchable by task, use case, and category. Find the right AI for any job.", category: "Practical AI", tags: JSON.stringify(["tools","directory","productivity","use-cases"]), type: "tool", featured: 0 },

  // ── Machine Learning ─────────────────────────────────────────────────────────
  { title: "Fast.ai Practical Deep Learning", url: "https://course.fast.ai/", description: "Jeremy Howard's top-down, practical deep learning course. Build real models first, understand theory second. Free and world-class.", category: "Machine Learning", tags: JSON.stringify(["fastai","deep-learning","practical","free","pytorch"]), type: "course", featured: 1 },
  { title: "Google Machine Learning Crash Course", url: "https://developers.google.com/machine-learning/crash-course", description: "Google's free, self-paced ML fundamentals course with interactive visualizations and real-world exercises.", category: "Machine Learning", tags: JSON.stringify(["google","fundamentals","free","interactive","tensorflow"]), type: "course", featured: 0 },
  { title: "Scikit-learn User Guide", url: "https://scikit-learn.org/stable/user_guide.html", description: "The definitive reference for classical ML algorithms in Python — classification, regression, clustering, and preprocessing.", category: "Machine Learning", tags: JSON.stringify(["scikit-learn","python","classical-ml","reference"]), type: "article", featured: 0 },
  { title: "Papers With Code", url: "https://paperswithcode.com/", description: "Machine learning papers with their code implementations, benchmarks, and state-of-the-art leaderboards.", category: "Machine Learning", tags: JSON.stringify(["research","papers","code","benchmarks","sota"]), type: "tool", featured: 1 },
  { title: "Kaggle Learn", url: "https://www.kaggle.com/learn", description: "Free, hands-on micro-courses in Python, ML, deep learning, NLP, and data visualization with interactive notebooks.", category: "Machine Learning", tags: JSON.stringify(["kaggle","free","hands-on","notebooks","competitions"]), type: "course", featured: 0 },
  { title: "StatQuest with Josh Starmer", url: "https://statquest.org/", description: "Clear, visual explanations of statistics and ML concepts. The best YouTube channel for understanding the math behind ML.", category: "Machine Learning", tags: JSON.stringify(["statistics","visualization","youtube","beginner-friendly","math"]), type: "video", featured: 0 },

  // ── AI Safety & Ethics ───────────────────────────────────────────────────────
  { title: "Anthropic Core Views on AI Safety", url: "https://www.anthropic.com/news/core-views-on-ai-safety", description: "Anthropic's published views on AI safety, alignment, and the risks of advanced AI systems.", category: "AI Safety", tags: JSON.stringify(["safety","alignment","anthropic","policy"]), type: "article", featured: 0 },
  { title: "AI Alignment Forum", url: "https://www.alignmentforum.org/", description: "The primary research forum for AI alignment — technical and conceptual work on making AI systems safe and beneficial.", category: "AI Safety", tags: JSON.stringify(["alignment","research","safety","technical"]), type: "article", featured: 0 },
  { title: "Ethics of Artificial Intelligence (MIT)", url: "https://ocw.mit.edu/courses/24-131-ethics-of-artificial-intelligence-fall-2021/", description: "MIT OpenCourseWare course on the philosophical and ethical dimensions of AI — bias, fairness, accountability, and autonomy.", category: "AI Safety", tags: JSON.stringify(["ethics","mit","philosophy","bias","fairness"]), type: "course", featured: 0 },
  { title: "EU AI Act Summary", url: "https://artificialintelligenceact.eu/", description: "Clear, accessible summary of the EU's landmark AI regulation — risk categories, requirements, and compliance timelines.", category: "AI Safety", tags: JSON.stringify(["regulation","eu","policy","compliance","law"]), type: "article", featured: 0 },

  // ── Web Development ──────────────────────────────────────────────────────────
  { title: "The Odin Project", url: "https://www.theodinproject.com/", description: "Free, comprehensive full-stack web development curriculum — HTML, CSS, JavaScript, Node.js, React, and databases.", category: "Web Development", tags: JSON.stringify(["full-stack","free","curriculum","javascript","react"]), type: "course", featured: 1 },
  { title: "MDN Web Docs", url: "https://developer.mozilla.org/", description: "Mozilla's authoritative reference for HTML, CSS, and JavaScript. The most reliable web development documentation.", category: "Web Development", tags: JSON.stringify(["reference","html","css","javascript","mozilla"]), type: "article", featured: 0 },
  { title: "JavaScript.info", url: "https://javascript.info/", description: "The most comprehensive and well-written JavaScript tutorial — from basics to advanced topics like closures, prototypes, and async.", category: "Web Development", tags: JSON.stringify(["javascript","tutorial","comprehensive","free"]), type: "course", featured: 0 },
  { title: "React Documentation", url: "https://react.dev/", description: "Official React documentation with interactive examples, tutorials, and API reference. Completely rewritten in 2023.", category: "Web Development", tags: JSON.stringify(["react","official","documentation","hooks","interactive"]), type: "article", featured: 0 },
  { title: "CSS Tricks", url: "https://css-tricks.com/", description: "The best resource for CSS techniques, flexbox, grid, animations, and modern CSS features.", category: "Web Development", tags: JSON.stringify(["css","flexbox","grid","animations","tricks"]), type: "article", featured: 0 },

  // ── Data Science ─────────────────────────────────────────────────────────────
  { title: "Python Data Science Handbook", url: "https://jakevdp.github.io/PythonDataScienceHandbook/", description: "Jake VanderPlas's free online book covering NumPy, Pandas, Matplotlib, and Scikit-learn with Jupyter notebooks.", category: "Data Science", tags: JSON.stringify(["python","pandas","numpy","free","jupyter"]), type: "book", featured: 1 },
  { title: "Towards Data Science", url: "https://towardsdatascience.com/", description: "High-quality articles on data science, ML, and AI from practitioners — tutorials, case studies, and opinion pieces.", category: "Data Science", tags: JSON.stringify(["articles","tutorials","community","medium"]), type: "article", featured: 0 },
  { title: "SQL Tutorial (Mode Analytics)", url: "https://mode.com/sql-tutorial/", description: "Interactive SQL tutorial covering basic to advanced queries, window functions, and data analysis patterns.", category: "Data Science", tags: JSON.stringify(["sql","interactive","analytics","data-analysis"]), type: "course", featured: 0 },

  // ── Productivity & Learning ───────────────────────────────────────────────────
  { title: "Building a Second Brain", url: "https://www.buildingasecondbrain.com/", description: "The definitive framework for personal knowledge management — capturing, organizing, and using information effectively.", category: "Productivity", tags: JSON.stringify(["pkm","note-taking","knowledge-management","productivity"]), type: "book", featured: 0 },
  { title: "Anki Spaced Repetition Flashcards", url: "https://apps.ankiweb.net/", description: "The gold standard spaced repetition app — scientifically proven to maximize long-term memory retention.", category: "Productivity", tags: JSON.stringify(["spaced-repetition","memory","flashcards","free"]), type: "tool", featured: 0 },
  { title: "Learning How to Learn (Coursera)", url: "https://www.coursera.org/learn/learning-how-to-learn", description: "Barbara Oakley's science-based course on effective learning techniques — the most enrolled MOOC in history.", category: "Productivity", tags: JSON.stringify(["learning","cognitive-science","coursera","free","barbara-oakley"]), type: "course", featured: 1 },
  { title: "Obsidian Knowledge Graph Notes", url: "https://obsidian.md/", description: "Local-first note-taking app with bidirectional links and a visual knowledge graph. The power user's tool for building a second brain.", category: "Productivity", tags: JSON.stringify(["notes","knowledge-graph","markdown","local-first","pkm"]), type: "tool", featured: 0 },

  // ── Mathematics ──────────────────────────────────────────────────────────────
  { title: "3Blue1Brown Essence of Linear Algebra", url: "https://www.3blue1brown.com/topics/linear-algebra", description: "Grant Sanderson's visually stunning video series making linear algebra intuitive — essential for understanding ML.", category: "Mathematics", tags: JSON.stringify(["linear-algebra","visualization","3b1b","youtube","intuition"]), type: "video", featured: 1 },
  { title: "Khan Academy Mathematics", url: "https://www.khanacademy.org/math", description: "Free, comprehensive math curriculum from arithmetic through calculus, statistics, and linear algebra.", category: "Mathematics", tags: JSON.stringify(["free","comprehensive","calculus","statistics","beginner"]), type: "course", featured: 0 },
  { title: "Paul's Online Math Notes", url: "https://tutorial.math.lamar.edu/", description: "Comprehensive, well-organized notes for Algebra, Calculus I/II/III, and Differential Equations — a favorite of college students.", category: "Mathematics", tags: JSON.stringify(["calculus","algebra","differential-equations","notes","free"]), type: "article", featured: 0 },

  // ── Science ──────────────────────────────────────────────────────────────────
  { title: "Kurzgesagt In a Nutshell", url: "https://kurzgesagt.org/", description: "Beautifully animated science explainer videos covering physics, biology, space, and existential questions.", category: "Science", tags: JSON.stringify(["science","animation","explainer","youtube","visual"]), type: "video", featured: 0 },
  { title: "MIT OpenCourseWare", url: "https://ocw.mit.edu/", description: "Free access to MIT course materials — lecture notes, problem sets, and exams from hundreds of courses.", category: "Science", tags: JSON.stringify(["mit","free","university","courses","comprehensive"]), type: "course", featured: 1 },
  { title: "Veritasium", url: "https://www.youtube.com/@veritasium", description: "Derek Muller's science YouTube channel exploring counterintuitive physics, engineering, and mathematics.", category: "Science", tags: JSON.stringify(["physics","youtube","counterintuitive","engineering","popular-science"]), type: "video", featured: 0 },

  // ── Philosophy & Critical Thinking ───────────────────────────────────────────
  { title: "Crash Course Philosophy", url: "https://www.youtube.com/playlist?list=PL8dPuuaLjXtNgK6MZucdYldNkMybYIHKR", description: "Hank Green's accessible video series covering logic, ethics, epistemology, and philosophy of mind.", category: "Philosophy", tags: JSON.stringify(["philosophy","logic","ethics","youtube","beginner"]), type: "video", featured: 0 },
  { title: "Your Logical Fallacy Is", url: "https://yourlogicalfallacyis.com/", description: "Beautiful, printable guide to 24 common logical fallacies with clear examples. Essential for critical thinking.", category: "Philosophy", tags: JSON.stringify(["logic","fallacies","critical-thinking","reference","visual"]), type: "article", featured: 1 },
  { title: "Stanford Encyclopedia of Philosophy", url: "https://plato.stanford.edu/", description: "The authoritative, peer-reviewed reference for philosophy — comprehensive articles on every philosophical topic.", category: "Philosophy", tags: JSON.stringify(["philosophy","reference","academic","comprehensive"]), type: "article", featured: 0 },
];

async function seed() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log("Connected to database");

  const [existing] = await conn.execute("SELECT COUNT(*) as count FROM library_resources");
  console.log(`Existing resources: ${existing[0].count}`);

  let added = 0;
  let skipped = 0;

  for (const r of resources) {
    try {
      const [rows] = await conn.execute("SELECT id FROM library_resources WHERE url = ?", [r.url]);
      if (rows.length > 0) { skipped++; continue; }
      await conn.execute(
        `INSERT INTO library_resources (title, url, description, category, tags, type, featured, addedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [r.title, r.url, r.description, r.category, r.tags, r.type, r.featured ?? 0]
      );
      added++;
    } catch (err) {
      console.error(`Failed to insert: ${r.title}`, err.message);
    }
  }

  console.log(`Done! Added: ${added}, Skipped (already exists): ${skipped}`);
  await conn.end();
}

seed().catch(console.error);
