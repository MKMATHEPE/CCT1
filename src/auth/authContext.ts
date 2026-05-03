import type { StoredSession } from "./sessionUser";
import { createContext } from "react";

export type User = {
  id: string;
  name: string;
  role: "admin" | "client";
  insurerId: string;
  insurerName: string;
};

export type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (session: StoredSession) => void;
  logout: () => Promise<void>;
};

export const AuthContext =
  createContext<AuthContextValue | null>(null);
