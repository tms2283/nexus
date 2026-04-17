import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

type GoogleButtonText = "signin_with" | "signup_with";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleButtonConfiguration = {
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: GoogleButtonText;
  shape?: "pill" | "rectangular" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
};

type GoogleIdConfiguration = {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  context?: "signin" | "signup" | "use";
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
};

type GoogleIdentityApi = {
  accounts?: {
    id?: {
      initialize: (config: GoogleIdConfiguration) => void;
      renderButton: (element: HTMLElement, options: GoogleButtonConfiguration) => void;
      cancel?: () => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

type GoogleSignInButtonProps = {
  mode: "signin" | "signup";
  isLoading?: boolean;
  onCredential: (idToken: string) => void;
};

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google sign-in is only available in the browser."));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );

    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google sign-in.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Google sign-in."));
    document.head.appendChild(script);
  }).catch(error => {
    googleScriptPromise = null;
    throw error;
  });

  return googleScriptPromise;
}

export function GoogleSignInButton({
  mode,
  isLoading = false,
  onCredential,
}: GoogleSignInButtonProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const onCredentialRef = useRef(onCredential);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const buttonText = useMemo<GoogleButtonText>(
    () => (mode === "signup" ? "signup_with" : "signin_with"),
    [mode]
  );

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId) {
      setStatus("error");
      setErrorMessage("Google sign-in is not configured.");
      return;
    }

    let cancelled = false;
    initializedRef.current = false;

    const renderGoogleButton = () => {
      if (cancelled || !containerRef.current) {
        return;
      }

      const googleApi = window.google?.accounts?.id;
      if (!googleApi) {
        setStatus("error");
        setErrorMessage("Google sign-in failed to initialize.");
        return;
      }

      if (!initializedRef.current) {
        googleApi.initialize({
          client_id: clientId,
          context: mode,
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: response => {
            if (!response.credential) {
              setStatus("error");
              setErrorMessage("Google did not return a sign-in token.");
              return;
            }

            onCredentialRef.current(response.credential);
          },
        });
        initializedRef.current = true;
      }

      containerRef.current.innerHTML = "";
      googleApi.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        text: buttonText,
        shape: "pill",
        logo_alignment: "left",
        width: Math.max(Math.floor(containerRef.current.clientWidth), 240),
      });

      setStatus("ready");
      setErrorMessage(null);
    };

    const initialize = async () => {
      try {
        setStatus("loading");
        await loadGoogleIdentityScript();
        renderGoogleButton();
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Google sign-in is unavailable right now."
        );
      }
    };

    initialize();

    const handleResize = () => renderGoogleButton();
    window.addEventListener("resize", handleResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", handleResize);
      window.google?.accounts?.id?.cancel?.();
    };
  }, [buttonText, clientId, mode]);

  return (
    <div className="flex flex-col gap-2">
      <div
        className={[
          "relative min-h-11 overflow-hidden rounded-full border border-white/15 bg-white/5",
          status === "error" ? "border-red-400/40 bg-red-500/10" : "",
          isLoading ? "pointer-events-none opacity-70" : "",
        ].join(" ")}
      >
        <div ref={containerRef} className="min-h-11" />
        {(status === "loading" || isLoading) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="text-xs text-red-300">
          {errorMessage} Make sure this site's URL is allowed in your Google OAuth client.
        </p>
      )}
    </div>
  );
}
