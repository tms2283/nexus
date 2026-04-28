export type FeaturedPath = {
  title: string;
  level: string;
  duration: string;
  modules: number;
  category: string;
  color: string;
  popular: boolean;
  href?: string;
};

export const featuredPaths: FeaturedPath[] = [
  { title: "Cognitive Science & Learning", level: "Intermediate", duration: "8 weeks", modules: 10, category: "Science", color: "oklch(0.75_0.18_55)", popular: false },
  { title: "Entrepreneurship & Product", level: "Beginner", duration: "6 weeks", modules: 9, category: "Business", color: "oklch(0.65_0.22_200)", popular: false },
  { title: "Philosophy & Critical Thinking", level: "Beginner", duration: "6 weeks", modules: 8, category: "Humanities", color: "oklch(0.78_0.16_30)", popular: false },
  { title: "Behavioral Economics", level: "Intermediate", duration: "7 weeks", modules: 10, category: "Economics", color: "oklch(0.72_0.18_150)", popular: false },
  { title: "Neuroscience & the Brain", level: "Beginner", duration: "8 weeks", modules: 11, category: "Science", color: "oklch(0.72_0.2_290)", popular: false },
  { title: "Quantum Physics Explained", level: "Intermediate", duration: "10 weeks", modules: 13, category: "Physics", color: "oklch(0.65_0.22_200)", popular: false },
  { title: "Creative Writing & Storytelling", level: "Beginner", duration: "5 weeks", modules: 7, category: "Arts", color: "oklch(0.75_0.18_55)", popular: false },
  { title: "Public Speaking & Rhetoric", level: "Beginner", duration: "4 weeks", modules: 6, category: "Communication", color: "oklch(0.78_0.16_30)", popular: false },
  { title: "History of Science & Ideas", level: "Beginner", duration: "9 weeks", modules: 12, category: "History", color: "oklch(0.72_0.18_150)", popular: false },
  { title: "Ethics of Artificial Intelligence", level: "Beginner", duration: "5 weeks", modules: 7, category: "AI", color: "oklch(0.72_0.2_290)", popular: false },
];
