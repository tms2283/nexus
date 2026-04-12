# Nexus Learning Platform — TODO

## Phase 1: Architecture & Schema
- [x] Initialize project scaffold (web-db-user)
- [x] Rebuild database schema: courses, modules, progress, research_sessions, visitor_profiles, codex_entries, chat_messages, contact_submissions
- [x] Update Gemini API key secret
- [x] Define platform brand: "Nexus" — AI-powered research and learning platform

## Phase 2: Design System & Navigation
- [x] Global CSS: professional dark theme, OKLCH colors, Space Grotesk + JetBrains Mono typography
- [x] App.tsx routing: Home, Learn, Research, Depth, Library, Lab, About, Contact
- [x] Persistent top navigation with all 8 page links
- [x] Active route highlighting
- [x] Mobile-responsive hamburger menu

## Phase 3: Home Page (AI Dashboard)
- [x] Personalized AI greeting (Gemini, cookie-aware, time-of-day)
- [x] Learning stats overview (XP, explanation depths, retention stats)
- [x] Feature cards grid (6 platform features)
- [x] Entrance quiz with LLM-generated questions
- [x] Particle/animated hero background with mouse interaction
- [x] Typewriter headline animation

## Phase 4: Learn Page (Course Catalog + AI Curriculum)
- [x] AI-generated personalized learning path modal
- [x] Course catalog with category filter
- [x] Socratic mode toggle
- [x] Module viewer with lesson content
- [x] XP rewards for generating curriculum

## Phase 5: Research Page (Research Forge)
- [x] Text/URL input for document analysis
- [x] AI-powered document summarization (Gemini)
- [x] AI-generated key insights and highlights
- [x] Auto-generated flashcards for spaced repetition
- [x] Save research sessions to DB

## Phase 6: Depth Engine Page
- [x] 5-level concept explainer (child/student/expert/Socratic/analogy)
- [x] Animated level selector
- [x] AI explanation rendering with Streamdown markdown
- [x] XP rewards for using depth engine

## Phase 7: Library Page (Knowledge Base)
- [x] Searchable curated resource cards
- [x] AI-augmented search with semantic understanding
- [x] Topic clustering / category filter
- [x] Featured resources section
- [x] AI explanation per resource (inline)

## Phase 8: Lab Page (Interactive Coding)
- [x] Browser-based code editor
- [x] 4+ coding challenges with difficulty levels
- [x] AI-assisted debugging (Gemini explains errors)
- [x] Hint system and solution reveal
- [x] XP rewards for completing challenges

## Phase 9: About Page (Tim Schmoyer)
- [x] Professional bio: Tim Schmoyer, Fredericksburg VA
- [x] Platform mission statement
- [x] Technology stack
- [x] Contact CTA

## Phase 10: Contact Page
- [x] Contact form with validation
- [x] AI message composer (Gemini suggestions)
- [x] Owner notification on submission
- [x] Social links

## Phase 11: AI & Personalization Systems
- [x] Floating Nexus AI chat assistant (site-wide, Gemini-powered)
- [x] Cookie-based visitor profiling (cookieId, visitCount, pagesVisited)
- [x] Behavioral tracking (pages, interests, quiz results)
- [x] XP and level system (100 XP per level)
- [x] Achievement badges (explorer, curious-mind, deep-diver, ai-whisperer, nexus-scholar, etc.)
- [x] Streak tracking

## Phase 12: Gamification HUD
- [x] Persistent bottom-left HUD overlay
- [x] XP bar, level, streak display
- [x] Badge unlock toast notifications
- [x] Expandable achievements panel
- [x] XP gain animation

## Phase 13: Branding & Polish
- [x] All "Timverse" references removed from codebase
- [x] Platform renamed to "Nexus" throughout
- [x] index.html updated with Nexus title and meta tags
- [x] Nexus AI chat assistant branding
- [x] Nexus Scholar badge

