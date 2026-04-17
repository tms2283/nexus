import { useState } from "react";
import { Link } from "wouter";
import PageWrapper from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AdminAI() {
  const metrics = trpc.admin.ai.getRequestMetrics.useQuery();
  const recent = trpc.admin.ai.listRecentRequests.useQuery({ limit: 30 });
  const [provider, setProvider] = useState<"builtin" | "gemini" | "perplexity">("builtin");
  const [model, setModel] = useState("gemini-2.5-pro");
  const [prompt, setPrompt] = useState("Return one sentence confirming service health.");
  const [apiKey, setApiKey] = useState("");
  const [response, setResponse] = useState("");

  const testMutation = trpc.admin.ai.runProviderTest.useMutation({
    onSuccess: (res) => {
      setResponse(res.response);
      toast.success(`Provider healthy (${res.latencyMs}ms)`);
      metrics.refetch();
      recent.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <PageWrapper pageName="admin-ai">
      <div className="min-h-screen pt-20 px-4 pb-8">
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">AI Observability</h1>
              <p className="text-sm text-muted-foreground">Provider diagnostics, latency, and request telemetry.</p>
            </div>
            <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">Back to dashboard</Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="glass rounded-xl p-4 border border-white/10"><div className="text-xs text-muted-foreground">Requests (24h)</div><div className="text-xl font-semibold">{metrics.data?.total24h ?? 0}</div></div>
            <div className="glass rounded-xl p-4 border border-white/10"><div className="text-xs text-muted-foreground">Success Rate</div><div className="text-xl font-semibold">{metrics.data?.successRate24h ?? 0}%</div></div>
            <div className="glass rounded-xl p-4 border border-white/10"><div className="text-xs text-muted-foreground">Avg Latency</div><div className="text-xl font-semibold">{metrics.data?.avgLatencyMs24h ?? 0}ms</div></div>
            <div className="glass rounded-xl p-4 border border-white/10"><div className="text-xs text-muted-foreground">Est. Cost (24h)</div><div className="text-xl font-semibold">${metrics.data?.totalEstimatedCostUsd24h ?? 0}</div></div>
          </div>

          <div className="glass rounded-xl p-4 border border-white/10 space-y-2">
            <div className="text-sm font-semibold">Run Provider Test</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <select value={provider} onChange={(e) => setProvider(e.target.value as typeof provider)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm">
                <option value="builtin">builtin</option>
                <option value="gemini">gemini</option>
                <option value="perplexity">perplexity</option>
              </select>
              <input value={model} onChange={(e) => setModel(e.target.value)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm" />
            </div>
            <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Optional API key for provider test" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm" />
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full h-24 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm" />
            <button
              onClick={() => testMutation.mutate({ provider, model, prompt, apiKey: apiKey.trim() || undefined })}
              disabled={testMutation.isPending}
              className="px-3 py-2 rounded-lg bg-[oklch(0.75_0.18_55)] text-black text-sm font-semibold disabled:opacity-50"
            >
              Run Test
            </button>
            {response && <pre className="mt-2 p-3 rounded-lg bg-black/30 border border-white/10 text-xs whitespace-pre-wrap">{response}</pre>}
          </div>

          <div className="glass rounded-xl p-4 border border-white/10">
            <div className="text-sm font-semibold mb-3">Recent AI Requests</div>
            <div className="space-y-2 max-h-[360px] overflow-auto">
              {recent.data?.map((r) => (
                <div key={r.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
                  <div className="text-foreground">{r.feature} · {r.provider}/{r.model}</div>
                  <div className="text-muted-foreground">{r.status} · {r.latencyMs}ms · {new Date(r.finishedAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
