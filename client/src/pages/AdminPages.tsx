import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Plus, ExternalLink } from "lucide-react";
import PageWrapper from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AdminPages() {
  const utils = trpc.useUtils();
  const pagesQuery = trpc.admin.pages.list.useQuery();
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");

  const createDraft = trpc.admin.pages.saveDraft.useMutation({
    onSuccess: async (res) => {
      toast.success("Draft page created");
      setNewSlug("");
      setNewTitle("");
      await utils.admin.pages.list.invalidate();
      window.location.href = `/admin/pages/${res.pageId}`;
    },
    onError: (err) => toast.error(err.message),
  });

  const validSlug = useMemo(() => /^[a-z0-9-]+$/.test(newSlug), [newSlug]);

  return (
    <PageWrapper pageName="admin-pages">
      <div className="min-h-screen pt-20 px-4 pb-8">
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Pages</h1>
              <p className="text-sm text-muted-foreground">Draft, stage, publish, and rollback content safely.</p>
            </div>
            <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">Back to dashboard</Link>
          </div>

          <div className="glass rounded-xl p-4 border border-white/10">
            <div className="text-sm font-semibold text-foreground mb-3">Create Draft Page</div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Page title"
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
              />
              <input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="page-slug"
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
              />
              <button
                onClick={() => createDraft.mutate({
                  slug: newSlug.trim(),
                  title: newTitle.trim(),
                  sections: [],
                })}
                disabled={!newTitle.trim() || !newSlug.trim() || !validSlug || createDraft.isPending}
                className="px-3 py-2 rounded-lg bg-[oklch(0.75_0.18_55)] text-black text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1"
              >
                <Plus size={14} /> Create
              </button>
            </div>
            {!validSlug && newSlug.length > 0 && (
              <div className="text-xs text-red-300 mt-2">Slug must use lowercase letters, numbers, and hyphens only.</div>
            )}
          </div>

          <div className="glass rounded-xl p-4 border border-white/10">
            <div className="text-sm font-semibold text-foreground mb-3">Page List</div>
            {pagesQuery.isLoading && <div className="text-sm text-muted-foreground">Loading pages...</div>}
            {pagesQuery.isError && <div className="text-sm text-red-300">{pagesQuery.error.message}</div>}
            {pagesQuery.data && pagesQuery.data.length === 0 && (
              <div className="text-sm text-muted-foreground">No pages created yet.</div>
            )}
            <div className="space-y-2">
              {pagesQuery.data?.map((p) => (
                <div key={p.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-foreground">{p.title}</div>
                    <div className="text-xs text-muted-foreground">
                      /{p.slug} · {p.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`/${p.slug}`} target="_blank" rel="noreferrer" className="px-2 py-1 rounded bg-white/10 text-xs inline-flex items-center gap-1">
                      Live <ExternalLink size={12} />
                    </a>
                    <Link href={`/admin/pages/${p.id}`} className="px-2 py-1 rounded bg-white/10 text-xs">Open</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
