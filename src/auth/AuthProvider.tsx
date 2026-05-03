import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./authContext";
import type { User } from "./authContext";
import { writeAuditLog } from "../services/auditLogService";

type Props = {
  children: ReactNode;
};

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(() => {
    const isLoggedOut =
      sessionStorage.getItem("cct:logged-out") === "true";

    if (isLoggedOut) {
      return null;
    }

    const savedRole =
      (sessionStorage.getItem("cct:demo-role") as User["role"]) ?? "analyst";

    if (!sessionStorage.getItem("cct:last-login")) {
      sessionStorage.setItem(
        "cct:last-login",
        new Date().toISOString()
      );
    }

    return {
      id: `demo-${savedRole}`,
      name: savedRole === "manager" ? "Erin Parker" : "Sasha Harper",
      role: savedRole,
    };
  });

  function login(user: User) {
    sessionStorage.removeItem("cct:logged-out");
    sessionStorage.setItem("cct:last-login", new Date().toISOString());
    sessionStorage.setItem("cct:demo-role", user.role);
    setUser(user);
    writeAuditLog({
      actor: user.id,
      actorRole: user.role,
      action: "LOGIN",
      target: user.id,
      outcome: "SUCCESS",
      context: "User login",
      details: { role: user.role },
    });
  }

  function logout() {
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
    sessionStorage.setItem("cct:logged-out", "true");
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
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