## Phase 14: Testing & Delivery
- [x] 13 vitest unit tests passing (auth, gemini API, visitor profile, XP validation, quiz, codex, research)
- [x] TypeScript clean compile (0 errors)
- [x] Checkpoint saved

## Phase 15: New Features (Round 2)

### DB Schema Extensions
- [x] flashcard_decks table (userId, cookieId, title, sourceType, createdAt)
- [x] flashcards table (deckId, front, back, interval, easeFactor, dueDate, reviewCount)
- [x] flashcard_reviews table (cardId, rating, reviewedAt)
- [x] ai_provider_settings table (cookieId, provider, apiKey encrypted, model, createdAt)
- [x] mind_maps table (cookieId, userId, title, nodesJson, createdAt, updatedAt)
- [x] library_resources table (title, url, description, category, tags, featured, addedAt)

### AI Provider Switcher
- [x] Server router: aiProvider.setProvider mutation (stores provider + API key per cookieId)
- [x] Server router: aiProvider.getProvider query
- [x] Multi-provider invokeAI wrapper: routes to Gemini, Perplexity, or OpenAI based on stored preference
- [x] All new AI procedures use the provider switcher
- [x] Perplexity API integration (llama-3.1-sonar-large-128k-online)
- [x] OpenAI API integration (gpt-4o)

### Flashcard Review Page (/flashcards)
- [x] List all flashcard decks (from Research Forge sessions)
- [x] Flip-card UI with smooth 3D CSS animation
- [x] SM-2 spaced repetition algorithm (Again/Hard/Good/Easy ratings)
- [x] Due card queue — only show cards due today
- [x] Progress bar showing cards remaining in session
- [x] Session summary screen (cards reviewed, accuracy, next due date)
- [x] XP reward for completing a review session
- [x] AI flashcard generator (topic → deck)

### Mind Map Page (/mindmap)
- [x] Interactive SVG canvas with draggable nodes
- [x] AI-generated initial map from a topic prompt (Gemini)
- [x] Expand any node: AI generates child concepts
- [x] Color-coded node categories
- [x] Save mind maps to DB per cookieId
- [x] Load/switch between saved maps

### Library Seeding
- [x] 30 real vetted resources seeded into library_resources table
- [x] 7 categories: AI/ML, Web Development, Data Science, Computer Science, Learning Science, Mathematics, Tools
- [x] Each resource has title, URL, description, tags, featured flag

### Settings Page (/settings)
- [x] AI Provider selection (Gemini / Perplexity / OpenAI)
- [x] API key input field (masked, stored in DB)
- [x] Current provider indicator with model name
- [x] Test connection button
- [x] Clear all personal data option

### Navigation & Routing Updates
- [x] Add /flashcards route
- [x] Add /mindmap route
- [x] Add /settings route
- [x] Update Navigation with Tools dropdown (Flashcards, Mind Maps, AI Settings)
- [x] All routes registered in App.tsx

### Final Fixes (Round 2 Completion)
- [x] All AI procedures route through unified provider switcher (callAI/callAIChat)
- [x] cookieId passed to all AI mutations for provider preference
- [x] Gemini API key updated with paid key from APIKEYS.txt
- [x] DepthEngine, Research, Codex pages pass cookieId to AI mutations
- [x] 13/13 vitest tests passing
- [x] TypeScript: 0 errors

## Phase 16: Fix Gemini 429 Rate Limit Errors
- [x] Switch default AI to built-in Manus LLM (invokeLLM) — no quota issues
- [x] Keep Gemini as optional override when user supplies their own paid key
- [x] Add retry logic with exponential backoff in aiProvider.ts
- [x] Add graceful 429 error messages in UI (not raw API errors)

## Phase 17: Testing Center, AI Labs Expansion, Knowledge Base

### Fix Lab Experiments
- [x] Make all existing Lab experiments fully functional (not placeholder)
- [x] Experiment: Prompt Engineering Sandbox (live Gemini calls, compare outputs)
- [x] Experiment: AI Text Classifier (classify any text by sentiment/topic/intent)
- [x] Experiment: Chain-of-Thought Visualizer (show AI reasoning step by step)
- [x] Experiment: AI Image Describer (upload image, get AI description)
- [x] Experiment: AI Debate (two AI personas argue a topic)
- [x] Experiment: Token Counter / Cost Estimator

