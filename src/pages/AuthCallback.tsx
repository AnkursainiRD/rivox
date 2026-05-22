import { useEffect, useState } from "react";
import { setToken } from "../lib/api";

export function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const errParam = params.get("error");

    if (errParam) {
      setError(`Authentication failed: ${errParam}`);
      return;
    }

    if (token) {
      // Save token to localStorage — the Tauri webview polls for this
      setToken(token);
      setDone(true);
    } else {
      setError("No token received.");
    }
  }, []);

  return (
    <div className="flex h-screen bg-app-bg items-center justify-center">
      {error ? (
        <div className="text-center">
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-4 py-2 bg-ink text-surface text-sm font-medium rounded-btn hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
        </div>
      ) : done ? (
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-ink mb-1">Signed in to Rivox</h2>
          <p className="text-sm text-muted">You can close this tab and return to the app.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-sm text-muted">Signing in...</p>
        </div>
      )}
    </div>
  );
}
