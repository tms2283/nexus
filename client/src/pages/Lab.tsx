import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu, Play, X, ChevronRight, Zap, Code2,
  Brain, Sparkles, MessageSquare, BarChart3, Layers,
  CheckCircle, Lightbulb, Eye, RefreshCw,
  Loader2, Copy, Check, Terminal,
  Image, DollarSign, Upload, Hash,
  HelpCircle, BookOpen, AlertTriangle, Send
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import PageWrapper from "@/components/PageWrapper";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Challenge {
  id: string; title: string; difficulty: "easy" | "medium" | "hard";
  category: string; description: string; starter: string;
  solution: string; hint: string; xpReward: number;
}

const challenges: Challenge[] = [
  {
    id: "c1", title: "Array Flattener", difficulty: "easy", category: "JavaScript",
    description: "Write a function that recursively flattens a nested array to any depth.\n\nExample: flatten([1, [2, [3, [4]], 5]]) → [1, 2, 3, 4, 5]",
    starter: `function flatten(arr) {\n  // Your solution here\n  \n}\n\n// Test:\nconsole.log(flatten([1, [2, [3, [4]], 5]])); // [1, 2, 3, 4, 5]`,
    solution: `function flatten(arr) {\n  return arr.reduce((flat, item) =>\n    flat.concat(Array.isArray(item) ? flatten(item) : item), []);\n}`,
    hint: "Think recursively. For each element, check if it's an array — if so, recurse.",
    xpReward: 20,
  },
  {
    id: "c2", title: "Debounce from Scratch", difficulty: "medium", category: "JavaScript",
    description: "Implement a debounce function that delays invoking a function until after a specified wait time has elapsed since the last invocation.",
    starter: `function debounce(fn, wait) {\n  // Your solution here\n  \n}\n\n// Test:\nconst log = debounce((msg) => console.log(msg), 300);\nlog('a'); log('b'); log('c'); // Only 'c' should log after 300ms`,
    solution: `function debounce(fn, wait) {\n  let timer;\n  return function(...args) {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn.apply(this, args), wait);\n  };\n}`,
    hint: "You need a timer variable in closure scope. Clear it on each call, set a new one.",
    xpReward: 30,
  },
  {
    id: "c3", title: "LRU Cache", difficulty: "hard", category: "Data Structures",
    description: "Implement an LRU (Least Recently Used) cache with O(1) get and put operations.",
    starter: `class LRUCache {\n  constructor(capacity) {\n    // Initialize your data structures\n  }\n  get(key) { /* Return value or -1 */ }\n  put(key, value) { /* Insert or update */ }\n}\n\nconst cache = new LRUCache(2);\ncache.put(1, 1); cache.put(2, 2);\nconsole.log(cache.get(1)); // 1\ncache.put(3, 3);\nconsole.log(cache.get(2)); // -1`,
    solution: `class LRUCache {\n  constructor(capacity) {\n    this.capacity = capacity;\n    this.map = new Map();\n  }\n  get(key) {\n    if (!this.map.has(key)) return -1;\n    const val = this.map.get(key);\n    this.map.delete(key); this.map.set(key, val);\n    return val;\n  }\n  put(key, value) {\n    if (this.map.has(key)) this.map.delete(key);\n    else if (this.map.size >= this.capacity)\n      this.map.delete(this.map.keys().next().value);\n    this.map.set(key, value);\n  }\n}`,
    hint: "JavaScript's Map preserves insertion order. Use delete + re-insert to move items to 'most recently used'.",
    xpReward: 50,
  },
  {
    id: "c4", title: "Promise.all from Scratch", difficulty: "medium", category: "JavaScript",
    description: "Implement your own version of Promise.all that resolves when all promises resolve, or rejects as soon as any rejects.",
    starter: `function promiseAll(promises) {\n  // Your solution here\n  \n}\n\npromiseAll([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)])\n  .then(console.log); // [1, 2, 3]`,
    solution: `function promiseAll(promises) {\n  return new Promise((resolve, reject) => {\n    const results = [];\n    let remaining = promises.length;\n    if (!remaining) return resolve([]);\n    promises.forEach((p, i) => {\n      Promise.resolve(p).then(val => {\n        results[i] = val;\n        if (--remaining === 0) resolve(results);\n      }).catch(reject);\n    });\n  });\n}`,
    hint: "Create a new Promise. Track how many have resolved. Use index to preserve order.",
    xpReward: 35,
  },
];

const experiments = [
  { id: "prompt-lab", title: "Prompt Engineering Lab", desc: "Compare zero-shot, few-shot, chain-of-thought, and role prompting side by side. See how technique changes output quality.", status: "live", color: "oklch(0.65 0.22 200)", icon: MessageSquare, tag: "AI Fundamentals" },
  { id: "chain-of-thought", title: "Chain-of-Thought Visualizer", desc: "Watch AI reason step-by-step through complex problems. See how explicit reasoning dramatically improves accuracy.", status: "live", color: "oklch(0.65 0.22 290)", icon: Brain, tag: "AI Reasoning" },
  { id: "text-classifier", title: "AI Text Classifier", desc: "Classify any text by sentiment, topic, intent, and tone in real time. Understand how NLP models interpret language.", status: "live", color: "oklch(0.75 0.18 55)", icon: BarChart3, tag: "NLP" },
  { id: "ai-debate", title: "AI Debate Arena", desc: "Two AI personas argue opposite sides of any topic. Explore how framing and perspective shape AI responses.", status: "live", color: "oklch(0.70 0.20 150)", icon: Layers, tag: "Prompt Design" },
  { id: "particle-sim", title: "Particle Physics Sim", desc: "Real-time particle simulation with gravity and collision detection. Click to spawn particles. Built with Canvas API.", status: "live", color: "oklch(0.65 0.22 20)", icon: Cpu, tag: "Canvas API" },
  { id: "neural-viz", title: "Neural Network Visualizer", desc: "Watch a neural network train in real time. Adjust learning rate and see weights update live.", status: "live", color: "oklch(0.65 0.22 160)", icon: Sparkles, tag: "ML Concepts" },
  { id: "image-describer", title: "AI Image Describer", desc: "Paste any image URL and watch the AI analyze it in rich detail — subjects, composition, colors, mood, and hidden insights.", status: "live", color: "oklch(0.72 0.20 310)", icon: Image, tag: "Vision AI" },
  { id: "token-counter", title: "Token Counter & Cost Estimator", desc: "Understand how LLMs tokenize text. Estimate API costs across Claude, Gemini, and Llama models in real time.", status: "live", color: "oklch(0.75 0.18 55)", icon: DollarSign, tag: "LLM Economics" },
  { id: "socratic-tutor", title: "Socratic Tutor", desc: "The AI never gives you the answer. It asks 6 probing questions that guide you to discover any concept yourself. Proven 2× better retention.", status: "live", color: "oklch(0.72 0.18 150)", icon: HelpCircle, tag: "Socratic Method" },
  { id: "story-gen", title: "AI Story Generator", desc: "Collaborative fiction with branching choices. You and the AI co-write a story — every choice you make shapes the narrative.", status: "live", color: "oklch(0.78 0.16 30)", icon: BookOpen, tag: "Creative AI" },
  { id: "bias-detect", title: "Cognitive Bias Detector", desc: "Paste any text — news, essays, social media posts. The AI identifies logical fallacies, cognitive biases, and rhetorical manipulation.", status: "live", color: "oklch(0.65 0.22 20)", icon: AlertTriangle, tag: "Critical Thinking" },
];