### Testing Center (/tests)
- [x] Testing Center page with subject selection
- [x] Baseline knowledge tests: Science, History, Mathematics, Logic, Language/Vocabulary
- [x] Each test: 10-15 questions, scored, with AI-generated explanations per answer
- [x] Results saved to DB per cookieId with timestamp
- [x] Progress tracking: show improvement over time (My Progress dashboard)
- [x] IQ Test: matrix reasoning, pattern recognition, spatial, verbal, numerical (15 questions)
- [x] IQ scoring: normed scoring algorithm (mean 100, SD 15)
- [x] IQ test results: percentile, score breakdown by category
- [x] Test results wired to DB via testing.saveResult procedure

### AI Knowledge Base Expansion
- [x] Seed 50+ AI-focused resources (theory, practical, prompt engineering, ML, ethics)
- [x] Add AI-specific categories to Library: Prompt Engineering, LLM Theory, AI Tools, AI Ethics, ML Fundamentals
- [x] User-contributed knowledge: research sessions can be "published" to shared knowledge base (Contribute to Library button in Research Forge)
- [x] Community knowledge feed on Library page (Curated/Community toggle with library.listCommunity)

### DB Schema for Testing
- [x] test_questions table (testId, category, question, options JSON, correctAnswer, explanation, difficulty)
- [x] test_results table (cookieId, testId, score, answers JSON, completedAt, timeTaken)
- [x] iq_results table (cookieId, score, percentile, categoryScores JSON, completedAt)

## Phase 18: My Progress Dashboard
- [x] Dashboard page at /dashboard
- [x] XP/Level progress bar
- [x] Streak display
- [x] Test history with scores
- [x] IQ result display
- [x] Research sessions history
- [x] Badges earned display
- [x] Platform exploration tracker
- [x] Quick action links
- [x] My Progress added to Tools navigation dropdown

## Bug Fixes
- [x] Fix "Generate a Learning Path" button on Learn page - path cards now switch to AI Curriculum tab with pre-filled goal
- [x] Add contributedBy column to library_resources table
- [x] Add library.listCommunity tRPC procedure

## Phase 19: Trend Charts on My Progress Dashboard
- [x] Add testing.getScoreHistory tRPC procedure (groups results by subject, ordered oldest→newest)
- [x] Recharts already installed — used directly (AreaChart, RadarChart)
- [x] Knowledge Profile radar chart (latest score per subject, requires 3+ subjects)
- [x] IQ Score Trend area chart with reference line at avg 100
- [x] Per-subject area charts with delta indicator (Improving/Stable/Declining), best score, attempt count
- [x] Score Trends section appears only when user has test history (empty state handled)
- [x] Charts use dark theme OKLCH colors consistent with platform design
- [x] Add test for testing.getScoreHistory procedure (19/19 tests passing)

## Phase 20: Extensive Platform Expansion

### New Pages
- [x] Leaderboard page (/leaderboard) - XP rankings, top test scores, IQ leaders, badges showcase
- [x] AI Study Buddy page (/study-buddy) - adaptive quizzing, Socratic dialogue, concept reinforcement
- [x] Daily Challenge page (/daily) - one AI challenge per day, XP rewards, task checklist

### Home Page Enhancements
- [x] Daily AI Tip widget (AI-generated, changes each day)
- [x] "Today's Challenge" CTA card on Home page
- [ ] Platform stats ticker (total sessions, resources, users active today) - shown on Home page
- [x] Wire AI Curriculum to auto-generate lessons when curriculum is created
- [x] Improved hero (particle animation + typewriter effect already implemented)
- [ ] Featured learning paths carousel (scrollable cards with controls on Home page)

