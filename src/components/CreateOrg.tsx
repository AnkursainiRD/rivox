import { useState } from "react";
import { Building2, ArrowRight } from "lucide-react";
import { api } from "../lib/api";

interface CreateOrgProps {
  onCreated: () => void;
}

export function CreateOrg({ onCreated }: CreateOrgProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await api.post("/orgs", { name: name.trim(), slug: slug.trim() });
      onCreated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create organization"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-[400px]">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-5">
            <Building2 size={24} strokeWidth={1.6} className="text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-ink tracking-tight mb-2">
            Create your workspace
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            Workspaces are where your team manages API keys, tasks, and issues
            together.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-surface border border-border rounded-card shadow-card p-6 space-y-5"
        >
          {error && (
            <div className="px-3 py-2.5 rounded-btn bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="text-[13px] font-medium text-ink mb-1.5 block">
              Workspace name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. YourGPT, MCP360, Marketing"
              className="w-full px-3.5 py-2.5 text-sm rounded-btn bg-surface-2 border border-border text-ink placeholder:text-muted/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[13px] font-medium text-ink mb-1.5 block">
              URL slug
            </label>
            <div className="flex items-center bg-surface-2 border border-border rounded-btn overflow-hidden focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all">
              <span className="pl-3.5 pr-1 text-sm text-muted/60 shrink-0 select-none">
                rivox.app/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) =>
                  setSlug(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                  )
                }
                placeholder="your-team"
                className="w-full pr-3.5 py-2.5 text-sm bg-transparent text-ink placeholder:text-muted/40 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim() || !slug.trim()}
            className="w-full px-4 py-2.5 bg-accent text-white text-sm font-medium rounded-btn hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Get started
                <ArrowRight size={14} strokeWidth={2} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
