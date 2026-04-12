import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import {
  addXP, createFlashcardDeck, addFlashcardsToDecks,
  getFlashcardDecks, getFlashcardsForDeck, getDueFlashcards,
  reviewFlashcard, getFlashcardDeckById,
} from "../db";
import { callAI } from "./shared";

/** Ownership guard — throws FORBIDDEN if deck doesn't belong to cookieId */
async function assertDeckOwnership(deckId: number, cookieId: string): Promise<void> {
  const deck = await getFlashcardDeckById(deckId);
  if (!deck) throw new TRPCError({ code: "NOT_FOUND", message: "Deck not found" });
  if (deck.cookieId !== cookieId) throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
}

export const flashcardsRouter = router({
  getDecks: publicProcedure
    .input(z.object({ cookieId: z.string() }))
    .query(async ({ input }) => getFlashcardDecks(input.cookieId)),

  getCards: publicProcedure
    .input(z.object({ deckId: z.number(), cookieId: z.string() }))
    .query(async ({ input }) => {
      await assertDeckOwnership(input.deckId, input.cookieId);
      return getFlashcardsForDeck(input.deckId);
    }),

  getDueCards: publicProcedure
    .input(z.object({ deckId: z.number(), cookieId: z.string() }))
    .query(async ({ input }) => {
      await assertDeckOwnership(input.deckId, input.cookieId);
      return getDueFlashcards(input.deckId);
    }),

  createDeckFromResearch: publicProcedure
    .input(z.object({
      cookieId: z.string(),
      title: z.string().max(512),
      description: z.string().optional(),
      cards: z.array(z.object({ front: z.string().max(2000), back: z.string().max(2000) })).max(200),
      sourceId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const deckId = await createFlashcardDeck({
        cookieId: input.cookieId, title: input.title, description: input.description,
        sourceType: input.sourceId ? "research" : "ai_generated", sourceId: input.sourceId,
      });
      await addFlashcardsToDecks(deckId, input.cards);
      await addXP(input.cookieId, 20);
      return { deckId, success: true };
    }),

  generateDeck: publicProcedure
    .input(z.object({ cookieId: z.string(), topic: z.string().max(500), count: z.number().min(5).max(30).default(10) }))
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
    .input(z.object({
      cardId: z.number(), deckId: z.number(), cookieId: z.string(),
      rating: z.enum(["again", "hard", "good", "easy"]),
    }))
    .mutation(async ({ input }) => {
      // Ownership check — verify deck belongs to caller before recording review
      await assertDeckOwnership(input.deckId, input.cookieId);
      await reviewFlashcard(input.cardId, input.deckId, input.cookieId, input.rating);
      if (input.rating === "good" || input.rating === "easy") await addXP(input.cookieId, 2);
      return { success: true };
    }),

  completeSession: publicProcedure
    .input(z.object({ cookieId: z.string(), cardsReviewed: z.number().int().min(0).max(500) }))
    .mutation(async ({ input }) => addXP(input.cookieId, Math.min(input.cardsReviewed * 3, 50))),
});