### Learn Page Enhancements
- [ ] Add 10+ more courses (Philosophy, Economics, Biology, Physics, Psychology, History of Science, Ethics, Creative Writing, Public Speaking, Critical Thinking)
- [ ] Skill tree visualization (prerequisite chains between courses)
- [ ] Course completion certificates (AI-generated, downloadable)
- [ ] "Continue where you left off" section

### Lab Page Enhancements
- [x] New experiment: Socratic Tutor (AI asks questions instead of giving answers)
- [x] New experiment: AI Story Generator (collaborative fiction with branching choices)
- [x] New experiment: Cognitive Bias Detector (analyze text for logical fallacies and biases)
- [ ] New experiment: AI Fact Checker (verify claims against knowledge base)
- [ ] Experiment history / saved outputs

### AI Curriculum Lesson Infrastructure
- [x] lessons DB table (cookieId, curriculumId, title, content, objectives, keyPoints, resources, difficulty, order, completed)
- [x] Lesson helper functions in db.ts (saveLesson, getLessonById, getLessonsByCurriculum, markLessonComplete)
- [x] tRPC procedures: generateLesson, getLesson, getLessonsByCurriculum, completeLesson
- [x] Lesson viewer page (/lesson/:lessonId) with full content display, objectives, key points, resources
- [x] Lesson completion tracking with XP rewards (25 XP per lesson)

### Testing Center Enhancements
- [x] Add 4 new test subjects: Geography, Philosophy, Technology, Art & Culture
- [ ] Daily Quiz: 5 random questions across all subjects, streak bonus XP
- [ ] Test difficulty levels (Easy/Medium/Hard) per subject
- [ ] Wrong answer review mode (see explanations for missed questions)
- [ ] Test comparison: compare your scores to platform averages

### Research Forge Enhancements
- [x] Citation generator (APA/MLA/Chicago from any URL or text)
- [x] Side-by-side comparison mode (analyze two topics)
- [ ] Export research session as PDF/Markdown
- [ ] Research history timeline view

### Library Enhancements
- [x] Resource bookmarking (save to personal reading list via localStorage)
- [x] Resource ratings (1-5 stars, stored per cookieId via rateResource procedure)
- [ ] Reading list page (/reading-list)
- [ ] "Recommended for you" section based on research topics

### Dashboard Enhancements
- [x] Weekly activity heatmap (GitHub-style contribution graph on Dashboard)
- [x] Learning velocity metric (XP per day shown in Dashboard activity heatmap)
- [x] Subject mastery levels (Novice/Apprentice/Journeyman/Expert/Master on Dashboard)
- [x] Personalized AI insight (AI-generated insight panel on Dashboard via dashboard.getInsight)

### UX & Polish
- [x] Keyboard shortcut overlay (press ? to show all shortcuts - built into CommandPalette)
- [x] Global search (Cmd+K) - CommandPalette component with search button in nav
- [x] Smooth page transitions (framer-motion AnimatePresence with fade+slide)
- [x] Toast notifications for XP gains (sonner/toast library integrated, used throughout app)
- [ ] Toast notifications for badge unlocks (already have GamificationHUD floating +XP)
- [ ] "What's New" changelog modal for returning users

## Phase 21: Comprehensive Lesson System (Current)

### Database Schema Extensions
- [x] Add `isShared` flag to lessons table (boolean, default false) for app-wide reuse
- [x] Add `externalResources` JSON column to lessons table (Wikipedia links, etc.)
- [x] Create `lesson_questions` table (lessonId, userId, cookieId, question, createdAt)
- [x] Create `lesson_answers` table (questionId, aiResponse, createdAt, helpful count)
- [x] Add `relatedTopics` JSON column to lessons table for off-topic connections

### Auto-Generate Lessons on Curriculum Creation
- [x] Modify generateCurriculum mutation to auto-generate lessons for each phase
- [x] Generate unique curriculumId for each curriculum
- [x] Store curriculum metadata in lessons table
- [x] Auto-generate lessons with AI content when curriculum is created
- [x] Lessons are marked as shared for app-wide reuse

