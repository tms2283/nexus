import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Bot, Minimize2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import { Streamdown } from "streamdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello. I'm Nexus AI — your guide through this learning platform. Ask me anything about the platform's features, learning topics, or how to get started. I'm here to help.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { cookieId, profile, addXP } = usePersonalization();

  const chatMutation = trpc.ai.chat.useMutation();

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: text, timestamp: new Date() }]);
    setIsTyping(true);

    try {
      const result = await chatMutation.mutateAsync({
        cookieId,
        message: text,
        profile: {
          visitCount: profile.visitCount,
          pagesVisited: profile.pagesVisited,
          preferredTopics: profile.preferredTopics,
          xp: profile.xp,
          level: profile.level,
        },
      });

      setMessages(prev => [...prev, {
        role: "assistant",
        content: result.response,
        timestamp: new Date(),
      }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit = msg.toLowerCase().includes("busy") || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: isRateLimit
          ? "The AI service is temporarily busy. Please wait a moment and try again, or switch to a different AI provider in **Settings → AI Provider**."
          : "I encountered an issue processing that. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] glass-strong rounded-2xl border border-[oklch(0.65_0.22_200_/_0.3)] shadow-2xl shadow-black/50 flex flex-col overflow-hidden"
            style={{ height: "520px" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[oklch(0.65_0.22_200_/_0.08)]">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[oklch(0.65_0.22_200_/_0.4)] to-[oklch(0.65_0.22_290_/_0.3)] flex items-center justify-center border border-[oklch(0.65_0.22_200_/_0.3)]">
                    <Bot size={15} className="text-[oklch(0.75_0.18_200)]" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[oklch(0.70_0.20_150)] border-2 border-background" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground">Nexus AI</div>
                  <div className="text-xs text-muted-foreground">Nexus AI Assistant</div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
              >
                <Minimize2 size={15} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "chat-message-user rounded-br-sm text-foreground"
                        : "chat-message-ai rounded-bl-sm text-foreground"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm prose-invert max-w-none">
                        <Streamdown>{msg.content}</Streamdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="chat-message-ai rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1 items-center h-4">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-[oklch(0.65_0.22_200)]"
                          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-white/10">
              <div className="flex items-center gap-2 glass rounded-xl px-3 py-2 border border-white/10 focus-within:border-[oklch(0.65_0.22_200_/_0.4)] transition-colors">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  disabled={isTyping}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isTyping}
                  className="p-1.5 rounded-lg bg-[oklch(0.65_0.22_200_/_0.2)] hover:bg-[oklch(0.65_0.22_200_/_0.35)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-[oklch(0.75_0.18_200)]"
                >
                  {isTyping ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Context-aware · Multi-provider AI
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all ${
          isOpen
            ? "bg-[oklch(0.65_0.22_200_/_0.3)] border border-[oklch(0.65_0.22_200_/_0.5)]"
            : "bg-gradient-to-br from-[oklch(0.65_0.22_200_/_0.4)] to-[oklch(0.65_0.22_290_/_0.3)] border border-[oklch(0.65_0.22_200_/_0.4)] hover:border-[oklch(0.65_0.22_200_/_0.7)] glow-cyan"
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X size={22} className="text-[oklch(0.75_0.18_200)]" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageCircle size={22} className="text-[oklch(0.75_0.18_200)]" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
