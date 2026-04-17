import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface EditModeContextValue {
  isEditMode: boolean;
  setIsEditMode: (next: boolean) => void;
  toggleEditMode: () => void;
}

const EDIT_MODE_KEY = "nexus_edit_mode";

const EditModeContext = createContext<EditModeContextValue>({
  isEditMode: false,
  setIsEditMode: () => {},
  toggleEditMode: () => {},
});

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(EDIT_MODE_KEY);
    if (stored === "true") {
      setIsEditMode(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(EDIT_MODE_KEY, isEditMode ? "true" : "false");
    document.body.dataset.editMode = isEditMode ? "true" : "false";
    return () => {
      delete document.body.dataset.editMode;
    };
  }, [isEditMode]);

  return (
    <EditModeContext.Provider
      value={{
        isEditMode,
        setIsEditMode,
        toggleEditMode: () => setIsEditMode((current) => !current),
      }}
    >
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  return useContext(EditModeContext);
}