### External Resource Links
- [ ] Add Wikipedia API integration to fetch relevant articles
- [x] Store resource links in lessons table (externalResources column)
- [x] Display resources in lesson viewer with icons and descriptions
- [ ] Add "Learn more" section with curated external links

### Q&A System on Lesson Pages
- [x] Add question input form to lesson page
- [x] Create lesson.askLessonQuestion tRPC procedure
- [x] Implement AI-powered answer generation (context-aware)
- [x] Display Q&A thread below lesson content
- [x] Add "Helpful" voting on answers (UI wired, backend ready)
- [x] Show answer loading state with spinner

### Off-Topic Exploration
- [x] Add "Explore Related Topic" button on lesson page
- [x] Create lesson.exploreOffTopic tRPC procedure
- [x] Generate new lesson on related topic dynamically
- [ ] Navigate to new lesson with breadcrumb trail
- [ ] Track exploration path for user context

### Shared Lesson Database
- [x] Mark lessons as shared after first generation (isShared: true)
- [x] Create lesson.searchSharedLessons query (full-text search)
- [x] Reuse existing lessons if topic matches (getOrCreateLesson logic)
- [x] Add lesson.getOrCreateLesson procedure (check if exists, create if not)
- [x] Track viewCount on lesson page (incrementLessonViewCount)

### Testing & Polish
- [x] Test auto-generation flow end-to-end
- [x] Test Q&A submission and AI response
- [x] Test off-topic exploration navigation
- [x] Verify external resources load correctly
- [x] Test shared lesson reuse across users
- [x] All 19+ tests passing
- [x] TypeScript clean (0 errors)

## Phase 22: Lesson Rating & Feedback System
- [x] Add lesson_ratings table (lessonId, cookieId, rating 1-5, createdAt, updatedAt)
- [x] Add lesson_feedback table (lessonId, cookieId, feedback text, category, createdAt)
- [x] Create tRPC procedure: rateLessonAndFeedback (submit rating + feedback)
- [x] Create tRPC procedure: getLessonRating (get user's rating for lesson)
- [x] Create tRPC procedure: getLessonStats (avg rating, feedback count, sentiment)
- [x] Build rating UI component on lesson page (5-star rating, feedback form)
- [x] Show lesson rating stats (average rating, total ratings, sentiment)
- [x] Add feedback categories (Too Easy, Too Hard, Unclear, Excellent, Needs Update)
- [x] Display rating before/after completion
- [x] Toast notification on successful feedback submission

## Phase 23: User Progress Tracking System
- [x] Add lesson_progress table (cookieId, lessonId, startedAt, completedAt, timeSpent, attempts)
- [x] Add curriculum_progress table (cookieId, curriculumId, startedAt, completedAt, lessonsCompleted, totalLessons)
- [x] Track lesson start time when user opens lesson
- [x] Track time spent on lesson (auto-update on page exit)
- [x] Track number of attempts per lesson
- [x] Calculate completion percentage per curriculum
- [x] Store learning streak (consecutive days of activity)
- [x] Track total study time across platform
- [x] Create tRPC procedure: getUserProgress (all progress data)
- [x] Create tRPC procedure: getCurriculumProgress (progress for specific curriculum)
- [x] Create tRPC procedure: getStudyStats (total time, streak, lessons completed, etc.)

## Phase 24: Progress Dashboard/Stats Page
- [x] Create /progress page with comprehensive stats
- [x] Display learning stats card (total XP, level, streak)
- [x] Display curriculum progress cards (% complete per curriculum)
- [x] Display lesson history timeline (recent lessons, time spent)
- [x] Display study time chart (daily/weekly/monthly breakdown)
- [x] Display learning velocity (lessons per week trend)
- [x] Display top subjects by time spent
- [x] Display achievements/milestones unlocked
- [x] Add "Continue Learning" section (resume incomplete lessons)
- [x] Export progress as PDF/CSV
- [x] Add progress comparison (your stats vs platform average)
