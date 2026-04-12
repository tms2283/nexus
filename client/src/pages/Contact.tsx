import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Loader2, CheckCircle, Github, Linkedin, Twitter, Mail } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";
import { toast } from "sonner";

const socials = [
  { icon: Github, label: "GitHub", href: "https://github.com", desc: "Code & open source" },
  { icon: Linkedin, label: "LinkedIn", href: "https://linkedin.com", desc: "Professional network" },
  { icon: Twitter, label: "Twitter / X", href: "https://x.com", desc: "Thoughts & updates" },
  { icon: Mail, label: "Email", href: "mailto:tim@nexuslearn.dev", desc: "Direct contact" },
];

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [composingIntent, setComposingIntent] = useState("");
  const [composingContext, setComposingContext] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [composing, setComposing] = useState(false);
  const { cookieId } = usePersonalization();

  const submitMutation = trpc.contact.submit.useMutation();
  const composeMutation = trpc.ai.composeMessage.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in all required fields.");
      return;
    }
    submitMutation.mutate(
      { ...form, cookieId },
      {
        onSuccess: () => {
          setSubmitted(true);
          toast.success("Message sent!", { description: "I'll get back to you soon." });
        },
        onError: () => toast.error("Failed to send. Please try again."),
      }
    );
  };

  const handleCompose = () => {
    if (!composingIntent.trim()) return;
    setComposing(true);
    composeMutation.mutate(
      { intent: composingIntent, context: composingContext },
      {
        onSuccess: (data) => {
          setForm(prev => ({ ...prev, message: data.draft }));
          setShowComposer(false);
          setComposing(false);
          toast.success("Message drafted by AI", { description: "Feel free to edit it." });
        },
        onError: () => { setComposing(false); toast.error("Composition failed."); },
      }
    );
  };

  return (
    <PageWrapper pageName="contact">
      {/* Header */}
      <section className="py-24 border-b border-white/5">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-8">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[oklch(0.75_0.18_55)]" />
            <span className="text-[oklch(0.75_0.18_55)] text-sm font-medium tracking-widest uppercase">Contact</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Let's <span className="text-gradient-gold">Connect.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg text-muted-foreground max-w-2xl">
            Whether you're evaluating for a project, exploring collaboration, or just want to talk about ideas — I'm here.
          </motion.p>
        </div>
      </section>

      <section className="py-16">
        <div className="container">
          <div className="grid md:grid-cols-5 gap-12">
            {/* Form */}
            <div className="md:col-span-3">
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-24 text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-[oklch(0.70_0.20_150_/_0.15)] border border-[oklch(0.70_0.20_150_/_0.3)] flex items-center justify-center mb-6">
                      <CheckCircle size={28} className="text-[oklch(0.70_0.20_150)]" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-3">Message Received</h2>
                    <p className="text-muted-foreground max-w-sm">Thanks for reaching out. I'll review your message and get back to you within 24-48 hours.</p>
                  </motion.div>
                ) : (
                  <motion.form key="form" onSubmit={handleSubmit} className="space-y-5">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-foreground">Send a Message</h2>
                      <motion.button
                        type="button"
                        onClick={() => setShowComposer(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl glass border border-[oklch(0.65_0.22_290_/_0.3)] text-[oklch(0.75_0.18_290)] text-sm hover:border-[oklch(0.65_0.22_290_/_0.5)] transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Sparkles size={13} /> AI Compose
                      </motion.button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Name *</label>
                        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your name" className="w-full px-4 py-3 glass rounded-xl border border-white/15 focus:border-white/30 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Email *</label>
                        <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" className="w-full px-4 py-3 glass rounded-xl border border-white/15 focus:border-white/30 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors" required />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Subject</label>
                      <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="What's this about?" className="w-full px-4 py-3 glass rounded-xl border border-white/15 focus:border-white/30 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors" />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Message *</label>
                      <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Tell me what you have in mind..." rows={6} className="w-full px-4 py-3 glass rounded-xl border border-white/15 focus:border-white/30 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors resize-none leading-relaxed" required />
                    </div>

                    <motion.button
                      type="submit"
                      disabled={submitMutation.isPending}
                      className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[oklch(0.75_0.18_55)] text-[oklch(0.08_0.015_260)] font-semibold text-sm hover:bg-[oklch(0.80_0.18_55)] disabled:opacity-50 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {submitMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                      {submitMutation.isPending ? "Sending..." : "Send Message"}
                    </motion.button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Sidebar */}
            <div className="md:col-span-2 space-y-8">
              <div>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Find Me Online</h3>
                <div className="space-y-3">
                  {socials.map((social, i) => (
                    <motion.a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-center gap-3 p-4 glass rounded-xl border border-white/10 hover:border-white/25 transition-all group"
                      whileHover={{ scale: 1.02, x: 3 }}
                    >
                      <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                        <social.icon size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{social.label}</div>
                        <div className="text-xs text-muted-foreground">{social.desc}</div>
                      </div>
                    </motion.a>
                  ))}
                </div>
              </div>

              <div className="p-5 glass rounded-2xl border border-[oklch(0.75_0.18_55_/_0.2)]">
                <h3 className="text-sm font-semibold text-foreground mb-2">Response Time</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">I typically respond within 24-48 hours. For urgent matters, LinkedIn is the fastest channel.</p>
              </div>

              <div className="p-5 glass rounded-2xl border border-white/10">
                <h3 className="text-sm font-semibold text-foreground mb-2">Open To</h3>
                <div className="space-y-1.5">
                  {["Full-time senior/staff roles", "Contract & consulting work", "Technical advisory", "Speaking & writing", "Open source collaboration"].map(item => (
                    <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1 h-1 rounded-full bg-[oklch(0.70_0.20_150)]" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Composer Modal */}
      <AnimatePresence>
        {showComposer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowComposer(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", bounce: 0.2 }}
              className="glass-strong rounded-3xl border border-[oklch(0.65_0.22_290_/_0.3)] p-8 max-w-md w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-6">
                <Sparkles size={18} className="text-[oklch(0.65_0.22_290)]" />
                <h2 className="text-xl font-bold text-foreground">AI Message Composer</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">What's your intent? *</label>
                  <input
                    value={composingIntent}
                    onChange={e => setComposingIntent(e.target.value)}
                    placeholder="e.g., I want to discuss a potential collaboration on an AI project"
                    className="w-full px-4 py-3 glass rounded-xl border border-white/15 focus:border-[oklch(0.65_0.22_290_/_0.4)] text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Additional context (optional)</label>
                  <textarea
                    value={composingContext}
                    onChange={e => setComposingContext(e.target.value)}
                    placeholder="Any relevant details about your project, timeline, or background..."
                    rows={3}
                    className="w-full px-4 py-3 glass rounded-xl border border-white/15 focus:border-[oklch(0.65_0.22_290_/_0.4)] text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <motion.button
                  onClick={handleCompose}
                  disabled={!composingIntent.trim() || composing}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[oklch(0.65_0.22_290_/_0.2)] border border-[oklch(0.65_0.22_290_/_0.4)] text-[oklch(0.75_0.18_290)] text-sm font-medium hover:bg-[oklch(0.65_0.22_290_/_0.3)] disabled:opacity-50 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {composing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {composing ? "Composing..." : "Generate Draft"}
                </motion.button>
                <button onClick={() => setShowComposer(false)} className="px-4 py-3 rounded-xl glass border border-white/15 text-muted-foreground text-sm hover:text-foreground transition-colors">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
