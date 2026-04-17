import { Link } from "wouter";
import PageWrapper from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass rounded-xl p-4 border border-white/10">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}

export default function AdminHome() {
  const summary = trpc.admin.dashboard.summary.useQuery();
  const health = trpc.admin.system.health.useQuery();

  return (
    <PageWrapper pageName="admin">
      <div className="min-h-screen pt-20 px-4 pb-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Web Admin Lite</h1>
              <p className="text-sm text-muted-foreground">Control plane for pages, AI health, users, and audits.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/pages" className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm">Pages</Link>
              <Link href="/admin/ai" className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm">AI</Link>
              <Link href="/admin/audit" className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm">Audit</Link>
              <Link href="/admin/users" className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm">Users</Link>
              <Link href="/studio" className="px-3 py-2 rounded-lg bg-[oklch(0.75_0.18_55)] text-black text-sm font-semibold">Studio</Link>
            </div>
          </div>

          {summary.isError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {summary.error.message}
            </div>
          )}

          {summary.data && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Pages" value={summary.data.pages.total} />
              <StatCard label="Draft/Staged" value={summary.data.pages.drafts} />
              <StatCard label="AI Requests (24h)" value={summary.data.ai.requests24h} />
              <StatCard label="Audit Events (24h)" value={summary.data.auditEvents24h} />
            </div>
          )}

          <div className="glass rounded-xl p-5 border border-white/10">
            <div className="text-sm font-semibold text-foreground mb-2">System Health</div>
            <div className="text-sm text-muted-foreground">
              API: <span className="text-foreground">{health.data?.api ?? "loading"}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Database: <span className="text-foreground">{health.data?.database ?? "loading"}</span>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
