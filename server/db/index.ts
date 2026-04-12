/**
 * db/index.ts — Re-exports all database functions by domain.
 *
 * Consumers can import from 'server/db' (or keep using 'server/db.ts' via
 * the backward-compat shim) without knowing which domain file they come from.
 */

// Connection
export { getDb } from './connection';

// Users & visitors
export {
  upsertUser, getUserByOpenId,
  getOrCreateVisitorProfile, updateVisitorProfile,
  getChatHistory, saveChatMessage, saveContactSubmission,
} from './users';

// Gamification
export { addXP, recordPageVisit } from './gamification';

// Flashcards
export {
  getFlashcardDeckById, getFlashcardDecks, createFlashcardDeck,
  addFlashcardsToDecks, getFlashcardsForDeck, getDueFlashcards,
  reviewFlashcard,
} from './flashcards';

// Mind maps
export {
  getMindMaps, getMindMapById, saveMindMap, updateMindMap, deleteMindMap,
} from './mindmaps';

// Lessons
export {
  saveLesson, getLessonById, getLessonsByCurriculum,
  markLessonComplete, incrementLessonViewCount, searchSharedLessons,
  markLessonAsShared,
  askLessonQuestion, saveLessonAnswer, getLessonQuestions,
  getQuestionAnswer, markAnswerHelpful,
  rateLessonAndFeedback, getLessonRating, getLessonStats,
  startLessonProgress, completeLessonProgress, getUserProgress,
  getStudyStats, startCurriculumProgress, getCurriculumProgress,
} from './lessons';

// Research & codex
export {
  saveResearchSession, getResearchSessions, updateResearchSessionNotes,
  getCodexEntries, seedCodexEntries,
} from './research';

// Library
export { getLibraryResources, seedLibraryResources } from './library';

// AI provider settings
export { getAIProviderSettings, upsertAIProviderSettings } from './aiProviders';
