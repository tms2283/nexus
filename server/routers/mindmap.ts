import { z } from "zod";
import { publicProcedure, visitorProcedure, router } from "../_core/trpc";
import {
  addXP,
  getMindMaps,
  getMindMapById,
  saveMindMap,
  updateMindMap,
  deleteMindMap,
} from "../db";
import { callAI } from "./shared";
import { type MindMapNode } from "../../drizzle/schema";

function getVisitorId(ctx: { visitorCookieId: string | null }): string {
  if (!ctx.visitorCookieId) {
    throw new Error("Visitor cookie not set");
  }
  return ctx.visitorCookieId;
}

export const mindmapRouter = router({
  list: visitorProcedure.query(async ({ ctx }) =>
    getMindMaps(getVisitorId(ctx))
  ),
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => getMindMapById(input.id)),

  generate: visitorProcedure
    .input(
      z.object({
        topic: z.string(),
        depth: z.number().min(1).max(3).default(2),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const cookieId = getVisitorId(ctx);
      const prompt = `Generate a comprehensive mind map for "${input.topic}" at depth ${input.depth}. Return ONLY valid JSON:
{"nodes":[{"id":"root","label":"${input.topic}","parentId":null,"category":"root","x":0,"y":0},{"id":"n1","label":"Main concept","parentId":"root","category":"primary","x":250,"y":-150}]}
Rules: root node id="root". Generate 6-10 primary nodes. Depth 2+: add 2-3 children per primary. Spread radially (x/y range -600 to 600). Labels: 2-5 words. Categories: root, primary, secondary, tertiary.`;
      const response = await callAI(cookieId, prompt, undefined, 3000);
      let nodes: MindMapNode[] = [];
      try {
        const m = response.match(/\{[\s\S]*\}/);
        if (m) nodes = (JSON.parse(m[0]) as { nodes: MindMapNode[] }).nodes;
      } catch (_e) {
        /* fallback */
      }
      const mapId = await saveMindMap({
        cookieId,
        title: input.topic,
        rootTopic: input.topic,
        nodesJson: nodes,
      });
      await addXP(cookieId, 15);
      return { mapId, nodes, success: true };
    }),

  expandNode: visitorProcedure
    .input(
      z.object({
        mapId: z.number(),
        nodeId: z.string(),
        nodeLabel: z.string(),
        existingNodes: z.array(
          z.object({
            id: z.string(),
            label: z.string(),
            parentId: z.string().nullable(),
            category: z.string().optional(),
            x: z.number(),
            y: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const cookieId = getVisitorId(ctx);
      const prompt = `Expand "${input.nodeLabel}" in a mind map. Existing: ${input.existingNodes.map(n => n.label).join(", ")}. Generate 4-6 new child nodes. Return ONLY valid JSON: {"nodes":[{"id":"exp_1","label":"concept","parentId":"${input.nodeId}","category":"secondary","x":0,"y":0}]}`;
      const response = await callAI(cookieId, prompt, undefined, 1000);
      let newNodes: MindMapNode[] = [];
      try {
        const m = response.match(/\{[\s\S]*\}/);
        if (m) {
          const ts = Date.now();
          newNodes = (JSON.parse(m[0]) as { nodes: MindMapNode[] }).nodes.map(
            (n, i) => ({ ...n, id: `exp_${ts}_${i}` })
          );
        }
      } catch (_e) {
        /* fallback */
      }
      const allNodes = [...input.existingNodes, ...newNodes] as MindMapNode[];
      await updateMindMap(input.mapId, { nodesJson: allNodes });
      await addXP(cookieId, 5);
      return { newNodes, success: true };
    }),

  save: visitorProcedure
    .input(
      z.object({
        title: z.string(),
        rootTopic: z.string(),
        nodesJson: z.array(z.any()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const cookieId = getVisitorId(ctx);
      const mapId = await saveMindMap({
        cookieId,
        title: input.title,
        rootTopic: input.rootTopic,
        nodesJson: input.nodesJson as MindMapNode[],
      });
      return { mapId, success: true };
    }),

  update: visitorProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        nodesJson: z.array(z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await updateMindMap(input.id, {
        title: input.title,
        nodesJson: input.nodesJson as MindMapNode[] | undefined,
      });
      return { success: true };
    }),

  delete: visitorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteMindMap(input.id);
      return { success: true };
    }),
});
