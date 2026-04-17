import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { addXP, getMindMaps, getMindMapById, saveMindMap, updateMindMap, deleteMindMap } from "../db";
import { callAI } from "./shared";
import { type MindMapNode } from "../../drizzle/schema";
import { recordPsychSignalAndRefresh } from "../services/personalityAnalyzer";

export const mindmapRouter = router({
  list: publicProcedure
    .input(z.object({ cookieId: z.string() }))
    .query(async ({ input }) => getMindMaps(input.cookieId)),

  get: publicProcedure
    .input(z.object({ id: z.number(), cookieId: z.string() }))
    .query(async ({ input }) => {
      const map = await getMindMapById(input.id);
      if (!map) return null;
      // Ownership check — only return maps belonging to the requesting visitor
      if (map.cookieId !== input.cookieId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return map;
    }),

  generate: publicProcedure
    .input(z.object({ cookieId: z.string(), topic: z.string().max(500), depth: z.number().min(1).max(3).default(2) }))
    .mutation(async ({ input, ctx }) => {
      const prompt = `Generate a comprehensive mind map for "${input.topic}" at depth ${input.depth}. Return ONLY valid JSON:
{"nodes":[{"id":"root","label":"${input.topic}","parentId":null,"category":"root","x":0,"y":0},{"id":"n1","label":"Main concept","parentId":"root","category":"primary","x":250,"y":-150}]}
Rules: root node id="root". Generate 6-10 primary nodes. Depth 2+: add 2-3 children per primary. Spread radially (x/y range -600 to 600). Labels: 2-5 words. Categories: root, primary, secondary, tertiary.`;
      let nodes: MindMapNode[] = [];
      try {
        const response = await callAI(input.cookieId, prompt, undefined, 3000);
        try {
          const m = response.match(/\{[\s\S]*\}/);
          if (m) nodes = (JSON.parse(m[0]) as { nodes: MindMapNode[] }).nodes;
        } catch (_e) { /* fallback empty */ }
      } catch (_e) { /* AI unavailable */ }
      const mapId = await saveMindMap({ cookieId: input.cookieId, title: input.topic, rootTopic: input.topic, nodesJson: nodes });
      await addXP(input.cookieId, 15);
      const userId = ctx.user?.id;
      if (userId) {
        await recordPsychSignalAndRefresh(userId, {
          source: "mindmap",
          signalType: "map.generated",
          path: "/mindmap",
          topic: input.topic,
          metrics: {
            depth: input.depth,
            nodeCount: nodes.length,
          },
        });
      }
      return { mapId, nodes, success: true };
    }),

  expandNode: publicProcedure
    .input(z.object({
      cookieId: z.string(), mapId: z.number(), nodeId: z.string(), nodeLabel: z.string(),
      existingNodes: z.array(z.object({ id: z.string(), label: z.string(), parentId: z.string().nullable(), category: z.string().optional(), x: z.number(), y: z.number() })),
    }))
    .mutation(async ({ input }) => {
      // Ownership check before mutating
      const map = await getMindMapById(input.mapId);
      if (!map) throw new TRPCError({ code: "NOT_FOUND", message: "Mind map not found" });
      if (map.cookieId !== input.cookieId) throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });

      const prompt = `Expand "${input.nodeLabel}" in a mind map. Existing: ${input.existingNodes.map(n => n.label).join(", ")}. Generate 4-6 new child nodes. Return ONLY valid JSON: {"nodes":[{"id":"exp_1","label":"concept","parentId":"${input.nodeId}","category":"secondary","x":0,"y":0}]}`;
      let newNodes: MindMapNode[] = [];
      try {
        const response = await callAI(input.cookieId, prompt, undefined, 1000);
        try {
          const m = response.match(/\{[\s\S]*\}/);
          if (m) {
            const ts = Date.now();
            newNodes = (JSON.parse(m[0]) as { nodes: MindMapNode[] }).nodes.map((n, i) => ({ ...n, id: `exp_${ts}_${i}` }));
          }
        } catch (_e) { /* fallback */ }
      } catch (_e) { /* AI unavailable */ }
      const allNodes = [...input.existingNodes, ...newNodes] as MindMapNode[];
      await updateMindMap(input.mapId, { nodesJson: allNodes });
      await addXP(input.cookieId, 5);
      return { newNodes, success: true };
    }),

  save: publicProcedure
    .input(z.object({ cookieId: z.string(), title: z.string().max(512), rootTopic: z.string().max(256), nodesJson: z.array(z.any()) }))
    .mutation(async ({ input }) => {
      const mapId = await saveMindMap({ cookieId: input.cookieId, title: input.title, rootTopic: input.rootTopic, nodesJson: input.nodesJson as MindMapNode[] });
      return { mapId, success: true };
    }),

  update: publicProcedure
    .input(z.object({ id: z.number(), cookieId: z.string(), title: z.string().optional(), nodesJson: z.array(z.any()).optional() }))
    .mutation(async ({ input }) => {
      // Ownership check before update
      const map = await getMindMapById(input.id);
      if (!map) throw new TRPCError({ code: "NOT_FOUND", message: "Mind map not found" });
      if (map.cookieId !== input.cookieId) throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });

      await updateMindMap(input.id, { title: input.title, nodesJson: input.nodesJson as MindMapNode[] | undefined });
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number(), cookieId: z.string() }))
    .mutation(async ({ input }) => {
      // Ownership check before delete
      const map = await getMindMapById(input.id);
      if (!map) throw new TRPCError({ code: "NOT_FOUND", message: "Mind map not found" });
      if (map.cookieId !== input.cookieId) throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });

      await deleteMindMap(input.id);
      return { success: true };
    }),
});