const difficultyColors = { easy: "oklch(0.70 0.20 150)", medium: "oklch(0.75 0.18 55)", hard: "oklch(0.65 0.22 20)" };

// ─── Particle Sim ─────────────────────────────────────────────────────────────
function ParticleSimExperiment() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Array<{x:number;y:number;vx:number;vy:number;r:number;color:string}>>([]);
  const [running, setRunning] = useState(true);
  const [gravity, setGravity] = useState(0.1);
  const runningRef = useRef(true);
  const gravityRef = useRef(0.1);

  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { gravityRef.current = gravity; }, [gravity]);

  const spawnParticles = (x: number, y: number, n = 8) => {
    const colors = ["oklch(0.65 0.22 200)","oklch(0.65 0.22 290)","oklch(0.75 0.18 55)","oklch(0.70 0.20 150)"];
    for (let i = 0; i < n; i++) {
      particlesRef.current.push({ x, y, vx: (Math.random()-0.5)*6, vy: (Math.random()-0.5)*4-2, r: 3+Math.random()*5, color: colors[Math.floor(Math.random()*colors.length)] });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    spawnParticles(canvas.width/2, canvas.height/2, 40);
    const animate = () => {
      if (!runningRef.current) { animRef.current = requestAnimationFrame(animate); return; }
      ctx.fillStyle = "rgba(8,10,20,0.18)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach(p => {
        p.vy += gravityRef.current;
        p.x += p.vx; p.y += p.vy;
        if (p.x < p.r || p.x > canvas.width - p.r) { p.vx *= -0.85; p.x = Math.max(p.r, Math.min(canvas.width - p.r, p.x)); }
        if (p.y > canvas.height - p.r) { p.vy *= -0.75; p.y = canvas.height - p.r; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
      });
      animRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Click the canvas to spawn particles. Adjust gravity below.</p>
      <canvas ref={canvasRef} width={540} height={300} onClick={e => { const r = canvasRef.current!.getBoundingClientRect(); spawnParticles(e.clientX-r.left, e.clientY-r.top); }}
        className="w-full rounded-xl border border-white/10 cursor-crosshair" style={{background:"oklch(0.07 0.01 200)"}} />
      <div className="flex items-center gap-6">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Gravity: {gravity.toFixed(2)}</label>
          <input type="range" min="0" max="0.5" step="0.01" value={gravity} onChange={e => setGravity(+e.target.value)} className="w-full" />
        </div>
        <button onClick={() => setRunning(r => !r)} className="px-4 py-2 rounded-lg glass border border-white/10 text-sm hover:border-white/25 transition-colors">
          {running ? "⏸ Pause" : "▶ Resume"}
        </button>
      </div>
    </div>
  );
}

