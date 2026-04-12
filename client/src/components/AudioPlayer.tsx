import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Download, ChevronDown, ChevronUp, SkipBack, Volume2 } from "lucide-react";

interface AudioPlayerProps {
  audioUrl: string;
  transcript?: string;
  durationSeconds?: number;
  title?: string;
}

export default function AudioPlayer({ audioUrl, transcript, durationSeconds, title }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds ?? 0);
  const [speed, setSpeed] = useState(1);
  const [showTranscript, setShowTranscript] = useState(false);
  const speeds = [0.75, 1, 1.25, 1.5];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
  };

  const cycleSpeed = () => {
    const audio = audioRef.current;
    const idx = speeds.indexOf(speed);
    const next = speeds[(idx + 1) % speeds.length];
    setSpeed(next);
    if (audio) audio.playbackRate = next;
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl border border-[oklch(0.65_0.22_200_/_0.25)] p-4 space-y-3"
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {title && (
        <div className="flex items-center gap-2">
          <Volume2 size={14} className="text-[oklch(0.65_0.22_200)]" />
          <span className="text-xs font-semibold text-[oklch(0.65_0.22_200)] uppercase tracking-wider">Audio Overview</span>
          <span className="text-xs text-muted-foreground truncate">— {title}</span>
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1.5 bg-white/8 rounded-full cursor-pointer overflow-hidden" onClick={seek}>
        <motion.div
          className="h-full bg-gradient-to-r from-[oklch(0.65_0.22_200)] to-[oklch(0.72_0.2_290)] rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-mono">{fmt(currentTime)}</span>
        <div className="flex items-center gap-3">
          <button onClick={restart} className="text-muted-foreground hover:text-foreground transition-colors">
            <SkipBack size={14} />
          </button>
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-[oklch(0.65_0.22_200_/_0.15)] border border-[oklch(0.65_0.22_200_/_0.3)] flex items-center justify-center text-[oklch(0.75_0.22_200)] hover:bg-[oklch(0.65_0.22_200_/_0.25)] transition-all"
          >
            {playing ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
          </button>
          <button onClick={cycleSpeed} className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors w-8 text-center">
            {speed}×
          </button>
        </div>
        <span className="text-xs text-muted-foreground font-mono">{duration > 0 ? fmt(duration) : durationSeconds ? fmt(durationSeconds) : "--:--"}</span>
      </div>

      <div className="flex items-center gap-2">
        {transcript && (
          <button onClick={() => setShowTranscript(!showTranscript)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {showTranscript ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Transcript
          </button>
        )}
        <a href={audioUrl} download className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto">
          <Download size={12} /> Download MP3
        </a>
      </div>

      <AnimatePresence>
        {showTranscript && transcript && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/8 pt-3 overflow-hidden"
          >
            <div className="max-h-48 overflow-y-auto text-xs text-muted-foreground leading-relaxed space-y-1.5 pr-1">
              {transcript.split("\n").map((line, i) => {
                const isAlex = line.startsWith("Alex:");
                const isMorgan = line.startsWith("Morgan:");
                return (
                  <p key={i} className={isAlex ? "text-[oklch(0.75_0.22_200_/_0.9)]" : isMorgan ? "text-foreground/70" : ""}>
                    {line}
                  </p>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
