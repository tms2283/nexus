import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Brain, Loader2, MessageSquare, RotateCcw, Send } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import { trpc } from "@/lib/trpc";

interface SocraticMessage {
  role: "tutor" | "student";
  content: string;
}

export default function SocraticTutor() {
  const [topic, setTopic] = useState("");
  const [messages, setMessages] = useState<SocraticMessage[]>([]);
  const [input, setInput] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { addXP } = usePersonalization();

  const startSession = trpc.ai.startSocraticSession.useMutation({
    onSuccess: data => {
      setMessages([{ role: "tutor", content: data.question }]);
      setIsActive(true);
      setIsLoading(false);
      addXP(10);
    },
    onError: (err: { message: string }) => {
      toast.error(err.message);
      setIsLoading(false);
    },
  });

  const continueSession = trpc.ai.continueSocraticSession.useMutation({
    onSuccess: data => {
      setMessages(prev => [...prev, { role: "tutor", content: data.response }]);
      setIsLoading(false);
    },
    onError: (err: { message: string }) => {
      toast.error(err.message);
      setIsLoading(false);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStart = () => {
    if (!topic.trim()) {
      toast.error("Enter a topic first.");
      return;
    }
    setIsLoading(true);
    startSession.mutate({ topic, userLevel: "intermediate" });
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "student", content: userMsg }]);
    setIsLoading(true);
    continueSession.mutate({
      topic,
      history: [...messages, { role: "student", content: userMsg }],
      userResponse: userMsg,
    });
  };

  const handleReset = () => {
    setMessages([]);
    setIsActive(false);
    setTopic("");
    setInput("");
  };

  return (
    <div className="space-y-6">
      {!isActive ? (
        <div className="glass rounded-2xl p-8 border border-white/8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[oklch(0.65_0.22_200_/_0.15)] border border-[oklch(0.65_0.22_200_/_0.3)] flex items-center justify-center">
              <MessageSquare size={18} className="text-[oklch(0.65_0.22_200)]" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Socratic Mode</h3>
              <p className="text-xs text-muted-foreground">
                The AI will ask questions until you discover the answer yourself.
              </p>
            </div>
          </div>

          <div className="glass rounded-xl p-4 border border-[oklch(0.65_0.22_200_/_0.15)] mb-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="text-[oklch(0.65_0.22_200)] font-medium">How it works:</span>{" "}
              Pick a topic. The AI tutor asks probing questions, reframes when you get
              stuck, and helps you reason your way forward instead of handing over an
              answer.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                What concept do you want to explore?
              </label>
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleStart()}
                placeholder="e.g. recursion, supply and demand, quantum entanglement"
                className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] transition-colors"
              />
            </div>
            <motion.button
              onClick={handleStart}
              disabled={isLoading || !topic.trim()}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[oklch(0.65_0.22_200)] to-[oklch(0.72_0.2_290)] text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Starting session...
                </>
              ) : (
                <>
                  <Brain size={16} /> Begin Socratic Session
                </>
              )}
            </motion.button>
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl border border-white/8 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[oklch(0.65_0.22_200)] animate-pulse" />
              <span className="text-sm font-medium text-foreground">
                Socratic Session: <span className="text-[oklch(0.65_0.22_200)]">{topic}</span>
              </span>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw size={12} /> New topic
            </button>
          </div>

          <div className="h-80 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "student" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    msg.role === "tutor"
                      ? "bg-[oklch(0.65_0.22_200_/_0.2)] text-[oklch(0.65_0.22_200)]"
                      : "bg-[oklch(0.75_0.18_55_/_0.2)] text-[oklch(0.75_0.18_55)]"
                  }`}
                >
                  {msg.role === "tutor" ? "S" : "Y"}
                </div>
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "tutor"
                      ? "bg-white/5 border border-white/8 text-foreground"
                      : "bg-[oklch(0.75_0.18_55_/_0.12)] border border-[oklch(0.75_0.18_55_/_0.2)] text-foreground"
                  }`}
                >
                  <Streamdown>{msg.content}</Streamdown>
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[oklch(0.65_0.22_200_/_0.2)] flex items-center justify-center text-xs font-bold text-[oklch(0.65_0.22_200)]">
                  S
                </div>
                <div className="bg-white/5 border border-white/8 rounded-xl px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-6 py-4 border-t border-white/5 flex gap-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Think it through and respond..."
              className="flex-1 bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] transition-colors"
            />
            <motion.button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-xl bg-[oklch(0.65_0.22_200)] flex items-center justify-center disabled:opacity-50 shrink-0"
            >
              <Send size={15} className="text-white" />
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