// ─── Neural Network Viz ───────────────────────────────────────────────────────
function NeuralNetworkExperiment() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [epoch, setEpoch] = useState(0);
  const [loss, setLoss] = useState(1.0);
  const [lr, setLr] = useState(0.1);
  const [training, setTraining] = useState(false);
  const weightsRef = useRef<number[][][]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const epochRef = useRef(0);
  const lossRef = useRef(1.0);

  const initWeights = () => {
    weightsRef.current = [
      Array.from({length:4}, () => Array.from({length:3}, () => (Math.random()-0.5)*2)),
      Array.from({length:3}, () => Array.from({length:2}, () => (Math.random()-0.5)*2)),
    ];
  };

  const drawNetwork = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const layers = [3, 4, 3, 2];
    const xPos = [60, 180, 300, 420];
    const nodePos = layers.map((n, li) => Array.from({length:n}, (_, ni) => ({ x: xPos[li], y: (canvas.height/(n+1))*(ni+1) })));
    nodePos.forEach((layer, li) => {
      if (li === layers.length-1) return;
      layer.forEach(from => nodePos[li+1].forEach(to => {
        const w = weightsRef.current[Math.min(li,1)]?.[0]?.[0] ?? 0;
        const alpha = Math.min(0.7, Math.abs(w)*0.3+0.1);
        ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = w > 0 ? `rgba(100,200,255,${alpha})` : `rgba(255,100,100,${alpha})`;
        ctx.lineWidth = 1; ctx.stroke();
      }));
    });
    const layerLabels = ["Input","Hidden 1","Hidden 2","Output"];
    nodePos.forEach((layer, li) => {
      layer.forEach(node => {
        ctx.beginPath(); ctx.arc(node.x, node.y, 13, 0, Math.PI*2);
        const g = ctx.createRadialGradient(node.x-3, node.y-3, 2, node.x, node.y, 13);
        g.addColorStop(0, li===0?"oklch(0.75 0.18 200)":li===layers.length-1?"oklch(0.75 0.18 150)":"oklch(0.65 0.22 290)");
        g.addColorStop(1, "oklch(0.15 0.05 200)");
        ctx.fillStyle = g; ctx.shadowColor = "oklch(0.65 0.22 200)"; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
      });
      ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(layerLabels[li], xPos[li], 14);
    });
    ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = "11px monospace"; ctx.textAlign = "right";
    ctx.fillText(`Epoch: ${epochRef.current}  Loss: ${lossRef.current.toFixed(4)}`, canvas.width-10, canvas.height-10);
  }, []);

  useEffect(() => { initWeights(); drawNetwork(); }, [drawNetwork]);

  const startTraining = () => {
    if (training) { if (timerRef.current) clearInterval(timerRef.current); setTraining(false); return; }
    setTraining(true);
    timerRef.current = setInterval(() => {
      weightsRef.current = weightsRef.current.map(layer => layer.map(row => row.map(w => w + (Math.random()-0.5)*lr*0.3)));
      epochRef.current += 1;
      lossRef.current = Math.max(0.02, lossRef.current*(1-lr*0.08)+(Math.random()-0.5)*0.01);
      setEpoch(epochRef.current); setLoss(lossRef.current);
      drawNetwork();
    }, 150);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Watch a 4-layer neural network train. Blue connections = positive weights, red = negative. Adjust learning rate to see how it affects convergence.</p>
      <canvas ref={canvasRef} width={480} height={260} className="w-full rounded-xl border border-white/10" style={{background:"oklch(0.07 0.01 200)"}} />
      <div className="flex items-center gap-6">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Learning Rate: {lr.toFixed(2)}</label>
          <input type="range" min="0.01" max="0.5" step="0.01" value={lr} onChange={e => setLr(+e.target.value)} className="w-full" />
        </div>
        <div className="text-right min-w-[60px]">
          <div className="text-xs text-muted-foreground">Epoch</div>
          <div className="font-mono text-lg text-[oklch(0.75_0.18_200)]">{epoch}</div>
        </div>
        <div className="text-right min-w-[80px]">
          <div className="text-xs text-muted-foreground">Loss</div>
          <div className="font-mono text-lg text-[oklch(0.75_0.18_55)]">{loss.toFixed(4)}</div>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={startTraining} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${training ? "border-[oklch(0.65_0.22_20_/_0.5)] bg-[oklch(0.65_0.22_20_/_0.2)]" : "border-[oklch(0.65_0.22_290_/_0.4)] bg-[oklch(0.65_0.22_290_/_0.15)] hover:bg-[oklch(0.65_0.22_290_/_0.3)]"}`}>
          {training ? "⏹ Stop" : "▶ Train"}
        </button>
        <button onClick={() => { initWeights(); epochRef.current=0; lossRef.current=1.0; setEpoch(0); setLoss(1.0); setTraining(false); if(timerRef.current) clearInterval(timerRef.current); drawNetwork(); }} className="px-4 py-2 rounded-lg glass border border-white/10 text-sm hover:border-white/25 transition-colors">
          <RefreshCw size={13} className="inline mr-1" /> Reset
        </button>
      </div>
    </div>
  );
}

// ─── Prompt Lab ───────────────────────────────────────────────────────────────
function PromptLabExperiment({ cookieId }: { cookieId: string }) {
  const [task, setTask] = useState("Explain quantum entanglement to a 10-year-old");
  const [technique, setTechnique] = useState<"zero-shot"|"few-shot"|"chain-of-thought"|"role">("zero-shot");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const promptMutation = trpc.lab.promptExperiment.useMutation();

  const techniques = [
    { id: "zero-shot" as const, label: "Zero-Shot", desc: "Direct question, no examples" },
    { id: "few-shot" as const, label: "Few-Shot", desc: "Provide 2-3 examples first" },
    { id: "chain-of-thought" as const, label: "Chain-of-Thought", desc: "Ask AI to reason step by step" },
    { id: "role" as const, label: "Role Prompting", desc: "Assign AI a specific persona" },
  ];

  const run = async () => {
    if (!task.trim()) return;
    setLoading(true); setResult("");
    try {
      const r = await promptMutation.mutateAsync({ cookieId, task, technique });
      setResult(r.response?.trim() ? r.response : "Error running experiment. Please try again.");
    } catch { setResult("Error running experiment. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Enter any task, select a prompting technique, and see how the same question gets answered differently. This is the core skill of AI literacy.</p>
      <input value={task} onChange={e => setTask(e.target.value)} placeholder="Enter any task or question…" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)]" />
      <div className="grid grid-cols-2 gap-2">
        {techniques.map(t => (
          <button key={t.id} onClick={() => setTechnique(t.id)} className={`p-3 rounded-lg border text-left transition-all ${technique===t.id ? "border-[oklch(0.65_0.22_200_/_0.5)] bg-[oklch(0.65_0.22_200_/_0.1)]" : "border-white/10 hover:border-white/20"}`}>
            <div className="text-sm font-medium">{t.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
          </button>
        ))}
      </div>
      <button onClick={run} disabled={loading || !task.trim()} className="w-full py-2.5 rounded-lg bg-[oklch(0.65_0.22_200_/_0.2)] border border-[oklch(0.65_0.22_200_/_0.4)] text-sm font-medium hover:bg-[oklch(0.65_0.22_200_/_0.3)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
        {loading ? <><Loader2 size={14} className="animate-spin" /> Running…</> : <><Play size={14} /> Run Experiment</>}
      </button>
      {result && (
        <div className="relative glass rounded-xl border border-white/10 p-4">
          <button onClick={() => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(()=>setCopied(false),2000); }} className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground">
            {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
          </button>
          <div className="text-xs text-muted-foreground mb-2 font-mono uppercase tracking-wider">{technique} result</div>
          <div className="prose prose-sm prose-invert max-w-none text-sm"><Streamdown>{result}</Streamdown></div>
        </div>
      )}
    </div>
  );
}

// ─── Chain of Thought ─────────────────────────────────────────────────────────
function ChainOfThoughtExperiment({ cookieId }: { cookieId: string }) {
  const [problem, setProblem] = useState("If a train travels at 60 mph for 2.5 hours, then at 80 mph for 1.5 hours, what is the total distance?");
  const [steps, setSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const cotMutation = trpc.lab.chainOfThought.useMutation();

  const run = async () => {
    if (!problem.trim()) return;
    setLoading(true); setSteps([]); setVisibleSteps(0);
    try {
      const r = await cotMutation.mutateAsync({ cookieId, problem });
      setSteps(r.steps);
      r.steps.forEach((_, i) => setTimeout(() => setVisibleSteps(i+1), i*500));
    } catch { setSteps(["Error running experiment. Please try again."]); setVisibleSteps(1); }
    finally { setLoading(false); }
  };

  const examples = [
    "If a train travels at 60 mph for 2.5 hours, then at 80 mph for 1.5 hours, what is the total distance?",
    "A store sells apples for $0.50 and oranges for $0.75. If I buy 6 apples and 4 oranges, how much change from $10?",
    "Is it possible for a number to be both rational and irrational? Explain your reasoning.",
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">See how AI breaks complex problems into explicit reasoning steps. This technique (CoT prompting) dramatically improves accuracy on multi-step problems.</p>
      <textarea value={problem} onChange={e => setProblem(e.target.value)} rows={3} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[oklch(0.65_0.22_290_/_0.5)] resize-none" />
      <div className="flex flex-wrap gap-2">
        {examples.map((ex, i) => (
          <button key={i} onClick={() => setProblem(ex)} className="text-xs px-2.5 py-1 rounded-full border border-white/10 hover:border-white/25 text-muted-foreground hover:text-foreground transition-colors">Example {i+1}</button>
        ))}
      </div>
      <button onClick={run} disabled={loading || !problem.trim()} className="w-full py-2.5 rounded-lg bg-[oklch(0.65_0.22_290_/_0.2)] border border-[oklch(0.65_0.22_290_/_0.4)] text-sm font-medium hover:bg-[oklch(0.65_0.22_290_/_0.3)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
        {loading ? <><Loader2 size={14} className="animate-spin" /> Reasoning…</> : <><Brain size={14} /> Show Reasoning Steps</>}
      </button>
      {steps.length > 0 && (
        <div className="space-y-2">
          {steps.slice(0, visibleSteps).map((step, i) => (
            <motion.div key={i} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} className="flex gap-3 glass rounded-xl border border-white/10 p-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[oklch(0.65_0.22_290_/_0.25)] border border-[oklch(0.65_0.22_290_/_0.4)] flex items-center justify-center text-xs font-bold text-[oklch(0.75_0.18_290)]">{i+1}</div>
              <div className="text-sm text-foreground/90 leading-relaxed">{step}</div>
            </motion.div>
          ))}
          {loading && <div className="flex gap-2 items-center text-xs text-muted-foreground"><Loader2 size={12} className="animate-spin" /> Generating next step…</div>}
        </div>
      )}
    </div>
  );
}

// ─── Text Classifier ──────────────────────────────────────────────────────────
function TextClassifierExperiment({ cookieId }: { cookieId: string }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{sentiment:string;topic:string;intent:string;tone:string;confidence:number}|null>(null);
  const [loading, setLoading] = useState(false);
  const classifyMutation = trpc.lab.classifyText.useMutation();

  const run = async () => {
    if (!text.trim()) return;
    setLoading(true); setResult(null);
    try { setResult(await classifyMutation.mutateAsync({ cookieId, text })); }
    catch { toast.error("Classification failed."); }
    finally { setLoading(false); }
  };

  const examples = [
    "I absolutely love this new AI tool — it's completely changed how I work!",
    "The government should implement stricter regulations on large language models.",
    "How do I fine-tune a BERT model on a custom dataset?",
  ];

  const sentimentColor: Record<string,string> = { positive:"oklch(0.70 0.20 150)", negative:"oklch(0.65 0.22 20)", neutral:"oklch(0.65 0.22 200)", mixed:"oklch(0.75 0.18 55)" };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Enter any text and see how AI classifies it across multiple dimensions simultaneously. Understand how NLP models interpret language.</p>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste any text to classify…" rows={4} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[oklch(0.75_0.18_55_/_0.5)] resize-none" />
      <div className="flex flex-wrap gap-2">
        {examples.map((ex, i) => (
          <button key={i} onClick={() => setText(ex)} className="text-xs px-2.5 py-1 rounded-full border border-white/10 hover:border-white/25 text-muted-foreground hover:text-foreground transition-colors">Example {i+1}</button>
        ))}
      </div>
      <button onClick={run} disabled={loading || !text.trim()} className="w-full py-2.5 rounded-lg bg-[oklch(0.75_0.18_55_/_0.2)] border border-[oklch(0.75_0.18_55_/_0.4)] text-sm font-medium hover:bg-[oklch(0.75_0.18_55_/_0.3)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
        {loading ? <><Loader2 size={14} className="animate-spin" /> Classifying…</> : <><BarChart3 size={14} /> Classify Text</>}
      </button>
      {result && (
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="grid grid-cols-2 gap-3">
          {[{label:"Sentiment",value:result.sentiment,color:sentimentColor[result.sentiment.toLowerCase()]||"oklch(0.65 0.22 200)"},{label:"Topic",value:result.topic,color:"oklch(0.65 0.22 200)"},{label:"Intent",value:result.intent,color:"oklch(0.65 0.22 200)"},{label:"Tone",value:result.tone,color:"oklch(0.65 0.22 200)"}].map(item => (
            <div key={item.label} className="glass rounded-xl border border-white/10 p-3">
              <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
              <div className="font-semibold capitalize" style={{color:item.color}}>{item.value}</div>
            </div>
          ))}
          <div className="col-span-2 glass rounded-xl border border-white/10 p-3">
            <div className="text-xs text-muted-foreground mb-2">Confidence</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div initial={{width:0}} animate={{width:`${result.confidence}%`}} transition={{duration:0.8,ease:"easeOut"}} className="h-full rounded-full bg-[oklch(0.65_0.22_200)]" />
              </div>
              <span className="text-sm font-mono text-[oklch(0.75_0.18_200)]">{result.confidence}%</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── AI Debate ────────────────────────────────────────────────────────────────
function AIDebateExperiment({ cookieId }: { cookieId: string }) {
  const [topic, setTopic] = useState("AI will replace most knowledge workers within 10 years");
  const [proArg, setProArg] = useState(""); const [conArg, setConArg] = useState("");
  const [loading, setLoading] = useState(false);
  const debateMutation = trpc.lab.debate.useMutation();

  const run = async () => {
    if (!topic.trim()) return;
    setLoading(true); setProArg(""); setConArg("");
    try { const r = await debateMutation.mutateAsync({ cookieId, topic }); setProArg(r.pro); setConArg(r.con); }
    catch { toast.error("Debate failed."); }
    finally { setLoading(false); }
  };

  const topics = ["AI will replace most knowledge workers within 10 years","Open-source AI models are more dangerous than closed ones","Universal Basic Income is necessary in an AI-driven economy"];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Two AI personas argue opposite sides of a topic. This demonstrates how the same model can construct compelling arguments for any position — and why critical thinking matters.</p>
      <input value={topic} onChange={e => setTopic(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[oklch(0.70_0.20_150_/_0.5)]" />
      <div className="flex flex-wrap gap-2">
        {topics.map((t, i) => <button key={i} onClick={() => setTopic(t)} className="text-xs px-2.5 py-1 rounded-full border border-white/10 hover:border-white/25 text-muted-foreground hover:text-foreground transition-colors">Topic {i+1}</button>)}
      </div>
      <button onClick={run} disabled={loading || !topic.trim()} className="w-full py-2.5 rounded-lg bg-[oklch(0.70_0.20_150_/_0.2)] border border-[oklch(0.70_0.20_150_/_0.4)] text-sm font-medium hover:bg-[oklch(0.70_0.20_150_/_0.3)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
        {loading ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><Layers size={14} /> Start Debate</>}
      </button>
      {(proArg || conArg) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {proArg && <div className="glass rounded-xl border border-[oklch(0.70_0.20_150_/_0.3)] p-4"><div className="text-xs font-semibold text-[oklch(0.70_0.20_150)] mb-3 uppercase tracking-wider flex items-center gap-1.5"><CheckCircle size={12} /> For</div><div className="prose prose-sm prose-invert max-w-none text-sm"><Streamdown>{proArg}</Streamdown></div></div>}
          {conArg && <div className="glass rounded-xl border border-[oklch(0.65_0.22_20_/_0.3)] p-4"><div className="text-xs font-semibold text-[oklch(0.65_0.22_20)] mb-3 uppercase tracking-wider flex items-center gap-1.5"><X size={12} /> Against</div><div className="prose prose-sm prose-invert max-w-none text-sm"><Streamdown>{conArg}</Streamdown></div></div>}
        </div>
      )}
    </div>
  );
}

// ─── Experiment Modal ─────────────────────────────────────────────────────────
// ─── AI Image Describer ───────────────────────────────────────────────────────
function ImageDescriberExperiment({ cookieId }: { cookieId: string }) {
  const [imageUrl, setImageUrl] = useState("https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/1200px-Cat03.jpg");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewOk, setPreviewOk] = useState(true);
  const describeMutation = trpc.lab.describeImage.useMutation();
  const samples = [
    { label: "Cat", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/1200px-Cat03.jpg" },
    { label: "Starry Night", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg" },
    { label: "NYC Park", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Southwest_corner_of_Central_Park%2C_looking_east%2C_NYC.jpg/1280px-Southwest_corner_of_Central_Park%2C_looking_east%2C_NYC.jpg" },
  ];
  const run = async () => {
    if (!imageUrl.trim()) return;
    setLoading(true); setDescription("");
    try {
      const r = await describeMutation.mutateAsync({ cookieId, imageUrl });
      setDescription(r.description);
    } catch { toast.error("Could not analyze image. Check the URL and try again."); }
    finally { setLoading(false); }
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Paste any public image URL. The AI uses multimodal vision to analyze subjects, composition, colors, mood, and subtle details.</p>
      <div className="flex gap-2">
        <input value={imageUrl} onChange={e => { setImageUrl(e.target.value); setPreviewOk(true); }} placeholder="https://example.com/image.jpg" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[oklch(0.72_0.20_310_/_0.5)] min-w-0" />
      </div>
      <div className="flex flex-wrap gap-2">
        {samples.map(s => <button key={s.label} onClick={() => { setImageUrl(s.url); setPreviewOk(true); setDescription(""); }} className="text-xs px-2.5 py-1 rounded-full border border-white/10 hover:border-white/25 text-muted-foreground hover:text-foreground transition-colors">{s.label}</button>)}
      </div>
      {imageUrl && previewOk && (
        <div className="rounded-xl overflow-hidden border border-white/10 max-h-48 bg-white/5">
          <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" onError={() => setPreviewOk(false)} />
        </div>
      )}
      <button onClick={run} disabled={loading || !imageUrl.trim()} className="w-full py-2.5 rounded-lg bg-[oklch(0.72_0.20_310_/_0.2)] border border-[oklch(0.72_0.20_310_/_0.4)] text-sm font-medium hover:bg-[oklch(0.72_0.20_310_/_0.3)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
        {loading ? <><Loader2 size={14} className="animate-spin" /> Analyzing…</> : <><Image size={14} /> Analyze Image</>}
      </button>
      {description && (
        <div className="glass rounded-xl border border-[oklch(0.72_0.20_310_/_0.3)] p-4">
          <div className="text-xs font-semibold text-[oklch(0.72_0.20_310)] mb-3 uppercase tracking-wider flex items-center gap-1.5"><Eye size={12} /> AI Analysis</div>
          <div className="prose prose-sm prose-invert max-w-none text-sm"><Streamdown>{description}</Streamdown></div>
        </div>
      )}
    </div>
  );
}
// ─── Token Counter ────────────────────────────────────────────────────────────
function TokenCounterExperiment({ cookieId }: { cookieId: string }) {
  const [text, setText] = useState("The quick brown fox jumps over the lazy dog. This is a sample sentence to demonstrate how LLMs tokenize text into subword units.");
  const [model, setModel] = useState<"claude-3-opus" | "gemini-1.5-pro" | "gemini-2.5-pro" | "llama-3-70b">("gemini-2.5-pro");
  const [result, setResult] = useState<{ tokens: number; characters: number; words: number; model: string; inputCostUSD: number; outputCostUSD: number; contextWindowTokens: number; contextUsedPercent: number; fitsInContext: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const countMutation = trpc.lab.tokenCount.useMutation();
  const models = ["claude-3-opus", "gemini-1.5-pro", "gemini-2.5-pro", "llama-3-70b"] as const;
  const run = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const r = await countMutation.mutateAsync({ cookieId, text, model });
      setResult(r);
    } catch { toast.error("Token count failed."); }
    finally { setLoading(false); }
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Understand how LLMs tokenize text and estimate API costs. Tokens are the basic units LLMs process — roughly 4 characters each for English text.</p>
      <div className="flex flex-wrap gap-2">
        {models.map(m => (
          <button key={m} onClick={() => setModel(m)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${model === m ? "border-[oklch(0.75_0.18_55_/_0.6)] bg-[oklch(0.75_0.18_55_/_0.15)] text-[oklch(0.85_0.18_55)]" : "border-white/10 text-muted-foreground hover:border-white/25 hover:text-foreground"}`}>{m}</button>
        ))}
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={5} placeholder="Enter any text to count tokens and estimate cost..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[oklch(0.75_0.18_55_/_0.5)] resize-none font-mono" />
      <button onClick={run} disabled={loading || !text.trim()} className="w-full py-2.5 rounded-lg bg-[oklch(0.75_0.18_55_/_0.2)] border border-[oklch(0.75_0.18_55_/_0.4)] text-sm font-medium hover:bg-[oklch(0.75_0.18_55_/_0.3)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
        {loading ? <><Loader2 size={14} className="animate-spin" /> Counting…</> : <><Hash size={14} /> Count Tokens</>}
      </button>
      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Tokens", value: result.tokens.toLocaleString(), color: "oklch(0.75 0.18 55)" },
              { label: "Words", value: result.words.toLocaleString(), color: "oklch(0.65 0.22 200)" },
              { label: "Characters", value: result.characters.toLocaleString(), color: "oklch(0.72 0.20 290)" },
            ].map(stat => (
              <div key={stat.label} className="glass rounded-xl border border-white/10 p-3 text-center">
                <div className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
          <div className="glass rounded-xl border border-white/10 p-4 space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><DollarSign size={12} /> Cost Estimate ({result.model})</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Input cost</div>
                <div className="text-sm font-mono text-foreground">${result.inputCostUSD < 0.000001 ? "<$0.000001" : result.inputCostUSD.toFixed(6)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Output cost (if same length)</div>
                <div className="text-sm font-mono text-foreground">${result.outputCostUSD < 0.000001 ? "<$0.000001" : result.outputCostUSD.toFixed(6)}</div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Context window usage</span>
                <span className={result.fitsInContext ? "text-green-400" : "text-red-400"}>{result.contextUsedPercent}% of {(result.contextWindowTokens / 1000).toFixed(0)}K tokens {result.fitsInContext ? "✓" : "⚠ exceeds limit"}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, result.contextUsedPercent)}%`, backgroundColor: result.contextUsedPercent > 90 ? "oklch(0.65 0.22 20)" : result.contextUsedPercent > 70 ? "oklch(0.75 0.18 55)" : "oklch(0.70 0.20 150)" }} />
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground/60 text-center">Estimates use ~4 chars/token heuristic. Actual tokenization varies by model and content.</div>
        </div>
      )}
    </div>
  );
}
// ─── Socratic Tutor ────────────────────────────────────────────
function SocraticTutorExperiment({ cookieId }: { cookieId: string }) {
  const [topic, setTopic] = useState("");
  const [started, setStarted] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [qNum, setQNum] = useState(1);
  const [isComplete, setIsComplete] = useState(false);
  const [insight, setInsight] = useState("");
  const [history, setHistory] = useState<Array<{q:string;a:string}>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const socraticMutation = trpc.lab.socraticTutor.useMutation();
  const startSession = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await socraticMutation.mutateAsync({ cookieId, topic, questionNumber: 1 });
      if (!res.question?.trim()) throw new Error("The tutor did not return a question.");
      setQuestion(res.question);
      setStarted(true);
    } catch {
      setError("The Socratic tutor could not generate a question. Please try again.");
      toast.error("The Socratic tutor could not generate a question.");
    } finally { setLoading(false); }
  };
  const submitAnswer = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    setError("");
    const prevHistory = [...history, { q: question, a: answer }];
    setHistory(prevHistory);
    try {
      const res = await socraticMutation.mutateAsync({ cookieId, topic, userAnswer: answer, questionNumber: qNum + 1 });
      if (!res.question?.trim() && !res.isComplete) throw new Error("The tutor did not return a follow-up question.");
      setQuestion(res.question);
      setQNum(n => n + 1);
      setAnswer("");
      if (res.isComplete) { setIsComplete(true); setInsight(res.insight); }
    } catch {
      setHistory(history);
      setError("The Socratic tutor could not continue the session. Please try again.");
      toast.error("The Socratic tutor could not continue the session.");
    } finally { setLoading(false); }
  };
  const reset = () => { setStarted(false); setQuestion(""); setAnswer(""); setQNum(1); setIsComplete(false); setInsight(""); setHistory([]); setTopic(""); setError(""); };
  if (!started) return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Enter any topic and the AI will guide you to understand it through 6 probing questions — never giving the answer directly.</p>
      <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && startSession()} placeholder="e.g. Quantum entanglement, The French Revolution, Neural networks..." className="w-full px-4 py-3 rounded-xl glass border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[oklch(0.72_0.18_150_/_0.4)] bg-transparent" />
      {error && <div className="text-sm text-[oklch(0.65_0.22_20)]">{error}</div>}
      <button onClick={startSession} disabled={loading || !topic.trim()} className="w-full py-3 rounded-xl font-semibold text-sm transition-all" style={{background:"oklch(0.72 0.18 150 / 0.15)",border:"1px solid oklch(0.72 0.18 150 / 0.3)",color:"oklch(0.85 0.14 150)"}}>
        {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Starting session...</span> : "Begin Socratic Session"}
      </button>
    </div>
  );
  if (isComplete) return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl" style={{background:"oklch(0.72 0.18 150 / 0.08)",border:"1px solid oklch(0.72 0.18 150 / 0.2)"}}>
        <div className="text-xs font-semibold mb-2" style={{color:"oklch(0.72 0.18 150)"}}>SESSION COMPLETE — YOUR INSIGHT</div>
        <p className="text-sm text-foreground leading-relaxed">{insight}</p>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {history.map((h,i) => <div key={i} className="text-xs space-y-1"><div className="text-muted-foreground">Q{i+1}: {h.q}</div><div className="text-foreground/80 pl-3 border-l border-white/10">{h.a}</div></div>)}
      </div>
      <button onClick={reset} className="w-full py-2 rounded-xl text-sm glass border border-white/10 hover:border-white/20 transition-colors">Start New Session</button>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Topic: <span className="text-foreground">{topic}</span></span>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{background:"oklch(0.72 0.18 150 / 0.1)",color:"oklch(0.72 0.18 150)"}}>Question {qNum} of 6</span>
      </div>
      {error && <div className="text-sm text-[oklch(0.65_0.22_20)]">{error}</div>}
      <div className="p-4 rounded-xl" style={{background:"oklch(0.72 0.18 150 / 0.06)",border:"1px solid oklch(0.72 0.18 150 / 0.2)"}}>
        <p className="text-sm text-foreground leading-relaxed">{question}</p>
      </div>
      {history.length > 0 && <div className="space-y-1 max-h-32 overflow-y-auto">{history.map((h,i) => <div key={i} className="text-xs text-muted-foreground">Q{i+1}: {h.a}</div>)}</div>}
      <div className="flex gap-2">
        <textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Your answer..." rows={2} className="flex-1 px-3 py-2 rounded-xl glass border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[oklch(0.72_0.18_150_/_0.4)] bg-transparent resize-none" />
        <button onClick={submitAnswer} disabled={loading || !answer.trim()} className="px-4 rounded-xl transition-all" style={{background:"oklch(0.72 0.18 150 / 0.15)",border:"1px solid oklch(0.72 0.18 150 / 0.3)"}}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} style={{color:"oklch(0.72 0.18 150)"}} />}
        </button>
      </div>
    </div>
  );
}

// ─── AI Story Generator ────────────────────────────────────────────
function StoryGenExperiment({ cookieId }: { cookieId: string }) {
  const [genre, setGenre] = useState("Sci-Fi");
  const [premise, setPremise] = useState("");
  const [story, setStory] = useState("");
  const [choices, setChoices] = useState<string[]>([]);
  const [storyHistory, setStoryHistory] = useState("");
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const storyMutation = trpc.lab.storyGen.useMutation();
  const genres = ["Sci-Fi","Fantasy","Thriller","Mystery","Horror","Romance","Historical","Comedy"];
  const startStory = async () => {
    if (!premise.trim()) return;
    setLoading(true);
    try {
      const res = await storyMutation.mutateAsync({ cookieId, genre, premise });
      setStory(res.story); setChoices(res.choices); setStoryHistory(res.story); setStarted(true);
    } finally { setLoading(false); }
  };
  const makeChoice = async (choice: string) => {
    setLoading(true);
    try {
      const res = await storyMutation.mutateAsync({ cookieId, genre, premise, choice, storyHistory });
      const newHistory = storyHistory + "\n\n[Choice: " + choice + "]\n\n" + res.story;
      setStory(res.story); setChoices(res.choices); setStoryHistory(newHistory);
    } finally { setLoading(false); }
  };
  if (!started) return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Choose a genre and write a premise. The AI writes the opening scene, then you make choices that shape the story.</p>
      <div className="flex flex-wrap gap-2">
        {genres.map(g => <button key={g} onClick={() => setGenre(g)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${genre===g ? "" : "glass border border-white/8 text-muted-foreground hover:border-white/15"}`} style={genre===g ? {background:"oklch(0.78 0.16 30 / 0.15)",border:"1px solid oklch(0.78 0.16 30 / 0.35)",color:"oklch(0.88 0.12 30)"} : {}}>{g}</button>)}
      </div>
      <textarea value={premise} onChange={e => setPremise(e.target.value)} placeholder="e.g. A lone astronaut discovers a signal from a dead civilization..." rows={3} className="w-full px-4 py-3 rounded-xl glass border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[oklch(0.78_0.16_30_/_0.4)] bg-transparent resize-none" />
      <button onClick={startStory} disabled={loading || !premise.trim()} className="w-full py-3 rounded-xl font-semibold text-sm transition-all" style={{background:"oklch(0.78 0.16 30 / 0.15)",border:"1px solid oklch(0.78 0.16 30 / 0.3)",color:"oklch(0.88 0.12 30)"}}>
        {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Writing your story...</span> : "Begin Story"}
      </button>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="max-h-48 overflow-y-auto p-4 rounded-xl" style={{background:"oklch(0.78 0.16 30 / 0.05)",border:"1px solid oklch(0.78 0.16 30 / 0.15)"}}>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{story}</p>
      </div>
      {loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Continuing the story...</div> : (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">WHAT DO YOU DO?</div>
          {choices.map((c, i) => (
            <button key={i} onClick={() => makeChoice(c)} className="w-full text-left px-4 py-3 rounded-xl glass border border-white/8 hover:border-white/20 text-sm text-foreground transition-all group">
              <span className="text-xs font-bold mr-2" style={{color:"oklch(0.78 0.16 30)"}}>{String.fromCharCode(65+i)}.</span>{c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Cognitive Bias Detector ────────────────────────────────────────────
function BiasDetectorExperiment({ cookieId }: { cookieId: string }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{biases:Array<{name:string;quote:string;explanation:string;severity:string}>;overallScore:number;summary:string}|null>(null);
  const [loading, setLoading] = useState(false);
  const biasMutation = trpc.lab.biasDetect.useMutation();
  const severityColor: Record<string,string> = { low: "oklch(0.70 0.20 150)", medium: "oklch(0.75 0.18 55)", high: "oklch(0.65 0.22 20)" };
  const analyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try { setResult(await biasMutation.mutateAsync({ cookieId, text })); }
    finally { setLoading(false); }
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Paste any text — news article, essay, tweet thread, political speech. The AI identifies cognitive biases and logical fallacies.</p>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste text to analyze..." rows={5} className="w-full px-4 py-3 rounded-xl glass border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[oklch(0.65_0.22_20_/_0.4)] bg-transparent resize-none" />
      <button onClick={analyze} disabled={loading || !text.trim()} className="w-full py-3 rounded-xl font-semibold text-sm transition-all" style={{background:"oklch(0.65 0.22 20 / 0.15)",border:"1px solid oklch(0.65 0.22 20 / 0.3)",color:"oklch(0.80 0.16 20)"}}>
        {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Analyzing for biases...</span> : "Detect Biases"}
      </button>
      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl" style={{background:"oklch(0.65 0.22 20 / 0.06)",border:"1px solid oklch(0.65 0.22 20 / 0.2)"}}>
            <div>
              <div className="text-xs text-muted-foreground">Objectivity Score</div>
              <div className="text-2xl font-bold" style={{color: result.overallScore >= 70 ? "oklch(0.70 0.20 150)" : result.overallScore >= 40 ? "oklch(0.75 0.18 55)" : "oklch(0.65 0.22 20)"}}>{result.overallScore}/100</div>
            </div>
            <div className="text-sm text-muted-foreground max-w-xs text-right">{result.summary}</div>
          </div>
          {result.biases.length === 0 ? <div className="text-sm text-center text-muted-foreground py-4">No significant biases detected.</div> : (
            <div className="space-y-2">
              {result.biases.map((b,i) => (
                <div key={i} className="p-3 rounded-xl glass border border-white/8">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-foreground">{b.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{color:severityColor[b.severity]||"oklch(0.75 0.18 55)",background:`${severityColor[b.severity]||"oklch(0.75 0.18 55)"}18`,border:`1px solid ${severityColor[b.severity]||"oklch(0.75 0.18 55)"}44`}}>{b.severity}</span>
                  </div>
                  {b.quote && <div className="text-xs text-muted-foreground italic mb-1 border-l-2 pl-2" style={{borderColor:severityColor[b.severity]||"oklch(0.75 0.18 55)"}}>"{b.quote}"</div>}
                  <div className="text-xs text-foreground/80">{b.explanation}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExperimentModal({ exp, onClose, cookieId }: { exp: typeof experiments[0]; onClose: () => void; cookieId: string }) {
  const content = () => {
    switch (exp.id) {
      case "particle-sim": return <ParticleSimExperiment />;
      case "neural-viz": return <NeuralNetworkExperiment />;
      case "prompt-lab": return <PromptLabExperiment cookieId={cookieId} />;
      case "chain-of-thought": return <ChainOfThoughtExperiment cookieId={cookieId} />;
      case "text-classifier": return <TextClassifierExperiment cookieId={cookieId} />;
      case "ai-debate": return <AIDebateExperiment cookieId={cookieId} />;
      case "image-describer": return <ImageDescriberExperiment cookieId={cookieId} />;
      case "token-counter": return <TokenCounterExperiment cookieId={cookieId} />;
      case "socratic-tutor": return <SocraticTutorExperiment cookieId={cookieId} />;
      case "story-gen": return <StoryGenExperiment cookieId={cookieId} />;
      case "bias-detect": return <BiasDetectorExperiment cookieId={cookieId} />;
      default: return null;
    }
  };
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{scale:0.95,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.95,opacity:0,y:20}} transition={{type:"spring",bounce:0.15}} className="glass-strong rounded-3xl border border-white/15 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{background:`${exp.color}22`,borderColor:`${exp.color}44`}}>
              <exp.icon size={16} style={{color:exp.color}} />
            </div>
            <div><div className="font-bold text-foreground">{exp.title}</div><div className="text-xs text-muted-foreground">{exp.tag}</div></div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{content()}</div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Lab() {
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [activeExperiment, setActiveExperiment] = useState<typeof experiments[0] | null>(null);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState<{type:"success"|"error"|"info";text:string}|null>(null);
  const [running, setRunning] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [completedChallenges, setCompletedChallenges] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"experiments"|"challenges">("experiments");
  const { addXP, cookieId } = usePersonalization();
  const debugMutation = trpc.lab.debugCode.useMutation();

  const openChallenge = (ch: Challenge) => { setActiveChallenge(ch); setCode(ch.starter); setOutput(null); setShowHint(false); setShowSolution(false); };

  const runCode = () => {
    if (!code.trim()) return;
    setRunning(true); setOutput(null);
    try {
      const logs: string[] = [];
      const fn = new Function("console", code);
      fn({ log: (...a: unknown[]) => logs.push(a.map(String).join(" ")), error: (...a: unknown[]) => logs.push("ERROR: "+a.map(String).join(" ")), warn: (...a: unknown[]) => logs.push("WARN: "+a.map(String).join(" ")) });
      setOutput({ type: "success", text: logs.length > 0 ? logs.join("\n") : "✓ Code ran successfully (no output)" });
        if (activeChallenge && !completedChallenges.includes(activeChallenge.id)) {
        setCompletedChallenges(prev => [...prev, activeChallenge.id]);
        addXP(activeChallenge.xpReward);
        toast.success(`+${activeChallenge.xpReward} XP — Challenge complete!`);
      }
    } catch (e) { setOutput({ type: "error", text: String(e) }); }
    finally { setRunning(false); }
  };

  const getAIDebug = async () => {
    if (!code.trim() || !output) return;
    try { const r = await debugMutation.mutateAsync({ cookieId, code, error: output.text }); setOutput({ type: "info", text: r.explanation }); }
    catch { toast.error("AI debug failed."); }
  };

  return (
    <PageWrapper pageName="lab">
      <div className="min-h-screen pt-20">
        <section className="py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-[oklch(0.65_0.22_200_/_0.3)] text-xs text-[oklch(0.75_0.18_200)] mb-4">
                <Cpu size={12} /> Interactive Lab
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">AI <span className="gradient-text">Experiments</span> & Challenges</h1>
              <p className="text-lg text-muted-foreground max-w-2xl">Learn how AI works by interacting with it directly. Run live experiments, explore prompting techniques, and sharpen your coding skills.</p>
            </motion.div>

            <div className="flex gap-2 mb-8">
              {(["experiments","challenges"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all capitalize ${activeTab===tab ? "bg-[oklch(0.65_0.22_200_/_0.2)] border border-[oklch(0.65_0.22_200_/_0.5)] text-[oklch(0.75_0.18_200)]" : "glass border border-white/10 text-muted-foreground hover:text-foreground"}`}>{tab}</button>
              ))}
            </div>

            {activeTab === "experiments" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {experiments.map((exp, i) => (
                  <motion.div key={exp.id} initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.06}} onClick={() => setActiveExperiment(exp)}
                    className="p-6 glass rounded-2xl border border-white/10 hover:border-white/25 cursor-pointer transition-all group" whileHover={{scale:1.01,y:-2}}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{background:`${exp.color}22`,borderColor:`${exp.color}44`}}>
                        <exp.icon size={18} style={{color:exp.color}} />
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full border" style={{color:exp.color,borderColor:`${exp.color}44`,background:`${exp.color}11`}}>{exp.tag}</span>
                    </div>
                    <h3 className="font-bold text-foreground mb-2 group-hover:text-[oklch(0.75_0.18_200)] transition-colors">{exp.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{exp.desc}</p>
                    <div className="flex items-center gap-1 text-xs font-medium" style={{color:exp.color}}>
                      <Play size={11} /> Launch <ChevronRight size={12} className="ml-auto group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {activeTab === "challenges" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">Solve challenges to earn XP. Use the in-browser code editor — no setup required.</p>
                  <span className="text-sm text-muted-foreground">{completedChallenges.length}/{challenges.length} completed</span>
                </div>
                {challenges.map((ch, i) => (
                  <motion.div key={ch.id} initial={{opacity:0,x:-20}} whileInView={{opacity:1,x:0}} viewport={{once:true}} transition={{delay:i*0.06}}
                    className={`flex items-center justify-between p-5 glass rounded-2xl border cursor-pointer transition-all group ${completedChallenges.includes(ch.id) ? "border-[oklch(0.70_0.20_150_/_0.3)]" : "border-white/10 hover:border-white/25"}`}
                    onClick={() => openChallenge(ch)}>
                    <div className="flex items-center gap-4">
                      {completedChallenges.includes(ch.id) ? <CheckCircle size={20} className="text-[oklch(0.70_0.20_150)] flex-shrink-0" /> : <Code2 size={20} className="text-muted-foreground flex-shrink-0" />}
                      <div><div className="font-semibold text-foreground group-hover:text-[oklch(0.75_0.18_200)] transition-colors">{ch.title}</div><div className="text-xs text-muted-foreground mt-0.5">{ch.category}</div></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full border" style={{color:difficultyColors[ch.difficulty],borderColor:`${difficultyColors[ch.difficulty]}44`,background:`${difficultyColors[ch.difficulty]}11`}}>{ch.difficulty}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Zap size={11} /> +{ch.xpReward} XP</span>
                      <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {activeExperiment && <ExperimentModal exp={activeExperiment} onClose={() => setActiveExperiment(null)} cookieId={cookieId} />}
      </AnimatePresence>

      <AnimatePresence>
        {activeChallenge && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setActiveChallenge(null)}>
            <motion.div initial={{scale:0.95,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.95,opacity:0,y:20}} transition={{type:"spring",bounce:0.15}}
              className="glass-strong rounded-3xl border border-white/15 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium" style={{color:difficultyColors[activeChallenge.difficulty]}}>{activeChallenge.difficulty}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{activeChallenge.category}</span>
                  </div>
                  <div className="font-bold text-foreground">{activeChallenge.title}</div>
                </div>
                <button onClick={() => setActiveChallenge(null)} className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <p className="text-sm text-muted-foreground whitespace-pre-line">{activeChallenge.description}</p>
                <div className="relative">
                  <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-muted-foreground"><Terminal size={11} /> JavaScript</div>
                  <textarea value={code} onChange={e => setCode(e.target.value)} rows={12}
                    className="w-full bg-[oklch(0.07_0.01_200)] border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-foreground focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] resize-none" />
                </div>
                {output && (
                  <div className={`rounded-xl px-4 py-3 text-sm font-mono border ${output.type==="success" ? "bg-[oklch(0.70_0.20_150_/_0.1)] border-[oklch(0.70_0.20_150_/_0.3)] text-[oklch(0.70_0.20_150)]" : output.type==="error" ? "bg-[oklch(0.65_0.22_20_/_0.1)] border-[oklch(0.65_0.22_20_/_0.3)] text-[oklch(0.65_0.22_20)]" : "bg-[oklch(0.65_0.22_200_/_0.1)] border-[oklch(0.65_0.22_200_/_0.3)] text-foreground"}`}>
                    <div className="prose prose-sm prose-invert max-w-none"><Streamdown>{output.text}</Streamdown></div>
                  </div>
                )}
                {showHint && <div className="glass rounded-xl border border-[oklch(0.75_0.18_55_/_0.3)] p-4 text-sm text-[oklch(0.75_0.18_55)]"><Lightbulb size={14} className="inline mr-2" />{activeChallenge.hint}</div>}
                {showSolution && <div className="glass rounded-xl border border-white/10 p-4"><div className="text-xs text-muted-foreground mb-2 font-mono uppercase tracking-wider">Solution</div><pre className="text-sm font-mono text-foreground whitespace-pre-wrap">{activeChallenge.solution}</pre></div>}
              </div>
              <div className="px-6 py-4 border-t border-white/10 flex items-center gap-3 flex-wrap">
                <button onClick={runCode} disabled={running} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[oklch(0.65_0.22_200_/_0.2)] border border-[oklch(0.65_0.22_200_/_0.4)] text-sm font-medium hover:bg-[oklch(0.65_0.22_200_/_0.3)] disabled:opacity-50 transition-colors">
                  {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Run Code
                </button>
                {output?.type === "error" && (
                  <button onClick={getAIDebug} disabled={debugMutation.isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg glass border border-white/10 text-sm hover:border-white/25 transition-colors">
                    {debugMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />} AI Debug
                  </button>
                )}
                <button onClick={() => setShowHint(h => !h)} className="flex items-center gap-2 px-4 py-2 rounded-lg glass border border-white/10 text-sm hover:border-white/25 transition-colors">
                  <Lightbulb size={14} /> {showHint ? "Hide" : "Hint"}
                </button>
                <button onClick={() => setShowSolution(s => !s)} className="flex items-center gap-2 px-4 py-2 rounded-lg glass border border-white/10 text-sm hover:border-white/25 transition-colors ml-auto">
                  <Eye size={14} /> {showSolution ? "Hide" : "Solution"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
