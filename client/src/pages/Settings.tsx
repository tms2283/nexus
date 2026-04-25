import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Settings2, Brain, Key, CheckCircle, XCircle, Eye, EyeOff,
  Zap, Shield, RefreshCw, Info, ExternalLink, ChevronDown, ChevronUp,
  Cpu, Globe, Sparkles
} from "lucide-react";

type AIProvider = "gemini" | "perplexity";

const PROVIDERS: Array<{
  id: AIProvider;
  name: string;
  description: string;
  strengths: string[];
  docsUrl: string;
  keyUrl: string;
  keyPlaceholder: string;
  color: string;
  icon: string;
}> = [
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Google's most capable multimodal AI — excellent for reasoning, analysis, and long-context tasks. Powers Nexus by default.",
    strengths: ["Multimodal (text + images)", "1M token context window", "Strong reasoning", "Free tier available"],
    docsUrl: "https://ai.google.dev/docs",
    keyUrl: "https://aistudio.google.com/app/apikey",
    keyPlaceholder: "AIza...",
    color: "from-blue-600 to-cyan-500",
    icon: "G",
  },
  {
    id: "perplexity",
    name: "Perplexity AI",
    description: "Real-time web search integrated with AI reasoning. Ideal for research tasks requiring up-to-date information and citations.",
    strengths: ["Real-time web search", "Cited sources", "Current events", "Research-optimized"],
    docsUrl: "https://docs.perplexity.ai",
    keyUrl: "https://www.perplexity.ai/settings/api",
    keyPlaceholder: "pplx-...",
    color: "from-teal-600 to-emerald-500",
    icon: "P",
  },
];

const MODELS: Record<AIProvider, string[]> = {
  gemini: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
  perplexity: ["llama-3.1-sonar-large-128k-online", "llama-3.1-sonar-small-128k-online", "llama-3.1-sonar-huge-128k-online"],
};

