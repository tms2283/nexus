import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { CheckCircle, Edit2, Archive, Plus } from "lucide-react";
import { toast } from "sonner";

const BLOOM_COLORS: Record<string, string> = {
  remember: "text-blue-400 bg-blue-400/10",
  understand: "text-cyan-400 bg-cyan-400/10",
  apply: "text-green-400 bg-green-400/10",
  analyze: "text-yellow-400 bg-yellow-400/10",
  evaluate: "text-orange-400 bg-orange-400/10",
  create: "text-purple-400 bg-purple-400/10",
};

type ReviewStatus = "draft" | "published" | "deprecated";

export default function AdminConcepts() {
  const [domain, setDomain] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "">("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newConceptOpen, setNewConceptOpen] = useState(false);

  const { data, refetch, isLoading } = trpc.curriculum.adminListConcepts.useQuery({
    domain: domain || undefined,
    reviewStatus: statusFilter as ReviewStatus || undefined,
    limit: 100,
    offset: 0,
  });

  const publishMutation = trpc.curriculum.adminPublishConcept.useMutation({
    onSuccess: () => { toast.success("Status updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const upsertMutation = trpc.curriculum.adminUpsertConcept.useMutation({
    onSuccess: () => { toast.success("Concept saved"); refetch(); setNewConceptOpen(false); setEditingId(null); },
    onError: (e) => toast.error(e.message),
  });

  const domains = Array.from(new Set(data?.concepts.map(c => c.domain) ?? [])).sort();

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Concept Browser</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {data?.concepts.length ?? 0} concepts · Publish drafts to make them available for adaptive paths
            </p>
          </div>
          <button
            onClick={() => setNewConceptOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[oklch(0.65_0.22_200_/_0.15)] border border-[oklch(0.65_0.22_200_/_0.4)] text-sm text-[oklch(0.85_0.18_200)] hover:bg-[oklch(0.65_0.22_200_/_0.25)] transition-colors"
          >
            <Plus size={14} /> Add Concept
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={domain}
            onChange={e => setDomain(e.target.value)}
            className="glass px-3 py-1.5 rounded-lg text-sm border border-white/10 bg-transparent text-foreground"
          >
            <option value="">All domains</option>
            {domains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as ReviewStatus | "")}
            className="glass px-3 py-1.5 rounded-lg text-sm border border-white/10 bg-transparent text-foreground"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="deprecated">Deprecated</option>
          </select>
        </div>

        {/* New concept form */}
        {newConceptOpen && (
          <ConceptForm
            onSave={(vals) => upsertMutation.mutate(vals)}
            onCancel={() => setNewConceptOpen(false)}
            isSaving={upsertMutation.isPending}
          />
        )}

        {/* Concept list */}
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-2">
            {data?.concepts.map((concept, i) => (
              <motion.div
                key={concept.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="glass rounded-2xl p-4 border border-white/10"
              >
                {editingId === concept.id ? (
                  <ConceptForm
                    initial={concept}
                    onSave={(vals) => upsertMutation.mutate(vals)}
                    onCancel={() => setEditingId(null)}
                    isSaving={upsertMutation.isPending}
                  />
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium text-foreground">{concept.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${BLOOM_COLORS[concept.bloomLevel] ?? ""}`}>
                          {concept.bloomLevel}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground">
                          {concept.domain}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          concept.reviewStatus === "published" ? "bg-green-400/10 text-green-400" :
                          concept.reviewStatus === "deprecated" ? "bg-red-400/10 text-red-400" :
                          "bg-yellow-400/10 text-yellow-400"
                        }`}>
                          {concept.reviewStatus}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{concept.summary}</p>
                      <p className="text-xs text-muted-foreground/50 mt-1">
                        {concept.id} · ~{concept.estimatedMinutes} min · {concept.source}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setEditingId(concept.id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground"
                        title="Edit"
                      >
                        <Edit2 size={13} />
                      </button>
                      {concept.reviewStatus !== "published" && (
                        <button
                          onClick={() => publishMutation.mutate({ conceptId: concept.id, reviewStatus: "published" })}
                          className="p-1.5 rounded-lg hover:bg-green-400/10 transition-colors text-muted-foreground hover:text-green-400"
                          title="Publish"
                        >
                          <CheckCircle size={13} />
                        </button>
                      )}
                      {concept.reviewStatus !== "deprecated" && (
                        <button
                          onClick={() => publishMutation.mutate({ conceptId: concept.id, reviewStatus: "deprecated" })}
                          className="p-1.5 rounded-lg hover:bg-red-400/10 transition-colors text-muted-foreground hover:text-red-400"
                          title="Deprecate"
                        >
                          <Archive size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ConceptFormProps {
  initial?: { id: string; title: string; summary: string; domain: string; bloomLevel: string; estimatedMinutes: number; reviewStatus: string };
  onSave: (vals: { id: string; title: string; summary: string; domain: string; bloomLevel: "remember"|"understand"|"apply"|"analyze"|"evaluate"|"create"; estimatedMinutes: number; reviewStatus: "draft"|"published"|"deprecated" }) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function ConceptForm({ initial, onSave, onCancel, isSaving }: ConceptFormProps) {
  const [id, setId] = useState(initial?.id ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [domain, setDomain] = useState(initial?.domain ?? "other");
  const [bloomLevel, setBloomLevel] = useState(initial?.bloomLevel ?? "understand");
  const [estimatedMinutes, setEstimatedMinutes] = useState(initial?.estimatedMinutes ?? 15);
  const [reviewStatus, setReviewStatus] = useState(initial?.reviewStatus ?? "draft");

  const handleSave = () => {
    if (!id.trim() || !title.trim()) { toast.error("ID and title are required"); return; }
    onSave({
      id: id.trim(),
      title: title.trim(),
      summary: summary.trim(),
      domain: domain.trim() || "other",
      bloomLevel: bloomLevel as "remember"|"understand"|"apply"|"analyze"|"evaluate"|"create",
      estimatedMinutes,
      reviewStatus: reviewStatus as "draft"|"published"|"deprecated",
    });
  };

  return (
    <div className="glass rounded-2xl p-5 border border-[oklch(0.65_0.22_200_/_0.3)] space-y-3 mb-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Concept ID (kebab-case)</label>
          <input value={id} onChange={e => setId(e.target.value)} disabled={!!initial}
            className="w-full bg-white/3 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-white/25 disabled:opacity-50" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full bg-white/3 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-white/25" />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Summary</label>
        <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={2}
          className="w-full bg-white/3 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-white/25" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Domain</label>
          <input value={domain} onChange={e => setDomain(e.target.value)}
            className="w-full bg-white/3 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-white/25" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Bloom Level</label>
          <select value={bloomLevel} onChange={e => setBloomLevel(e.target.value)}
            className="w-full bg-white/3 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none">
            {["remember","understand","apply","analyze","evaluate","create"].map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Est. Minutes</label>
          <input type="number" min={5} max={120} value={estimatedMinutes} onChange={e => setEstimatedMinutes(parseInt(e.target.value))}
            className="w-full bg-white/3 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-white/25" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Status</label>
          <select value={reviewStatus} onChange={e => setReviewStatus(e.target.value)}
            className="w-full bg-white/3 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none">
            {["draft","published","deprecated"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={isSaving}
          className="px-4 py-2 rounded-xl bg-[oklch(0.65_0.22_200_/_0.18)] border border-[oklch(0.65_0.22_200_/_0.4)] text-sm text-[oklch(0.85_0.18_200)] hover:bg-[oklch(0.65_0.22_200_/_0.28)] transition-colors disabled:opacity-50">
          {isSaving ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-muted-foreground hover:bg-white/10 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
