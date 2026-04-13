import { z } from "zod";
import { publicProcedure, visitorProcedure, router } from "../_core/trpc";
import {
  addXP,
  createFlashcardDeck,
  addFlashcardsToDecks,
  getFlashcardDecks,
  getFlashcardsForDeck,
  getDueFlashcards,
  reviewFlashcard,
} from "../db";
import { callAI } from "./shared";

function getVisitorId(ctx: { visitorCookieId: string | null }): string {
  if (!ctx.visitorCookieId) {
    throw new Error("Visitor cookie not set");
  }
  return ctx.visitorCookieId;
}

export const flashcardsRouter = router({
  getDecks: visitorProcedure.query(async ({ ctx }) =>
    getFlashcardDecks(getVisitorId(ctx))
  ),
  getCards: publicProcedure
    .input(z.object({ deckId: z.number() }))
    .query(async ({ input }) => getFlashcardsForDeck(input.deckId)),
  getDueCards: publicProcedure
    .input(z.object({ deckId: z.number() }))
    .query(async ({ input }) => getDueFlashcards(input.deckId)),

  createDeckFromResearch: visitorProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        cards: z.array(z.object({ front: z.string(), back: z.string() })),
        sourceId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const cookieId = getVisitorId(ctx);
      const deckId = await createFlashcardDeck({
        cookieId,
        title: input.title,
        description: input.description,
        sourceType: input.sourceId ? "research" : "ai_generated",
        sourceId: input.sourceId,
      });
      await addFlashcardsToDecks(deckId, input.cards);
      await addXP(cookieId, 20);
      return { deckId, success: true };
    }),

  generateDeck: visitorProcedure
    .input(
      z.object({
        topic: z.string(),
        count: z.number().min(5).max(30).default(10),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const cookieId = getVisitorId(ctx);
      const prompt = `Generate ${input.count} high-quality spaced repetition flashcards for: "${input.topic}". Return ONLY valid JSON: {"cards":[{"front":"question","back":"answer"}]}`;
      const response = await callAI(cookieId, prompt, undefined, 2000);
      let cards: Array<{ front: string; back: string }> = [];
      try {
        const m = response.match(/\{[\s\S]*\}/);
        if (m)
          cards = (
            JSON.parse(m[0]) as {
              cards: Array<{ front: string; back: string }>;
            }
          ).cards;
      } catch (_e) {
        /* fallback */
      }
      const deckId = await createFlashcardDeck({
        cookieId,
        title: `${input.topic} — Flashcards`,
        sourceType: "ai_generated",
      });
      await addFlashcardsToDecks(deckId, cards);
      await addXP(cookieId, 15);
      return { deckId, cardCount: cards.length, success: true };
    }),

  review: visitorProcedure
    .input(
      z.object({
        cardId: z.number(),
        deckId: z.number(),
        rating: z.enum(["again", "hard", "good", "easy"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const cookieId = getVisitorId(ctx);
      await reviewFlashcard(input.cardId, input.deckId, cookieId, input.rating);
      if (input.rating === "good" || input.rating === "easy")
        await addXP(cookieId, 2);
      return { success: true };
    }),

  completeSession: visitorProcedure
    .input(z.object({ cardsReviewed: z.number() }))
    .mutation(async ({ input, ctx }) =>
      addXP(getVisitorId(ctx), Math.min(input.cardsReviewed * 3, 50))
    ),
});
