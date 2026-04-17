import { Link } from "wouter";
import PageWrapper from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";

export default function AdminAudit() {
  const audit = trpc.admin.audit.list.useQuery({ limit: 200 });

  return (
    <PageWrapper pageName="admin-audit">
      <div className="min-h-screen pt-20 px-4 pb-8">
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Audit Trail</h1>
              <p className="text-sm text-muted-foreground">Privileged action history with actor attribution.</p>
            </div>
            <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">Back to dashboard</Link>
          </div>

          <div className="glass rounded-xl p-4 border border-white/10">
            <div className="space-y-2 max-h-[70vh] overflow-auto">
              {audit.data?.map((row) => (
                <div key={row.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
                  <div className="text-foreground">{row.action}</div>
                  <div className="text-muted-foreground">
                    {row.resourceType}#{row.resourceId ?? "n/a"} · actor {row.actorUserId ?? "system"} · {new Date(row.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
              {audit.data?.length === 0 && <div className="text-sm text-muted-foreground">No audit records yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
