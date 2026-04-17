import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import PageWrapper from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type EditableSection = {
  id?: number;
  type: string;
  position: number;
  contentJson: Record<string, unknown>;
  settingsJson?: Record<string, unknown>;
  isVisible: boolean;
};

export default function AdminPageEditor() {
  const params = useParams<{ pageId: string }>();
  const pageId = Number(params.pageId);
  const utils = trpc.useUtils();
  const pageQuery = trpc.admin.pages.getById.useQuery({ pageId }, { enabled: Number.isFinite(pageId) });

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [rawSectionsJson, setRawSectionsJson] = useState("[]");

  const selectedRollbackRevisionId = useMemo(() => pageQuery.data?.page.publishedRevisionId ?? undefined, [pageQuery.data]);

  const saveDraft = trpc.admin.pages.saveDraft.useMutation({
    onSuccess: async () => {
      toast.success("Draft saved");
      await utils.admin.pages.getById.invalidate({ pageId });
      await utils.admin.pages.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const publish = trpc.admin.pages.publish.useMutation({
    onSuccess: async () => {
      toast.success("Page published");
      await utils.admin.pages.getById.invalidate({ pageId });
      await utils.admin.pages.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const rollback = trpc.admin.pages.rollback.useMutation({
    onSuccess: async () => {
      toast.success("Rollback complete");
      await utils.admin.pages.getById.invalidate({ pageId });
      await utils.admin.pages.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const createVariant = trpc.admin.variants.createFromPage.useMutation({
    onSuccess: async () => {
      toast.success("Variant created");
      await utils.admin.pages.getById.invalidate({ pageId });
    },
    onError: (err) => toast.error(err.message),
  });

  if (pageQuery.isLoading) {
    return <PageWrapper pageName="admin-page-editor"><div className="min-h-screen pt-24 px-4 text-muted-foreground">Loading page...</div></PageWrapper>;
  }

  if (pageQuery.isError || !pageQuery.data) {
    return <PageWrapper pageName="admin-page-editor"><div className="min-h-screen pt-24 px-4 text-red-300">{pageQuery.error?.message ?? "Failed to load page"}</div></PageWrapper>;
  }

  const { page, sections, variants, revisions } = pageQuery.data;
  useEffect(() => {
    setTitle(page.title);
    setSlug(page.slug);
    const normalized = sections.map((s) => ({
      id: s.id,
      type: s.type,
      position: s.position,
      contentJson: s.contentJson ?? {},
      settingsJson: s.settingsJson ?? {},
      isVisible: s.isVisible,
    }));
    setRawSectionsJson(JSON.stringify(normalized, null, 2));
  }, [page.id, page.slug, page.title, sections]);

  const onSaveDraft = () => {
    let parsed: EditableSection[] = [];
    try {
      parsed = JSON.parse(rawSectionsJson) as EditableSection[];
      if (!Array.isArray(parsed)) throw new Error("Sections must be an array");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sections JSON is invalid");
      return;
    }
    saveDraft.mutate({
      pageId,
      title: title.trim(),
      slug: slug.trim(),
      sections: parsed.map((s, idx) => ({
        id: s.id,
        type: s.type || "text",
        position: Number.isFinite(s.position) ? s.position : idx,
        contentJson: s.contentJson ?? {},
        settingsJson: s.settingsJson ?? {},
        isVisible: s.isVisible ?? true,
      })),
    });
  };

  return (
    <PageWrapper pageName="admin-page-editor">
      <div className="min-h-screen pt-20 px-4 pb-8">
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{page.title}</h1>
              <p className="text-sm text-muted-foreground">Status: {page.status}</p>
            </div>
            <Link href="/admin/pages" className="text-sm text-muted-foreground hover:text-foreground">Back to Pages</Link>
          </div>

          <div className="glass rounded-xl p-4 border border-white/10 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm" />
              <input value={slug} onChange={(e) => setSlug(e.target.value)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm" />
            </div>
            <textarea
              value={rawSectionsJson}
              onChange={(e) => setRawSectionsJson(e.target.value)}
              className="w-full h-[360px] px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-mono"
            />
            <div className="flex flex-wrap gap-2">
              <button onClick={onSaveDraft} disabled={saveDraft.isPending} className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm">Save Draft</button>
              <button onClick={() => publish.mutate({ pageId })} disabled={publish.isPending} className="px-3 py-2 rounded-lg bg-[oklch(0.75_0.18_55)] text-black text-sm font-semibold">Publish</button>
              <button
                onClick={() => createVariant.mutate({ pageId, name: `Variant ${new Date().toLocaleTimeString()}` })}
                disabled={createVariant.isPending}
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm"
              >
                Create Variant
              </button>
              {selectedRollbackRevisionId && (
                <button
                  onClick={() => rollback.mutate({ pageId, revisionId: selectedRollbackRevisionId })}
                  disabled={rollback.isPending}
                  className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm"
                >
                  Rollback to Published
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass rounded-xl p-4 border border-white/10">
              <div className="text-sm font-semibold text-foreground mb-2">Variants</div>
              <div className="space-y-2">
                {variants.length === 0 && <div className="text-sm text-muted-foreground">No variants yet.</div>}
                {variants.map((v) => (
                  <div key={v.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                    <div className="text-foreground">{v.name}</div>
                    <div className="text-xs text-muted-foreground">{v.status}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass rounded-xl p-4 border border-white/10">
              <div className="text-sm font-semibold text-foreground mb-2">Recent Revisions</div>
              <div className="space-y-2 max-h-[260px] overflow-auto">
                {revisions.map((r) => (
                  <div key={r.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
                    <div className="text-foreground">#{r.id} {r.revisionLabel || "revision"}</div>
                    <div className="text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
