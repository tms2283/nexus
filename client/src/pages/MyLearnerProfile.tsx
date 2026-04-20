import { useMemo } from "react";
import PageWrapper from "@/components/PageWrapper";
import { useLearnerProfile } from "@/contexts/LearnerProfileContext";
import { Brain, Compass, Sparkles, Target, TrendingUp, Gauge } from "lucide-react";

const STYLE_LABEL: Record<string, string> = {
  "deep-technical": "Deep technical — you go for precise mechanics",
  visual: "Visual — diagrams and analogies stick first",
  socratic: "Socratic — you learn best by being asked questions",
  "hands-on": "Hands-on — you learn by trying it",
};

const TIER_LABEL: Record<string, string> = {
  intro: "Intro — building foundation",
  core: "Core — at the right stretch",
  stretch: "Stretch — ready for harder material",
};

const READING_LABEL: Record<string, string> = {
  plain: "Plain language",
  standard: "Standard prose",
  technical: "Technical depth",
};

export default function MyLearnerProfile() {
  const { profile, isLoaded } = useLearnerProfile();

  const calibrationCopy = useMemo(() => {
    if (profile.calibrationGap == null) {
      return "We don't have enough confidence-rated answers yet to gauge calibration.";
    }
    if (profile.calibrationGap > 0.15) {
      return "You tend to be more confident than your accuracy warrants — slow down on items you feel sure about.";
    }
    if (profile.calibrationGap < -0.15) {
      return "You tend to underestimate your accuracy — trust your reasoning more.";
    }
    return "Your confidence and accuracy are well-calibrated.";
  }, [profile.calibrationGap]);

  return (
    <PageWrapper pageName="my-learner-profile">
      <div className="min-h-screen pt-20 px-4">
        <div className="max-w-3xl mx-auto py-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 text-sm text-muted-foreground mb-4">
            <Compass size={14} />
            <span>Your learner profile</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            How we're tailoring your lessons
          </h1>
          <p className="text-muted-foreground mb-8">
            This is the model we maintain about you. It is editable, never used
            to compare you to anyone else, and recomputed each session.
          </p>

          {!isLoaded ? (
            <div className="glass rounded-2xl p-6 border border-white/10 text-muted-foreground">
              Loading your profile…
            </div>
          ) : (
            <div className="grid gap-4">
              <Card icon={<Brain size={18} />} title="Learning style">
                <p className="text-foreground">{STYLE_LABEL[profile.inferredLearnStyle] ?? profile.inferredLearnStyle}</p>
              </Card>
              <Card icon={<Sparkles size={18} />} title="Reading depth we serve you">
                <p className="text-foreground">{READING_LABEL[profile.readingLevel]}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Inferred from your background ({profile.inferredBackground}) and interests.
                </p>
              </Card>
              <Card icon={<Target size={18} />} title="Difficulty tier">
                <p className="text-foreground">{TIER_LABEL[profile.suggestedTier]}</p>
                {profile.recentAccuracy != null && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Recent accuracy: {Math.round(profile.recentAccuracy * 100)}%
                  </p>
                )}
              </Card>
              <Card icon={<Gauge size={18} />} title="Confidence calibration">
                <p className="text-foreground">{calibrationCopy}</p>
              </Card>
              <Card icon={<TrendingUp size={18} />} title="What you're here for">
                <p className="text-foreground">{profile.inferredGoal}</p>
                {profile.inferredInterests.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {profile.inferredInterests.slice(0, 12).map(tag => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-5 border border-white/10">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
      </div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}
