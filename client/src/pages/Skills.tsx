import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Star, ChevronDown, ChevronUp, Zap, Brain, Target } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";
import { Link } from "wouter";

const LEVEL_LABELS = ["Locked", "Novice", "Apprentice", "Journeyman", "Expert"];
const LEVEL_COLORS = [
  "oklch(0.40 0.02 260)",
  "oklch(0.72 0.18 150)",
  "oklch(0.65 0.22 200)",
  "oklch(0.75 0.18 55)",
  "oklch(0.78 0.22 30)",
];

function SkillBar({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5 mt-1">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i <= level ? LEVEL_COLORS[level] : "oklch(0.20 0.01 260)" }} />
      ))}
    </div>
  );
}

function SkillCard({ skill, onSelect }: { skill: any; onSelect: () => void }) {
  const levelLabel = LEVEL_LABELS[skill.level] ?? "Locked";
  const levelColor = LEVEL_COLORS[skill.level] ?? LEVEL_COLORS[0];
  const isLocked = !skill.unlocked && skill.level === 0;

  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: isLocked ? 1 : 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full text-left p-4 rounded-xl border transition-all ${isLocked ? "border-white/5 opacity-50 cursor-default" : "glass border-white/8 hover:border-white/15 cursor-pointer"}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-medium text-foreground leading-snug">{skill.label}</span>
        {isLocked ? (
          <Lock size={12} className="text-muted-foreground mt-0.5 flex-shrink-0" />
        ) : (
          <span className="text-xs font-medium flex-shrink-0" style={{ color: levelColor }}>{levelLabel}</span>
        )}
      </div>
      <SkillBar level={skill.level} />
      {skill.evidenceCount > 0 && (
        <p className="text-xs text-muted-foreground mt-1.5">{skill.evidenceCount} evidence item{skill.evidenceCount !== 1 ? "s" : ""}</p>
      )}
    </motion.button>
  );
}

export default function Skills() {
  const { cookieId } = usePersonalization();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<any | null>(null);

  const treeQuery = trpc.skills.getTree.useQuery(
    { cookieId: cookieId ?? "" },
    { enabled: !!cookieId }
  );

  const domains = treeQuery.data?.domains ?? [];
  const skills = treeQuery.data?.skills ?? [];

  const activeDomain = selectedDomain ?? (domains[0]?.id ?? "");
  const domainSkills = skills.filter(s => s.domain === activeDomain);
  const masteredCount = skills.filter(s => s.level >= 3).length;
  const totalUnlocked = skills.filter(s => s.unlocked || s.level > 0).length;

  return (
    <PageWrapper pageName="skills">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[oklch(0.75_0.18_55_/_0.15)] border border-[oklch(0.75_0.18_55_/_0.3)] flex items-center justify-center">
              <Brain size={18} className="text-[oklch(0.75_0.18_55)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Skill Tree</h1>
              <p className="text-sm text-muted-foreground">
                {totalUnlocked} skills unlocked · {masteredCount} mastered across {domains.length} domains
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Skills are automatically leveled up as you complete tests, lessons, and research sessions. Complete topics related to a skill to earn evidence and advance your level.
          </p>
        </motion.div>

        {treeQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="glass rounded-xl h-32 border border-white/5 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Domain sidebar */}
            <div className="space-y-1">
              {domains.map(domain => {
                const domSkills = skills.filter(s => s.domain === domain.id);
                const domMastered = domSkills.filter(s => s.level >= 2).length;
                const isActive = activeDomain === domain.id;
                return (
                  <button
                    key={domain.id}
                    onClick={() => { setSelectedDomain(domain.id); setSelectedSkill(null); }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${isActive ? "glass border border-white/12 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/3"}`}
                  >
                    <div className="font-medium mb-0.5" style={{ color: isActive ? domain.color : undefined }}>{domain.label}</div>
                    <div className="text-xs text-muted-foreground">{domMastered}/{domSkills.length} progressed</div>
                  </button>
                );
              })}
            </div>

            {/* Skills grid */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {domainSkills.map(skill => (
                  <SkillCard key={skill.id} skill={skill} onSelect={() => setSelectedSkill(selectedSkill?.id === skill.id ? null : skill)} />
                ))}
              </div>
            </div>

            {/* Skill detail panel */}
            <div>
              <AnimatePresence mode="wait">
                {selectedSkill ? (
                  <motion.div
                    key={selectedSkill.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="glass rounded-2xl border border-white/8 p-5 sticky top-20"
                  >
                    <h3 className="font-bold text-foreground mb-1">{selectedSkill.label}</h3>
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{selectedSkill.description}</p>

                    <div className="mb-4">
                      <div className="text-xs text-muted-foreground mb-1">Current level</div>
                      <div className="text-lg font-bold" style={{ color: LEVEL_COLORS[selectedSkill.level] }}>
                        {LEVEL_LABELS[selectedSkill.level]}
                      </div>
                      <SkillBar level={selectedSkill.level} />
                    </div>

                    {selectedSkill.prerequisites.length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs text-muted-foreground mb-2">Prerequisites</div>
                        <div className="space-y-1">
                          {selectedSkill.prerequisites.map((pid: string) => {
                            const prereq = skills.find(s => s.id === pid);
                            if (!prereq) return null;
                            return (
                              <div key={pid} className="flex items-center gap-2 text-xs">
                                <div className={`w-2 h-2 rounded-full`} style={{ background: LEVEL_COLORS[prereq.level] }} />
                                <span className={prereq.level >= 1 ? "text-foreground" : "text-muted-foreground"}>{prereq.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="mb-4">
                      <div className="text-xs text-muted-foreground mb-2">Related topics</div>
                      <div className="flex flex-wrap gap-1">
                        {selectedSkill.topicTags.slice(0, 5).map((tag: string) => (
                          <span key={tag} className="text-xs bg-white/5 border border-white/8 px-2 py-0.5 rounded-full text-muted-foreground">{tag}</span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Link href="/testing">
                        <button className="w-full py-2 rounded-lg bg-[oklch(0.75_0.18_55_/_0.12)] border border-[oklch(0.75_0.18_55_/_0.25)] text-xs font-medium text-[oklch(0.75_0.18_55)] hover:bg-[oklch(0.75_0.18_55_/_0.2)] transition-colors">
                          Take a test to level up
                        </button>
                      </Link>
                      <Link href="/learn">
                        <button className="w-full py-2 rounded-lg glass border border-white/8 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                          Find related lessons
                        </button>
                      </Link>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass rounded-2xl border border-white/5 p-5 text-center"
                  >
                    <Target size={28} className="mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Select a skill to see details, prerequisites, and how to level up.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
