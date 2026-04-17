import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Edit3, ExternalLink, FilePlus2, PenSquare, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useEditMode } from "@/contexts/EditModeContext";
import { trpc } from "@/lib/trpc";

function routeToSlug(pathname: string) {
  const trimmed = pathname.replace(/^\/+|\/+$/g, "");
  if (!trimmed) return "home";
  return trimmed.replace(/\//g, "-");
}

function slugToTitle(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export default function EditModeOverlay() {
  const { user } = useAuth();
  const { isEditMode, toggleEditMode } = useEditMode();
  const [location, setLocation] = useLocation();

  const canEdit = user?.role === "admin";
  const pagesQuery = trpc.admin.pages.list.useQuery(undefined, {
    enabled: canEdit,
    refetchOnWindowFocus: false,
  });

  const currentSlug = useMemo(() => routeToSlug(location), [location]);
  const currentTitle = useMemo(() => slugToTitle(currentSlug), [currentSlug]);
  const currentPage = useMemo(
    () => pagesQuery.data?.find((page) => page.slug === currentSlug) ?? null,
    [pagesQuery.data, currentSlug],
  );

  const createPageMutation = trpc.admin.pages.saveDraft.useMutation({
    onSuccess: ({ pageId }) => {
      toast.success(`Created draft page for ${currentTitle}`);
      void pagesQuery.refetch();
      setLocation(`/admin/pages/${pageId}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (!canEdit) return null;

  return (
    <>
      <button
        type="button"
        onClick={toggleEditMode}
        className={`fixed bottom-24 right-6 z-50 flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-2xl transition-all ${
          isEditMode
            ? "border-[oklch(0.75_0.18_55_/_0.6)] bg-[oklch(0.75_0.18_55)] text-black"
            : "border-white/15 bg-black/70 text-white backdrop-blur-xl"
        }`}
      >
        <PenSquare size={16} />
        {isEditMode ? "Exit Edit Mode" : "Edit Mode"}
      </button>

      {isEditMode && (
        <div className="fixed right-6 top-24 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[oklch(0.75_0.18_55_/_0.35)] bg-[rgba(5,10,18,0.94)] p-4 text-white shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[oklch(0.78_0.18_55)]">
                <Sparkles size={12} />
                Live Edit Mode
              </div>
              <h3 className="text-lg font-semibold">{currentTitle}</h3>
              <p className="text-xs text-white/60">{location}</p>
            </div>
            <button
              type="button"
              onClick={toggleEditMode}
              className="rounded-lg border border-white/10 px-2 py-1 text-xs text-white/70 transition-colors hover:border-white/20 hover:text-white"
            >
              Hide
            </button>
          </div>

          <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/75">
            This mode travels with you while you browse. It is wired to the new CMS/admin layer, so changes made here are for managed pages and publishing flows, not arbitrary React code internals.
          </div>

          <div className="mb-4 rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="mb-1 text-xs uppercase tracking-[0.2em] text-white/45">CMS Record</div>
            {currentPage ? (
              <>
                <div className="text-sm font-medium text-white">{currentPage.title}</div>
                <div className="mt-1 text-xs text-white/60">
                  Status: <span className="text-white">{currentPage.status}</span> · Page ID:{" "}
                  <span className="text-white">{currentPage.id}</span>
                </div>
              </>
            ) : (
                <div className="text-sm text-white/70">
                  No CMS page record exists for this route yet.
                </div>
              )}
          </div>

          <div className="grid grid-cols-1 gap-2">
            {currentPage ? (
              <Link
                href={`/admin/pages/${currentPage.id}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm transition-colors hover:border-white/20 hover:bg-white/10"
              >
                <span className="flex items-center gap-2">
                  <Edit3 size={15} />
                  Open current page editor
                </span>
                <ExternalLink size={14} />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() =>
                  createPageMutation.mutate({
                    slug: currentSlug,
                    title: currentTitle,
                    sections: [],
                  })
                }
                disabled={createPageMutation.isPending}
                className="flex items-center justify-between rounded-xl border border-[oklch(0.75_0.18_55_/_0.35)] bg-[oklch(0.75_0.18_55_/_0.14)] px-3 py-3 text-left text-sm transition-colors hover:bg-[oklch(0.75_0.18_55_/_0.2)] disabled:opacity-60"
              >
                <span className="flex items-center gap-2">
                  <FilePlus2 size={15} />
                  Create CMS page for this route
                </span>
                <ExternalLink size={14} />
              </button>
            )}

            <Link
              href="/admin/pages"
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm transition-colors hover:border-white/20 hover:bg-white/10"
            >
              <span className="flex items-center gap-2">
                <PenSquare size={15} />
                Browse all managed pages
              </span>
              <ExternalLink size={14} />
            </Link>

            <Link
              href="/studio"
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm transition-colors hover:border-white/20 hover:bg-white/10"
            >
              <span className="flex items-center gap-2">
                <Sparkles size={15} />
                Open Studio workspace
              </span>
              <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
