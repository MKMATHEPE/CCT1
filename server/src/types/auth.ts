export type AuthRole = "admin" | "client";

export type AuthUser = {
  id: string;
  name: string;
  username: string;
  role: AuthRole;
  insurerId: string;
  insurerName: string;
  builtIn: boolean;
  createdAt: string;
  updatedAt: string;
  passwordHash: string;
};

export type SessionRecord = {
  token: string;
  userId: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
};

export type AuthDatabaseShape = {
  users: AuthUser[];
  sessions: SessionRecord[];
};

export type PublicUser = {
  id: string;
  name: string;
  role: AuthRole;
  insurerId: string;
  insurerName: string;
};

export type PublicClientUser = {
  id: string;
  name: string;
  username: string;
  role: "client";
  insurerId: string;
  insurerName: string;
  builtIn: boolean;
  createdAt: string;
  updatedAt: string;
};
