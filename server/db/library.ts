/**
 * db/library.ts — Library resources and seeding.
 */
import { eq, desc } from 'drizzle-orm';
import { getDb } from './connection';
import { libraryResources, type LibraryResource } from '../../drizzle/schema';

let _librarySeeded = false;

export async function getLibraryResources(category?: string, _search?: string): Promise<LibraryResource[]> {
  const db = await getDb();
  if (!db) return [];
  await seedLibraryResources();
  if (category && category !== 'All') {
    return db.select().from(libraryResources)
      .where(eq(libraryResources.category, category))
      .orderBy(desc(libraryResources.featured));
  }
  return db.select().from(libraryResources).orderBy(desc(libraryResources.featured));
}

export async function seedLibraryResources(): Promise<void> {
  if (_librarySeeded) return;
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(libraryResources).limit(1);
  if (existing.length > 0) { _librarySeeded = true; return; }

  const resources: Array<{
    title: string; url: string; description: string; category: string;
    tags: string[]; difficulty: 'beginner' | 'intermediate' | 'advanced';
    type: 'article' | 'video' | 'course' | 'tool' | 'paper' | 'book' | 'repo';
    featured: boolean;
  }> = [
    { title: 'Attention Is All You Need', url: 'https://arxiv.org/abs/1706.03762', description: 'The landmark 2017 paper introducing the Transformer architecture.', category: 'AI & Machine Learning', tags: ['transformers', 'attention', 'nlp'], difficulty: 'advanced', type: 'paper', featured: true },
    { title: 'Andrej Karpathy: Neural Networks Zero to Hero', url: 'https://karpathy.ai/zero-to-hero.html', description: 'Build neural networks from scratch — the most respected practical deep learning course.', category: 'AI & Machine Learning', tags: ['neural-networks', 'python', 'backprop'], difficulty: 'intermediate', type: 'course', featured: true },
    { title: 'Google Gemini API Documentation', url: 'https://ai.google.dev/docs', description: 'Official Gemini API reference — multimodal, function calling, streaming.', category: 'AI & Machine Learning', tags: ['gemini', 'api', 'llm'], difficulty: 'intermediate', type: 'article', featured: true },
    { title: 'Fast.ai Practical Deep Learning', url: 'https://course.fast.ai', description: 'Top-down, practical deep learning. Free and world-class.', category: 'AI & Machine Learning', tags: ['deep-learning', 'pytorch', 'free'], difficulty: 'intermediate', type: 'course', featured: false },
    { title: 'The Odin Project', url: 'https://www.theodinproject.com', description: 'Free full-stack curriculum covering HTML, CSS, JavaScript, Node.js, React.', category: 'Web Development', tags: ['html', 'css', 'javascript', 'free'], difficulty: 'beginner', type: 'course', featured: true },
    { title: 'tRPC Documentation', url: 'https://trpc.io/docs', description: 'End-to-end type-safe APIs without code generation.', category: 'Web Development', tags: ['typescript', 'api', 'fullstack'], difficulty: 'intermediate', type: 'article', featured: false },
    { title: 'CS50: Introduction to Computer Science', url: 'https://cs50.harvard.edu/x/', description: "Harvard's legendary intro CS course — free, rigorous, comprehensive.", category: 'Computer Science', tags: ['cs50', 'harvard', 'python', 'free'], difficulty: 'beginner', type: 'course', featured: true },
    { title: 'The Missing Semester of Your CS Education', url: 'https://missing.csail.mit.edu', description: 'MIT course: shell, vim, git, debugging, security.', category: 'Computer Science', tags: ['shell', 'git', 'tools', 'mit'], difficulty: 'beginner', type: 'course', featured: true },
    { title: 'Designing Data-Intensive Applications', url: 'https://dataintensive.net', description: 'The definitive guide to reliable, scalable data systems.', category: 'Software Engineering', tags: ['databases', 'distributed-systems', 'book'], difficulty: 'advanced', type: 'book', featured: true },
    { title: 'The Pragmatic Programmer', url: 'https://pragprog.com/titles/tpp20/', description: 'Timeless principles for writing clean, maintainable code.', category: 'Software Engineering', tags: ['best-practices', 'clean-code', 'book'], difficulty: 'intermediate', type: 'book', featured: true },
    { title: 'Kaggle Learn', url: 'https://www.kaggle.com/learn', description: 'Free micro-courses in Python, ML, SQL, data visualization.', category: 'Data Science', tags: ['python', 'ml', 'sql', 'free'], difficulty: 'beginner', type: 'course', featured: true },
    { title: 'Connected Papers', url: 'https://www.connectedpapers.com', description: 'Explore academic paper networks visually.', category: 'Research Methods', tags: ['papers', 'citations', 'visualization'], difficulty: 'beginner', type: 'tool', featured: true },
    { title: 'Semantic Scholar', url: 'https://www.semanticscholar.org', description: 'AI-powered academic search with free access to millions of papers.', category: 'Research Methods', tags: ['papers', 'search', 'ai'], difficulty: 'beginner', type: 'tool', featured: true },
    { title: 'Anki — Spaced Repetition', url: 'https://apps.ankiweb.net', description: 'The gold standard for spaced repetition flashcards.', category: 'Productivity', tags: ['flashcards', 'spaced-repetition', 'memory', 'free'], difficulty: 'beginner', type: 'tool', featured: true },
    { title: 'Refactoring UI', url: 'https://www.refactoringui.com', description: 'Practical design advice for developers.', category: 'Design', tags: ['ui-design', 'css', 'visual-design'], difficulty: 'beginner', type: 'book', featured: true },
  ];

  for (const resource of resources) {
    await db.insert(libraryResources).values(resource);
  }
  _librarySeeded = true;
}
