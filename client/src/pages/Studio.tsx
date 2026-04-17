import { useState } from "react";
import { Link } from "wouter";
import PageWrapper from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Studio() {
  const [pageId, setPageId] = useState("");
  const [baseRevisionId, setBaseRevisionId] = useState("");
  const [snapshotJson, setSnapshotJson] = useState("{\n  \"page\": { \"slug\": \"\", \"title\": \"\" },\n  \"sections\": []\n}");
  const [lastPull, setLastPull] = useState<string>("");
  const parsedPageId = Number(pageId);

  const pullQuery = trpc.studio.sync.pullWorkspace.useQuery(
    { pageId: Number.isFinite(parsedPageId) ? parsedPageId : -1 },
    { enabled: false, retry: false }
  );

  const pull = async () => {
    const result = await pullQuery.refetch();
    if (result.data) {
      setLastPull(JSON.stringify(result.data, null, 2));
      toast.success("Workspace pulled");
    } else if (result.error) {
      toast.error(result.error.message);
    }
  };

  const push = trpc.studio.sync.pushSnapshot.useMutation({
    onSuccess: (res: { conflict: boolean; currentRevisionId?: number | null; revisionId?: number }) => {
      if (res.conflict) {
        toast.error(`Conflict detected. Current revision: ${res.currentRevisionId}`);
      } else {
        toast.success(`Snapshot synced as revision ${res.revisionId}`);
      }
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  return (
    <PageWrapper pageName="studio">
      <div className="min-h-screen pt-20 px-4 pb-8">
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Desktop Studio Shell</h1>
              <p className="text-sm text-muted-foreground">Draft sync, conflict checks, and controlled publish workflow.</p>
            </div>
            <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">Open Admin</Link>
          </div>

          <div className="glass rounded-xl p-4 border border-white/10 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="Page ID" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm" />
              <input value={baseRevisionId} onChange={(e) => setBaseRevisionId(e.target.value)} placeholder="Base Revision ID (optional)" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm" />
              <div className="flex gap-2">
                <button
                  onClick={pull}
                  disabled={!Number.isFinite(parsedPageId) || parsedPageId <= 0 || pullQuery.isFetching}
                  className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm w-full"
                >
                  Pull Workspace
                </button>
                <button
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(snapshotJson) as Record<string, unknown>;
                      push.mutate({
                        pageId: parsedPageId,
                        baseRevisionId: baseRevisionId ? Number(baseRevisionId) : undefined,
                        snapshotJson: parsed,
                        label: "studio-manual-sync",
                      });
                    } catch {
                      toast.error("Snapshot JSON is invalid");
                    }
                  }}
                  disabled={!Number.isFinite(parsedPageId) || parsedPageId <= 0 || push.isPending}
                  className="px-3 py-2 rounded-lg bg-[oklch(0.75_0.18_55)] text-black text-sm font-semibold w-full"
                >
                  Push Snapshot
                </button>
              </div>
            </div>
            <textarea value={snapshotJson} onChange={(e) => setSnapshotJson(e.target.value)} className="w-full h-64 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-mono" />
          </div>

          <div className="glass rounded-xl p-4 border border-white/10">
            <div className="text-sm font-semibold mb-2">Last Pull Result</div>
            <pre className="text-xs whitespace-pre-wrap bg-black/20 border border-white/10 rounded-lg p-3">{lastPull || "No pull yet."}</pre>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
