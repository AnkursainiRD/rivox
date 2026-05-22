import { useState, useEffect, useRef } from "react";
import { Sun, Moon } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api, setToken } from "../lib/api";
import rivoxMark from "../assets/rivox-mark.svg";
import rivoxMarkInverted from "../assets/rivox-mark-inverted.svg";

const API_BASE = import.meta.env.DEV
  ? "http://localhost:3001/api"
  : "https://rivox-cpbg.onrender.com/api";

interface LoginPageProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onTokenFound: () => void;
}

export function LoginPage({ theme, onToggleTheme, onTokenFound }: LoginPageProps) {
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const sessionRef = useRef<string | null>(null);

  const handleDiscordLogin = async () => {
    setError(null);
    try {
      // 1. Create a pending auth session on the backend
      const { session_id } = await api.post<{ session_id: string }>("/auth/session");
      sessionRef.current = session_id;
      setWaiting(true);

      // 2. Open Discord OAuth in system browser with the session ID
      await openUrl(`${API_BASE}/auth/discord?session=${session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to server");
      console.error("Failed to start login:", err);
    }
  };

  // 3. Poll the backend for the auth result
  useEffect(() => {
    if (!waiting || !sessionRef.current) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get<{ status: string; token?: string }>(
          `/auth/poll?session=${sessionRef.current}`
        );
        if (res.status === "done" && res.token) {
          clearInterval(pollRef.current);
          setToken(res.token);
          setWaiting(false);
          onTokenFound();
        }
      } catch {
        // session expired or error — stop polling
        clearInterval(pollRef.current);
        setWaiting(false);
      }
    }, 1000);

    return () => clearInterval(pollRef.current);
  }, [waiting, onTokenFound]);

  return (
    <div className="flex h-screen bg-app-bg items-center justify-center relative">
      <button
        onClick={onToggleTheme}
        className="absolute top-4 right-4 p-2 rounded-btn text-muted hover:bg-surface-2 transition-colors"
      >
        {theme === "light" ? (
          <Moon size={16} strokeWidth={1.6} />
        ) : (
          <Sun size={16} strokeWidth={1.6} />
        )}
      </button>

      <div className="w-[380px] flex flex-col items-center">
        <img
          src={theme === "dark" ? rivoxMarkInverted : rivoxMark}
          alt="Rivox"
          className="w-16 h-16 rounded-2xl mb-4"
        />
        <h1 className="text-2xl font-semibold text-ink tracking-tight mb-1">
          Welcome to Rivox
        </h1>
        <p className="text-sm text-muted mb-8 text-center">
          Manage API keys, tasks, and team permissions — all in one workspace.
        </p>

        <div className="w-full bg-surface border border-border rounded-card shadow-card p-6">
          <p className="text-sm font-medium text-ink mb-4 text-center">
            Sign in to your workspace
          </p>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-btn bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handleDiscordLogin}
            disabled={waiting}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-btn font-medium text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "#5865F2" }}
          >
            {waiting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Waiting for Discord...
              </>
            ) : (
              <>
                <DiscordIcon />
                Continue with Discord
              </>
            )}
          </button>

          {waiting && (
            <p className="text-[11px] text-muted text-center mt-3">
              Complete sign-in in your browser, then return here.
            </p>
          )}

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email address"
              className="w-full px-3 py-2 text-sm rounded-btn bg-surface-2 border border-border text-ink placeholder:text-muted/50 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
            />
            <button className="w-full px-4 py-2.5 bg-ink text-surface text-sm font-medium rounded-btn hover:opacity-90 transition-opacity">
              Continue with email
            </button>
          </div>
        </div>

        <p className="text-[11px] text-muted mt-5 text-center">
          By continuing, you agree to Rivox's Terms of Service and Privacy
          Policy.
        </p>
      </div>
    </div>
  );
}

function DiscordIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 71 55" fill="none">
      <path
        d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.4 37.4 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 4.9a.2.2 0 00-.1.1C1.5 18.7-.9 32.2.3 45.5v.2a58.9 58.9 0 0017.7 9 .2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.8 38.8 0 01-5.5-2.7.2.2 0 01 0-.4c.4-.3.7-.6 1.1-.9a.2.2 0 01.2 0 42 42 0 0035.6 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .4c-1.8 1-3.6 1.9-5.6 2.6a.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.3.1 58.7 58.7 0 0017.7-9 .2.2 0 00.1-.1c1.4-15-2.3-28.4-9.8-40.1a.2.2 0 00-.1-.1zM23.7 37.3c-3.5 0-6.3-3.2-6.3-7.1 0-3.9 2.8-7.1 6.3-7.1 3.6 0 6.4 3.2 6.3 7.1 0 3.9-2.8 7.1-6.3 7.1zm23.2 0c-3.5 0-6.3-3.2-6.3-7.1 0-3.9 2.8-7.1 6.3-7.1 3.6 0 6.4 3.2 6.3 7.1 0 3.9-2.7 7.1-6.3 7.1z"
        fill="currentColor"
      />
    </svg>
  );
}
