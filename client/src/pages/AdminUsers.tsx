import { useState } from "react";
import { Link } from "wouter";
import PageWrapper from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type AssignableRole = "owner" | "admin" | "editor" | "analyst" | "support";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const users = trpc.admin.users.list.useQuery({ search: search.trim() || undefined });
  const utils = trpc.useUtils();
  const setRole = trpc.admin.users.setRole.useMutation({
    onSuccess: async () => {
      toast.success("Role assignment updated");
      await utils.admin.users.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <PageWrapper pageName="admin-users">
      <div className="min-h-screen pt-20 px-4 pb-8">
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Users</h1>
              <p className="text-sm text-muted-foreground">Lookup users and manage elevated role assignments.</p>
            </div>
            <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">Back to dashboard</Link>
          </div>

          <div className="glass rounded-xl p-4 border border-white/10">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email or name"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm mb-3"
            />
            <div className="space-y-2">
              {users.data?.map((u) => (
                <div key={u.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-foreground">{u.name || "(no name)"}</div>
                    <div className="text-xs text-muted-foreground">{u.email || "no email"} · base role {u.role}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(["owner", "admin", "editor", "analyst", "support"] as AssignableRole[]).map((role) => (
                      <button
                        key={role}
                        onClick={() => setRole.mutate({ userId: u.id, role })}
                        className="px-2 py-1 rounded bg-white/10 border border-white/20 text-xs"
                      >
                        {role}
                      </button>
                    ))}
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
