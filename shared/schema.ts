import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const videos = sqliteTable("videos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  path: text("path").notNull(),
  thumbnail: text("thumbnail"),
  duration: text("duration"),
  size: text("size"),
  lastModified: integer("last_modified", { mode: "timestamp" }).notNull(),
  // Add IMDb metadata fields
  plot: text("plot"),
  year: text("year"),
  rating: text("rating"),
  director: text("director"),
  actors: text("actors"),
  genre: text("genre"),
  poster: text("poster"),
  // Add cache control fields
  lastScanned: integer("last_scanned", { mode: "timestamp" }).notNull(),
  hash: text("hash").notNull(),
});

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
});

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

export const videoMetadataSchema = z.object({
  path: z.string(),
  title: z.string(),
  size: z.string(),
  duration: z.string().optional(),
  lastModified: z.date(),
  plot: z.string().optional(),
  year: z.string().optional(),
  rating: z.string().optional(),
  director: z.string().optional(),
  actors: z.string().optional(),
  genre: z.string().optional(),
  poster: z.string().optional(),
  hash: z.string(),
  lastScanned: z.date(),
});

export type VideoMetadata = z.infer<typeof videoMetadataSchema>;

export interface Config {
    sambaSharePath: string;
}