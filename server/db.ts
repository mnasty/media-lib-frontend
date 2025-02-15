import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";
import path from "path";

const sqlite = new Database(path.join(process.cwd(), "media.db"));
export const db = drizzle(sqlite, { schema });

// Export the needed operators
export { eq, and };

// Initialize the database tables
db.run(`
  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    path TEXT NOT NULL,
    thumbnail TEXT,
    duration TEXT,
    size TEXT,
    last_modified INTEGER NOT NULL,
    plot TEXT,
    year TEXT,
    rating TEXT,
    director TEXT,
    actors TEXT,
    genre TEXT,
    poster TEXT,
    last_scanned INTEGER NOT NULL,
    hash TEXT NOT NULL
  )
`);