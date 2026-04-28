import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { toast } from "sonner";

interface StarButtonProps {
  topic: string;
  context?: string;
  source?: string;
  type?: "topic" | "question";
  size?: number;
  className?: string;
}

export default function StarButton({ topic, context, source, type = "topic", size = 14, className = "" }: StarButtonProps) {
  const { add, remove, has, bookmarks } = useBookmarks();
  const starred = has(topic);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (starred) {
      const bm = bookmarks.find(b => b.topic === topic);
      if (bm) remove(bm.id);
      toast("Bookmark removed");
    } else {
      add({ topic, context, source, type });
      toast.success("Bookmarked! View in Reading List → Starred Topics");
    }
  };

  return (
    <motion.button
      onClick={toggle}
      whileTap={{ scale: 0.8 }}
      className={`p-1 rounded-md transition-colors ${className}`}
      style={{ color: starred ? "oklch(0.78 0.18 52)" : "oklch(0.45 0.010 255)" }}
      title={starred ? "Remove bookmark" : "Bookmark this topic"}
      aria-label={starred ? "Remove bookmark" : "Bookmark this topic"}
      onMouseEnter={e => { if (!starred) (e.currentTarget as HTMLElement).style.color = "oklch(0.72 0.008 255)"; }}
      onMouseLeave={e => { if (!starred) (e.currentTarget as HTMLElement).style.color = "oklch(0.45 0.010 255)"; }}
    >
      <Star size={size} fill={starred ? "currentColor" : "none"} />
    </motion.button>
  );
}
