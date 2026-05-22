import { useState, useEffect, useCallback } from "react";
import { api, setToken, clearToken } from "../lib/api";

export interface User {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
  role: "super_admin" | "admin" | "user";
  discord_id?: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  OrgMember?: { role: string };
}

interface MeResponse {
  user: User;
  organizations: Organization[];
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const data = await api.get<MeResponse>("/auth/me");
      setUser(data.user);
      setOrgs(data.organizations);

      // Restore or pick first org
      const savedOrgId = localStorage.getItem("rivox-active-org");
      const found = data.organizations.find((o) => o.id === savedOrgId);
      setActiveOrg(found || data.organizations[0] || null);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("rivox-token");
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  const loginWithToken = useCallback(
    async (token: string) => {
      setToken(token);
      await fetchMe();
    },
    [fetchMe]
  );

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem("rivox-active-org");
    setUser(null);
    setOrgs([]);
    setActiveOrg(null);
  }, []);

  const switchOrg = useCallback(
    (org: Organization) => {
      setActiveOrg(org);
      localStorage.setItem("rivox-active-org", org.id);
    },
    []
  );

  return { user, orgs, activeOrg, loading, loginWithToken, logout, switchOrg };
}
