import { useState } from "react";
import { Link } from "wouter";
import PageWrapper from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type AssignableRole = "owner" | "admin" | "editor" | "analyst" | "support";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const users = trpc.admin.users.list.useQuery({
    search: search.trim() || undefined,
  });
  const utils = trpc.useUtils();
  const setRole = trpc.admin.users.setRole.useMutation({
    onSuccess: async () => {
      toast.success("Role assignment updated");
      await utils.admin.users.list.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  return (
    <PageWrapper pageName="admin-users">
      <div className="min-h-screen pt-20 px-4 pb-8">
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Users</h1>
              <p className="text-sm text-muted-foreground">
                Admin view for all signed-up users, regular profiles, and psych
                profiles.
              </p>
            </div>
            <Link
              href="/admin"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Back to dashboard
            </Link>
          </div>

          <div className="glass rounded-xl p-4 border border-white/10">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by email or name (admin only)"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm mb-3"
            />

            <div className="space-y-3">
              {users.data?.map(entry => (
                <div
                  key={entry.user.id}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-foreground">
                        {entry.user.name || "(no name)"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entry.user.email || "no email"} | base role{" "}
                        {entry.user.role}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        login: {entry.user.loginMethod || "unknown"} |
                        onboarding:{" "}
                        {entry.user.onboardingCompleted
                          ? "complete"
                          : "incomplete"}{" "}
                        | verified: {entry.user.emailVerified ? "yes" : "no"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        created:{" "}
                        {new Date(entry.user.createdAt).toLocaleString()} | last
                        sign-in:{" "}
                        {new Date(entry.user.lastSignedIn).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {(
                        [
                          "owner",
                          "admin",
                          "editor",
                          "analyst",
                          "support",
                        ] as AssignableRole[]
                      ).map(role => (
                        <button
                          key={role}
                          onClick={() =>
                            setRole.mutate({ userId: entry.user.id, role })
                          }
                          className="px-2 py-1 rounded bg-white/10 border border-white/20 text-xs"
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-md border border-white/10 bg-black/10 p-3">
                    <div className="text-xs font-semibold text-foreground mb-2">
                      Psych Profile (Admin-only, backend protected)
                    </div>
                    {entry.psychProfile ? (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div>
                          <span className="text-foreground">Background:</span>{" "}
                          {entry.psychProfile.inferredBackground || "n/a"}
                        </div>
                        <div>
                          <span className="text-foreground">Goal:</span>{" "}
                          {entry.psychProfile.inferredGoal || "n/a"}
                        </div>
                        <div>
                          <span className="text-foreground">Learning style:</span>{" "}
                          {entry.psychProfile.inferredLearnStyle || "n/a"}
                        </div>
                        <div>
                          <span className="text-foreground">Interests:</span>{" "}
                          {(entry.psychProfile.inferredInterests ?? []).join(
                            ", "
                          ) || "none"}
                        </div>
                        <div>
                          <span className="text-foreground">Quiz answers:</span>{" "}
                          {
                            Object.keys(entry.psychProfile.quizAnswers ?? {})
                              .length
                          }
                        </div>
                        <div>
                          <span className="text-foreground">Updated:</span>{" "}
                          {new Date(
                            entry.psychProfile.updatedAt
                          ).toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        No psych profile captured yet.
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {users.data && users.data.length === 0 && (
                <div className="text-sm text-muted-foreground px-1 py-2">
                  No users found.
                </div>
              )}

              {users.error && (
                <div className="text-sm text-red-400 px-1 py-2">
                  {users.error.message}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
