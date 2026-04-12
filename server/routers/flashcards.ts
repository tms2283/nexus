import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { addXP, createFlashcardDeck, addFlashcardsToDecks, getFlashcardDecks, getFlashcardsForDeck, getDueFlashcards, reviewFlashcard } from "../db";
import { callAI } from "./shared";

export const flashcardsRouter = router({
  getDecks: publicProcedure.input(z.object({ cookieId: z.string() })).query(async ({ input }) => getFlashcardDecks(input.cookieId)),
  getCards: publicProcedure.input(z.object({ deckId: z.number() })).query(async ({ input }) => getFlashcardsForDeck(input.deckId)),
  getDueCards: publicProcedure.input(z.object({ deckId: z.number() })).query(async ({ input }) => getDueFlashcards(input.deckId)),

  createDeckFromResearch: publicProcedure
    .input(z.object({ cookieId: z.string(), title: z.string(), description: z.string().optional(), cards: z.array(z.object({ front: z.string(), back: z.string() })), sourceId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const deckId = await createFlashcardDeck({ cookieId: input.cookieId, title: input.title, description: input.description, sourceType: input.sourceId ? "research" : "ai_generated", sourceId: input.sourceId });
      await addFlashcardsToDecks(deckId, input.cards);
      await addXP(input.cookieId, 20);
      return { deckId, success: true };
    }),

  generateDeck: publicProcedure
    .input(z.object({ cookieId: z.string(), topic: z.string(), count: z.number().min(5).max(30).default(10) }))
    .mutation(async ({ input }) => {
      const prompt = `Generate ${input.count} high-quality spaced repetition flashcards for: "${input.topic}". Return ONLY valid JSON: {"cards":[{"front":"question","back":"answer"}]}`;
      const response = await callAI(input.cookieId, prompt, undefined, 2000);
      let cards: Array<{ front: string; back: string }> = [];
      try {
        const m = response.match(/\{[\s\S]*\}/);
        if (m) cards = (JSON.parse(m[0]) as { cards: Array<{ front: string; back: string }> }).cards;
      } catch (_e) { /* fallback */ }
      const deckId = await createFlashcardDeck({ cookieId: input.cookieId, title: `${input.topic} — Flashcards`, sourceType: "ai_generated" });
      await addFlashcardsToDecks(deckId, cards);
      await addXP(input.cookieId, 15);
      return { deckId, cardCount: cards.length, success: true };
    }),

  review: publicProcedure
    .input(z.object({ cardId: z.number(), deckId: z.number(), cookieId: z.string(), rating: z.enum(["again", "hard", "good", "easy"]) }))
    .mutation(async ({ input }) => {
      await reviewFlashcard(input.cardId, input.deckId, input.cookieId, input.rating);
      if (input.rating === "good" || input.rating === "easy") await addXP(input.cookieId, 2);
      return { success: true };
    }),

  completeSession: publicProcedure
    .input(z.object({ cookieId: z.string(), cardsReviewed: z.number() }))
    .mutation(async ({ input }) => addXP(input.cookieId, Math.min(input.cardsReviewed * 3, 50))),
});
