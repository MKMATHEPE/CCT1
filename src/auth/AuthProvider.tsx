import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./authContext";
import type { User } from "./authContext";
import { writeAuditLog } from "../services/auditLogService";
import {
  clearStoredSession,
  getStoredSessionUser,
  storeSession,
  type StoredSession,
} from "./sessionUser";
import { fetchCurrentSession, logoutSession } from "../services/authService";

type Props = {
  children: ReactNode;
};

export function AuthProvider({ children }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(() => {
    return getStoredSessionUser();
  });

  useEffect(() => {
    let isActive = true;

    async function restoreSession() {
      const nextUser = await fetchCurrentSession();

      if (!isActive) {
        return;
      }

      if (!nextUser) {
        clearStoredSession();
        setUser(null);
      } else {
        setUser(nextUser);
      }

      setIsLoading(false);
    }

    void restoreSession();

    return () => {
      isActive = false;
    };
  }, []);

  function login(session: StoredSession) {
    storeSession(session);
    setUser(session.user);
    writeAuditLog({
      actor: session.user.id,
      actorRole: session.user.role,
      action: "LOGIN",
      target: session.user.id,
      outcome: "SUCCESS",
      context: "User login",
      details: { role: session.user.role },
    });
  }

  async function logout() {
    if (user) {
      writeAuditLog({
        actor: user.id,
        actorRole: user.role,
        action: "LOGOUT",
        target: user.id,
        outcome: "SUCCESS",
        context: "User logout",
      });
    }
    await logoutSession();
    clearStoredSession();
    setUser(null);
  }

  useEffect(() => {
    if (!user) return;
    const key = `cct:role-context-${user.id}`;
    if (sessionStorage.getItem(key) === "true") return;
    writeAuditLog({
      actor: user.id,
      actorRole: user.role,
      action: "ROLE_CONTEXT_LOADED",
      target: user.id,
      outcome: "SUCCESS",
      context: "Role context loaded for session",
      details: { role: user.role },
    });
    sessionStorage.setItem(key, "true");
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
