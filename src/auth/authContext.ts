import { createContext } from "react";

export type User = {
  id: string;
  name: string;
  role: "analyst" | "manager" | "admin";
};

export type AuthContextValue = {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
};

export const AuthContext =
  createContext<AuthContextValue | null>(null);