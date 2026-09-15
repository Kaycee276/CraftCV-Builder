import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import crypto from "node:crypto";

const dbPath = process.env.DATABASE_URL || "craftcv.db";
const resolvedPath = path.isAbsolute(dbPath)
  ? dbPath
  : path.resolve(process.cwd(), dbPath);

export const sqlite = new DatabaseSync(resolvedPath);

sqlite.exec("PRAGMA foreign_keys = ON;");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS craftcv_users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS craftcv_sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES craftcv_users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS craftcv_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES craftcv_users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS craftcv_cvs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES craftcv_users(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    cv_data TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

export type User = {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
};

export type Message = {
  id: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};

export type Cv = {
  id: string;
  userId: string;
  version: number;
  cvData: any;
  createdAt: Date;
};

function mapUser(row: any): User {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: new Date(row.created_at),
  };
}

function mapMessage(row: any): Message {
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    content: row.content,
    createdAt: new Date(row.created_at),
  };
}

function mapCv(row: any): Cv {
  let parsedCvData = row.cv_data;
  if (typeof row.cv_data === "string") {
    try {
      parsedCvData = JSON.parse(row.cv_data);
    } catch {
      parsedCvData = {};
    }
  }
  return {
    id: row.id,
    userId: row.user_id,
    version: row.version,
    cvData: parsedCvData,
    createdAt: new Date(row.created_at),
  };
}

export const usersRepo = {
  findByEmail(email: string): User | null {
    const stmt = sqlite.prepare(
      "SELECT * FROM craftcv_users WHERE email = ? LIMIT 1",
    );
    const row = stmt.get(email.toLowerCase().trim());
    return row ? mapUser(row) : null;
  },
  findById(id: string): User | null {
    const stmt = sqlite.prepare(
      "SELECT * FROM craftcv_users WHERE id = ? LIMIT 1",
    );
    const row = stmt.get(id);
    return row ? mapUser(row) : null;
  },
  create(data: { fullName: string; email: string; passwordHash: string }): User {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    sqlite
      .prepare(
        "INSERT INTO craftcv_users (id, full_name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(id, data.fullName, data.email.toLowerCase().trim(), data.passwordHash, createdAt);
    return mapUser({
      id,
      full_name: data.fullName,
      email: data.email.toLowerCase().trim(),
      password_hash: data.passwordHash,
      created_at: createdAt,
    });
  },
  delete(id: string) {
    sqlite.prepare("DELETE FROM craftcv_users WHERE id = ?").run(id);
  },
};

export const sessionsRepo = {
  create(userId: string, token: string, expiresAt: Date) {
    sqlite
      .prepare(
        "INSERT INTO craftcv_sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
      )
      .run(token, userId, expiresAt.toISOString());
  },
  delete(token: string) {
    sqlite.prepare("DELETE FROM craftcv_sessions WHERE token = ?").run(token);
  },
  getUserByToken(token: string): User | null {
    const stmt = sqlite.prepare(`
      SELECT u.* FROM craftcv_users u
      JOIN craftcv_sessions s ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > ?
      LIMIT 1
    `);
    const row = stmt.get(token, new Date().toISOString());
    return row ? mapUser(row) : null;
  },
};

export const messagesRepo = {
  listByUser(userId: string): Message[] {
    const stmt = sqlite.prepare(
      "SELECT * FROM craftcv_messages WHERE user_id = ? ORDER BY created_at ASC",
    );
    const rows = stmt.all(userId);
    return rows.map(mapMessage);
  },
  create(data: { userId: string; role: "user" | "assistant"; content: string }): Message {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    sqlite
      .prepare(
        "INSERT INTO craftcv_messages (id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(id, data.userId, data.role, data.content, createdAt);
    return mapMessage({
      id,
      user_id: data.userId,
      role: data.role,
      content: data.content,
      created_at: createdAt,
    });
  },
};

export const cvsRepo = {
  listByUser(userId: string): Cv[] {
    const stmt = sqlite.prepare(
      "SELECT * FROM craftcv_cvs WHERE user_id = ? ORDER BY created_at DESC",
    );
    const rows = stmt.all(userId);
    return rows.map(mapCv);
  },
  getById(id: string, userId: string): Cv | null {
    const stmt = sqlite.prepare(
      "SELECT * FROM craftcv_cvs WHERE id = ? AND user_id = ? LIMIT 1",
    );
    const row = stmt.get(id, userId);
    return row ? mapCv(row) : null;
  },
  delete(id: string, userId: string): boolean {
    const result = sqlite
      .prepare("DELETE FROM craftcv_cvs WHERE id = ? AND user_id = ?")
      .run(id, userId);
    return (result as any).changes > 0;
  },
  getMaxVersion(userId: string): number {
    const stmt = sqlite.prepare(
      "SELECT MAX(version) as max_version FROM craftcv_cvs WHERE user_id = ?",
    );
    const row = stmt.get(userId) as any;
    return row?.max_version ?? 0;
  },
  create(data: { userId: string; version: number; cvData: any }): Cv {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const jsonStr = typeof data.cvData === "string" ? data.cvData : JSON.stringify(data.cvData);
    sqlite
      .prepare(
        "INSERT INTO craftcv_cvs (id, user_id, version, cv_data, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(id, data.userId, data.version, jsonStr, createdAt);
    return mapCv({
      id,
      user_id: data.userId,
      version: data.version,
      cv_data: data.cvData,
      created_at: createdAt,
    });
  },
};

export * from "./schema";
