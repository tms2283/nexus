import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

type TourContextType = {
  showMainTour: boolean;
  showPageTour: boolean;
  openMainTour: () => void;
  openPageTour: () => void;
  closeMainTour: () => void;
  closePageTour: () => void;
};

const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const [showMainTour, setShowMainTour] = useState(false);
  const [showPageTour, setShowPageTour] = useState(false);

  return (
    <TourContext.Provider value={{
      showMainTour,
      showPageTour,
      openMainTour: () => { setShowPageTour(false); setShowMainTour(true); },
      openPageTour: () => { setShowMainTour(false); setShowPageTour(true); },
      closeMainTour: () => setShowMainTour(false),
      closePageTour: () => setShowPageTour(false),
    }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
}