export default function Settings() {
  const { cookieId } = usePersonalization();
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedProvider, setExpandedProvider] = useState<AIProvider | null>(null);

  const { data: providerSettings, refetch } = trpc.aiProvider.get.useQuery(
    { cookieId },
    { enabled: !!cookieId }
  );

  const setProviderMutation = trpc.aiProvider.set.useMutation();
  const testMutation = trpc.aiProvider.test.useMutation();
  const clearKeyMutation = trpc.aiProvider.clearKey.useMutation();

  useEffect(() => {
    if (providerSettings) {
      setSelectedProvider(providerSettings.provider as AIProvider);
      setSelectedModel(providerSettings.model ?? "");
    }
  }, [providerSettings]);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testMutation.mutateAsync({
        provider: selectedProvider,
        apiKey: apiKey || undefined,
        model: selectedModel || undefined,
      });
      const r = result as { ok?: boolean; success?: boolean; model?: string; latencyMs?: number; error?: string };
      setTestResult({
        success: r.ok ?? r.success ?? false,
        message: r.ok ? `Connected to ${r.model ?? selectedProvider} (${r.latencyMs}ms)` : (r.error ?? "Connection failed"),
      });
    } catch (err) {
      setTestResult({ success: false, message: "Connection failed. Check your API key." });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setProviderMutation.mutateAsync({
        cookieId,
        provider: selectedProvider,
        apiKey: apiKey || undefined,
        model: selectedModel || undefined,
      });
      await refetch();
      setApiKey("");
      toast.success(`AI provider set to ${PROVIDERS.find(p => p.id === selectedProvider)?.name}`);
    } catch {
      toast.error("Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearKey = async () => {
    await clearKeyMutation.mutateAsync({ cookieId });
    await refetch();
    setApiKey("");
    toast.success("API key cleared. Using platform default.");
  };

  const currentProvider = PROVIDERS.find(p => p.id === selectedProvider)!;

  return (
    <PageWrapper pageName="settings">
      <div className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              AI <span className="text-gradient">Settings</span>
            </h1>
            <p className="text-muted-foreground">Configure your AI provider and bring your own API key for full control</p>
          </div>

          {/* Current status */}
          <div className="card-nexus p-4 mb-8 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${currentProvider.color} flex items-center justify-center text-white font-bold text-lg`}>
              {currentProvider.icon}
            </div>
            <div className="flex-1">
              <p className="text-foreground font-medium text-sm">Currently using: {currentProvider.name}</p>
              <p className="text-muted-foreground text-xs">
                {providerSettings?.hasCustomKey ? "Using your custom API key" : "Using platform default key (Gemini)"}
                {providerSettings?.model ? ` · ${providerSettings.model}` : ""}
              </p>
            </div>
            {providerSettings?.hasCustomKey && (
              <button onClick={handleClearKey} className="text-muted-foreground hover:text-red-500 text-xs transition-colors">
                Clear key
              </button>
            )}
          </div>

          {/* Provider selection */}
          <div className="space-y-3 mb-8">
            <h2 className="text-muted-foreground text-sm font-medium uppercase tracking-widest mb-4">Choose Provider</h2>
            {PROVIDERS.map(provider => (
              <div key={provider.id}>
                <button
                  onClick={() => {
                    setSelectedProvider(provider.id);
                    setExpandedProvider(expandedProvider === provider.id ? null : provider.id);
                    setTestResult(null);
                  }}
                  className={`w-full glass rounded-xl p-4 border transition-all text-left ${selectedProvider === provider.id ? "border-violet-500/40 bg-violet-500/5" : "border-border/60 hover:border-border"}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${provider.color} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                      {provider.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-foreground font-medium">{provider.name}</p>
                        {selectedProvider === provider.id && providerSettings?.provider === provider.id && (
                          <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">Active</span>
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm truncate">{provider.description.slice(0, 60)}...</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className={`w-4 h-4 rounded-full border-2 transition-all ${selectedProvider === provider.id ? "border-violet-400 bg-violet-400" : "border-border"}`} />
                      {expandedProvider === provider.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {expandedProvider === provider.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-[var(--surface-1)] rounded-b-xl border border-t-0 border-border/60 p-5 space-y-4">
                        {/* Strengths */}
                        <div>
                          <p className="text-muted-foreground text-xs uppercase tracking-widest mb-2">Strengths</p>
                          <div className="flex flex-wrap gap-2">
                            {provider.strengths.map(s => (
                              <span key={s} className="text-xs bg-muted/50 text-muted-foreground px-3 py-1 rounded-full border border-border/70">{s}</span>
                            ))}
                          </div>
                        </div>

                        {/* Model selection */}
                        <div>
                          <label className="text-muted-foreground text-xs uppercase tracking-widest block mb-2">Model</label>
                          <select
                            value={selectedModel || MODELS[provider.id][0]}
                            onChange={e => setSelectedModel(e.target.value)}
                            className="w-full bg-card border border-border/80 rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-violet-500/50"
                          >
                            {MODELS[provider.id].map(m => (
                              <option key={m} value={m} className="bg-background">{m}</option>
                            ))}
                          </select>
                        </div>

                        {/* API Key input */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-muted-foreground text-xs uppercase tracking-widest">API Key</label>
                            <a href={provider.keyUrl} target="_blank" rel="noopener noreferrer" className="text-violet-400 text-xs hover:text-violet-300 flex items-center gap-1">
                              Get key <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <div className="relative">
                            <input
                              type={showKey ? "text" : "password"}
                              value={apiKey}
                              onChange={e => setApiKey(e.target.value)}
                              placeholder={providerSettings?.hasCustomKey ? "••••••••••••••••••••• (key saved)" : provider.keyPlaceholder}
                              className="w-full bg-card border border-border/80 rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground/70 pr-10 focus:outline-none focus:border-violet-500/50 text-sm font-mono"
                            />
                            <button
                              onClick={() => setShowKey(s => !s)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <p className="text-muted-foreground/80 text-xs mt-1 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Keys are stored encrypted and never exposed to the client
                          </p>
                        </div>

                        {/* Test result */}
                        <AnimatePresence>
                          {testResult && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                              className={`flex items-center gap-2 p-3 rounded-lg text-sm ${testResult.success ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "bg-red-500/10 text-red-300 border border-red-500/20"}`}
                            >
                              {testResult.success ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                              {testResult.message}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Actions */}
                        <div className="flex gap-3">
                          <Button
                            onClick={handleTest}
                            disabled={isTesting}
                            variant="outline"
                            size="sm"
                            className="border-border/70 text-muted-foreground hover:text-foreground gap-2"
                          >
                            {isTesting ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <Zap className="w-3 h-3" />}
                            Test Connection
                          </Button>
                          <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            size="sm"
                            className="bg-violet-600 hover:bg-violet-500 text-white gap-2 flex-1"
                          >
                            {isSaving ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                            Save & Activate
                          </Button>
                        </div>

                        <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition-colors">
                          <Info className="w-3 h-3" /> View {provider.name} documentation
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Info box */}
          <div className="card-nexus p-5">
            <h3 className="text-foreground font-medium mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-violet-400" /> How API keys work
            </h3>
            <div className="space-y-2 text-muted-foreground text-sm">
              <p>When you provide your own API key, all AI requests on Nexus use your key directly — giving you full control over usage, billing, and rate limits.</p>
              <p>Without a custom key, Nexus uses its built-in Gemini key (subject to platform limits). Your key is stored encrypted and only used server-side — never exposed to the browser.</p>
              <p>You can clear your key at any time to revert to the platform default.</p>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
