import { useDeferredValue, useEffect, useState } from "react";
import { AudioLines, Bot, Compass, FileText, Globe, Loader2, Network, Search, Sparkles } from "lucide-react";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";
import AudioPlayer from "@/components/AudioPlayer";
import { toast } from "sonner";

type DiscoverSource = { title: string; url: string; description: string; score?: number };
type WorkspaceSource = { id: number; title: string; url: string; author?: string | null; summary?: string | null; topics?: string[] };
type SelectedNode =
  | { type: "project" }
  | { type: "topic"; topic: string }
  | { type: "source"; sourceId: number };

function excerpt(text: string | null | undefined, max = 1400) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(normalized);
  }
  return items;
}

export default function ResearchWorkbench() {
  const { cookieId, addXP } = usePersonalization();
  const [seedTopic, setSeedTopic] = useState("");
  const [discoverResults, setDiscoverResults] = useState<DiscoverSource[]>([]);
  const [selectedDiscover, setSelectedDiscover] = useState<string[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<SelectedNode>({ type: "project" });
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ answer: string; citations: Array<{ title: string; url: string; excerpt?: string }> } | null>(null);
  const [globalQuery, setGlobalQuery] = useState("");
  const deferredGlobalQuery = useDeferredValue(globalQuery.trim());

  const projectsQuery = trpc.research.listProjects.useQuery({ cookieId: cookieId ?? "" }, { enabled: !!cookieId });
  const workspaceQuery = trpc.research.getProjectWorkspace.useQuery(
    { cookieId: cookieId ?? "", projectId: activeProjectId ?? 1 },
    { enabled: !!cookieId && !!activeProjectId }
  );
  const sourceQuery = trpc.research.getSourceDetail.useQuery(
    {
      cookieId: cookieId ?? "",
      projectId: activeProjectId ?? 1,
      sourceId: selectedNode.type === "source" ? selectedNode.sourceId : 1,
    },
    { enabled: !!cookieId && !!activeProjectId && selectedNode.type === "source" }
  );
  const projectAudioQuery = trpc.research.listProjectAudioOverviews.useQuery(
    { cookieId: cookieId ?? "", projectId: activeProjectId ?? 1 },
    { enabled: !!cookieId && !!activeProjectId }
  );
  const globalSearchQuery = trpc.research.globalSearch.useQuery(
    { cookieId: cookieId ?? "", query: deferredGlobalQuery, topK: 8 },
    { enabled: !!cookieId && deferredGlobalQuery.length >= 2 }
  );

  const discoverMutation = trpc.research.discover.useMutation({
    onSuccess: (data) => {
      setDiscoverResults((data.sources ?? []) as DiscoverSource[]);
      setSelectedDiscover([]);
    },
    onError: (err) => toast.error(err.message),
  });
  const ingestMutation = trpc.research.ingest.useMutation({
    onSuccess: async (data) => {
      await projectsQuery.refetch();
      setActiveProjectId(data.projectId);
      setSelectedNode({ type: "project" });
      setDiscoverResults([]);
      setSelectedDiscover([]);
      addXP(25);
      toast.success(`Notebook created with ${data.sourceCount} sources.`);
    },
    onError: (err) => toast.error(err.message),
  });
  const chatMutation = trpc.research.ragChat.useMutation({
    onSuccess: (data) => setAnswer(data),
    onError: (err) => toast.error(err.message),
  });
  const audioMutation = trpc.research.generateProjectAudioOverview.useMutation({
    onSuccess: async () => {
      await projectAudioQuery.refetch();
      toast.success("Audio overview generated.");
    },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    if (!activeProjectId && projectsQuery.data?.projects?.length) {
      setActiveProjectId(projectsQuery.data.projects[0].id);
    }
  }, [activeProjectId, projectsQuery.data]);

  useEffect(() => {
    setSelectedNode({ type: "project" });
    setAnswer(null);
  }, [activeProjectId]);

  const workspace = workspaceQuery.data;
  const sources = (workspace?.sources ?? []) as WorkspaceSource[];
  const latestAudio = projectAudioQuery.data?.items?.[0];
  const topicGroups = Object.entries(
    sources.reduce<Record<string, WorkspaceSource[]>>((acc, source) => {
      for (const topic of source.topics ?? []) {
        if (!acc[topic]) acc[topic] = [];
        acc[topic].push(source);
      }
      return acc;
    }, {})
  ).sort((a, b) => b[1].length - a[1].length);
  const sourceTitles = new Set(sources.map((source) => source.title.trim().toLowerCase()));
  const projectRootKey = workspace?.project?.name?.trim().toLowerCase() ?? "";
  const graphTopicLabels = uniqueStrings(
    ((workspace?.graph as { nodes?: Array<{ label?: string | null }> } | undefined)?.nodes ?? []).map((node) => node.label)
  ).filter((label) => {
    const lowered = label.toLowerCase();
    return lowered !== projectRootKey && !sourceTitles.has(lowered);
  });

  const selectedTopicSources = selectedNode.type === "topic"
    ? sources.filter((source) => (source.topics ?? []).includes(selectedNode.topic))
    : [];
  const selectedNodeTopics = selectedNode.type === "topic"
    ? uniqueStrings([selectedNode.topic, ...selectedTopicSources.flatMap((source) => source.topics ?? [])])
    : selectedNode.type === "source"
      ? uniqueStrings(sourceQuery.data?.summary?.topics ?? [])
      : graphTopicLabels;
  const branchSuggestions = selectedNode.type === "project"
    ? graphTopicLabels
    : selectedNode.type === "topic"
      ? uniqueStrings([
        ...selectedTopicSources.flatMap((source) => source.topics ?? []),
        ...graphTopicLabels,
      ]).filter((topic) => topic !== selectedNode.topic)
      : uniqueStrings([
        ...(sourceQuery.data?.summary?.topics ?? []),
        ...graphTopicLabels,
      ]);

  function toggleDiscover(url: string) {
    setSelectedDiscover((current) => current.includes(url) ? current.filter((item) => item !== url) : [...current, url]);
  }

  function runDiscover() {
    if (!cookieId || !seedTopic.trim()) return;
    discoverMutation.mutate({ cookieId, topic: seedTopic.trim(), maxResults: 10 });
  }

  function createNotebook() {
    if (!cookieId || !seedTopic.trim() || selectedDiscover.length === 0) return;
    ingestMutation.mutate({
      cookieId,
      projectName: seedTopic.trim(),
      sources: discoverResults
        .filter((source) => selectedDiscover.includes(source.url))
        .map((source) => ({ url: source.url, title: source.title, description: source.description, score: source.score ?? 0.5 })),
    });
  }

  function askNotebook() {
    if (!cookieId || !activeProjectId || !question.trim()) return;
    chatMutation.mutate({ cookieId, projectId: activeProjectId, question: question.trim() });
  }

  return (
    <PageWrapper pageName="research">
      <div className="min-h-screen pt-20 pb-12">
        <section className="mx-auto max-w-7xl space-y-6 px-4 py-10">
          <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,oklch(0.72_0.18_180_/_0.18),transparent_35%),rgba(9,11,20,0.92)] p-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[oklch(0.76_0.16_180_/_0.35)] bg-[oklch(0.76_0.16_180_/_0.12)] px-3 py-1 text-xs font-medium text-[oklch(0.84_0.14_180)]">
              <Compass size={12} />
              Research Forge
            </div>
            <h1 className="text-4xl font-semibold text-foreground md:text-5xl">Grow a living knowledge tree from a single seed.</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
              Discover sources, curate a notebook, and explore it as a tree on the left with a wiki-style knowledge pane on the right.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Sparkles size={16} /> Start From A Seed</div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input value={seedTopic} onChange={(e) => setSeedTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runDiscover()} placeholder="Topic, question, or concept..." className="w-full rounded-2xl border border-white/10 bg-[rgba(6,8,18,0.7)] py-3 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-[oklch(0.72_0.18_200_/_0.45)]" />
                </div>
                <button onClick={runDiscover} disabled={discoverMutation.isPending || !seedTopic.trim() || !cookieId} className="rounded-2xl bg-[oklch(0.72_0.18_200_/_0.18)] px-5 py-3 text-sm font-semibold text-[oklch(0.83_0.15_200)] transition hover:bg-[oklch(0.72_0.18_200_/_0.26)] disabled:opacity-50">
                  {discoverMutation.isPending ? "Searching..." : "Discover"}
                </button>
              </div>
              <div className="mt-5 space-y-3">
                {discoverResults.map((source) => (
                  <button key={source.url} onClick={() => toggleDiscover(source.url)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedDiscover.includes(source.url) ? "border-[oklch(0.72_0.18_180_/_0.4)] bg-[oklch(0.72_0.18_180_/_0.12)]" : "border-white/10 bg-black/20 hover:border-white/20"}`}>
                    <div className="text-sm font-semibold text-foreground">{source.title}</div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{source.url}</div>
                    <p className="mt-2 text-sm text-muted-foreground">{source.description}</p>
                  </button>
                ))}
                {discoverResults.length > 0 && (
                  <button onClick={createNotebook} disabled={selectedDiscover.length === 0 || ingestMutation.isPending} className="rounded-2xl bg-[oklch(0.72_0.18_140_/_0.18)] px-4 py-3 text-sm font-semibold text-[oklch(0.84_0.14_140)] transition hover:bg-[oklch(0.72_0.18_140_/_0.24)] disabled:opacity-50">
                    {ingestMutation.isPending ? "Creating notebook..." : `Create Notebook (${selectedDiscover.length})`}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Globe size={16} /> Search Indexed Research</div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input value={globalQuery} onChange={(e) => setGlobalQuery(e.target.value)} placeholder="Search every indexed source..." className="w-full rounded-2xl border border-white/10 bg-[rgba(6,8,18,0.7)] py-3 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-[oklch(0.72_0.18_200_/_0.45)]" />
              </div>
              <div className="mt-4 space-y-3">
                {(globalSearchQuery.data?.results ?? []).map((result) => (
                  <div key={`${result.source_id}-${result.url}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-sm font-semibold text-foreground">{result.title}</div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{result.url}</div>
                    {result.excerpt && <p className="mt-2 text-sm text-muted-foreground">{result.excerpt}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[rgba(5,7,16,0.86)] p-4">
            <div className="mb-4 flex flex-wrap gap-2">
              {(projectsQuery.data?.projects ?? []).map((project) => (
                <button key={project.id} onClick={() => setActiveProjectId(project.id)} className={`rounded-full px-4 py-2 text-sm transition ${activeProjectId === project.id ? "bg-[oklch(0.72_0.18_200_/_0.2)] text-[oklch(0.84_0.14_200)]" : "bg-white/5 text-muted-foreground hover:text-foreground"}`}>{project.name}</button>
              ))}
            </div>

            {activeProjectId && workspace ? (
              <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
                <aside className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Network size={16} /> Knowledge Tree</div>
                  <button onClick={() => setSelectedNode({ type: "project" })} className={`mt-4 w-full rounded-2xl border px-4 py-3 text-left transition ${selectedNode.type === "project" ? "border-[oklch(0.76_0.17_180_/_0.4)] bg-[oklch(0.76_0.17_180_/_0.12)]" : "border-white/10 bg-black/20 hover:border-white/20"}`}>
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Seed</div>
                    <div className="mt-1 text-sm font-semibold text-foreground">{workspace.project.name}</div>
                  </button>
                  {graphTopicLabels.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Suggested Branches</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {graphTopicLabels.slice(0, 10).map((topic) => (
                          <button key={topic} onClick={() => setSelectedNode({ type: "topic", topic })} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-[oklch(0.72_0.18_200_/_0.35)] hover:text-foreground">
                            {topic}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-4 space-y-3">
                    {topicGroups.map(([topic, groupSources]) => (
                      <div key={topic} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <button onClick={() => setSelectedNode({ type: "topic", topic })} className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${selectedNode.type === "topic" && selectedNode.topic === topic ? "bg-[oklch(0.72_0.18_200_/_0.16)] text-[oklch(0.84_0.14_200)]" : "text-foreground hover:bg-white/5"}`}>{topic}</button>
                        <div className="mt-2 space-y-1 pl-2">
                          {groupSources.slice(0, 5).map((source) => (
                            <button key={source.id} onClick={() => setSelectedNode({ type: "source", sourceId: source.id })} className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition ${selectedNode.type === "source" && selectedNode.sourceId === source.id ? "bg-[oklch(0.72_0.18_140_/_0.16)] text-[oklch(0.82_0.14_140)]" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}>{source.title}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </aside>

                <section className="rounded-[24px] border border-white/10 bg-[rgba(9,11,20,0.9)] p-6">
                  {selectedNode.type === "project" && (
                    <div className="space-y-5">
                      <h2 className="text-3xl font-semibold text-foreground">{workspace.project.name}</h2>
                      <div className="rounded-3xl border border-white/10 bg-white/5 p-5"><div className="prose prose-invert max-w-none text-sm"><Streamdown>{workspace.summary || "The project summary will appear here once sources are indexed."}</Streamdown></div></div>
                      {branchSuggestions.length > 0 && (
                        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                          <div className="text-sm font-semibold text-foreground">Explore branches</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {branchSuggestions.slice(0, 12).map((topic) => (
                              <button key={topic} onClick={() => setSelectedNode({ type: "topic", topic })} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-muted-foreground transition hover:border-[oklch(0.72_0.18_200_/_0.35)] hover:text-foreground">
                                {topic}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {latestAudio && <AudioPlayer audioUrl={latestAudio.audio_url} durationSeconds={latestAudio.duration_seconds} title={latestAudio.title} />}
                      <button onClick={() => audioMutation.mutate({ cookieId: cookieId ?? "", projectId: activeProjectId })} disabled={audioMutation.isPending || !cookieId} className="inline-flex items-center gap-2 rounded-2xl bg-[oklch(0.72_0.18_140_/_0.18)] px-4 py-2.5 text-sm font-semibold text-[oklch(0.84_0.14_140)] transition hover:bg-[oklch(0.72_0.18_140_/_0.24)] disabled:opacity-50">
                        {audioMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <AudioLines size={14} />}
                        {latestAudio ? "Refresh Audio Overview" : "Generate Audio Overview"}
                      </button>
                    </div>
                  )}

                  {selectedNode.type === "topic" && (
                    <div className="space-y-5">
                      <h2 className="text-3xl font-semibold text-foreground">{selectedNode.topic}</h2>
                      <p className="text-sm leading-7 text-muted-foreground">This topic currently appears across {selectedTopicSources.length} source{selectedTopicSources.length === 1 ? "" : "s"} in the notebook.</p>
                      {branchSuggestions.length > 0 && (
                        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                          <div className="text-sm font-semibold text-foreground">Connected branches</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {branchSuggestions.slice(0, 12).map((topic) => (
                              <button key={topic} onClick={() => setSelectedNode({ type: "topic", topic })} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-muted-foreground transition hover:border-[oklch(0.72_0.18_200_/_0.35)] hover:text-foreground">
                                {topic}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedTopicSources.map((source) => (
                        <div key={source.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <button onClick={() => setSelectedNode({ type: "source", sourceId: source.id })} className="text-left text-sm font-semibold text-foreground transition hover:text-[oklch(0.83_0.15_200)]">{source.title}</button>
                          <p className="mt-2 text-sm text-muted-foreground">{source.summary || "Summary unavailable yet."}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedNode.type === "source" && (
                    <div className="space-y-5">
                      <h2 className="text-3xl font-semibold text-foreground">{sourceQuery.data?.title ?? "Loading source..."}</h2>
                      <a href={sourceQuery.data?.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-[oklch(0.83_0.15_200)] hover:underline"><Globe size={14} />Open original source</a>
                      <div className="flex flex-wrap gap-2">
                        {selectedNodeTopics.map((topic) => (
                          <button key={topic} onClick={() => setSelectedNode({ type: "topic", topic })} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground">{topic}</button>
                        ))}
                      </div>
                      <div className="rounded-3xl border border-white/10 bg-white/5 p-5"><div className="prose prose-invert max-w-none text-sm"><Streamdown>{sourceQuery.data?.summary?.detailed || sourceQuery.data?.summary?.short || sourceQuery.data?.description || "No summary is available for this source yet."}</Streamdown></div></div>
                      {branchSuggestions.length > 0 && (
                        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                          <div className="text-sm font-semibold text-foreground">Grow the tree from this source</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {branchSuggestions.slice(0, 12).map((topic) => (
                              <button key={topic} onClick={() => setSelectedNode({ type: "topic", topic })} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-muted-foreground transition hover:border-[oklch(0.72_0.18_140_/_0.35)] hover:text-foreground">
                                {topic}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {(sourceQuery.data?.summary?.key_points ?? []).length > 0 && (
                        <div className="space-y-2">
                          {(sourceQuery.data?.summary?.key_points ?? []).map((point) => (
                            <div key={point} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-muted-foreground">{point}</div>
                          ))}
                        </div>
                      )}
                      {sourceQuery.data?.full_text && <p className="whitespace-pre-wrap rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-muted-foreground">{excerpt(sourceQuery.data.full_text)}</p>}
                    </div>
                  )}

                  <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Bot size={16} /> Ask This Notebook</div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && askNotebook()} placeholder="Ask grounded questions against this notebook..." className="flex-1 rounded-2xl border border-white/10 bg-[rgba(6,8,18,0.7)] px-4 py-3 text-sm text-foreground outline-none transition focus:border-[oklch(0.72_0.18_200_/_0.45)]" />
                      <button onClick={askNotebook} disabled={chatMutation.isPending || !question.trim() || !cookieId || !activeProjectId} className="rounded-2xl bg-[oklch(0.72_0.18_60_/_0.18)] px-5 py-3 text-sm font-semibold text-[oklch(0.88_0.11_60)] transition hover:bg-[oklch(0.72_0.18_60_/_0.24)] disabled:opacity-50">{chatMutation.isPending ? "Thinking..." : "Ask"}</button>
                    </div>
                    {answer && (
                      <div className="mt-4 space-y-3">
                        <div className="rounded-3xl border border-white/10 bg-black/20 p-4"><div className="prose prose-invert max-w-none text-sm"><Streamdown>{answer.answer}</Streamdown></div></div>
                        {(answer.citations ?? []).map((citation) => (
                          <div key={`${citation.title}-${citation.url}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="text-sm font-semibold text-foreground">{citation.title}</div>
                            <div className="mt-1 truncate text-xs text-muted-foreground">{citation.url}</div>
                            {citation.excerpt && <p className="mt-2 text-sm text-muted-foreground">{citation.excerpt}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 p-10 text-center">
                {projectsQuery.isLoading || workspaceQuery.isLoading ? <Loader2 className="mx-auto animate-spin text-muted-foreground" /> : <FileText className="mx-auto text-muted-foreground" />}
                <h3 className="mt-4 text-lg font-semibold text-foreground">No notebook selected yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">{workspaceQuery.error?.message ?? "Discover a seed topic above and create a notebook to open the two-pane workspace."}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
