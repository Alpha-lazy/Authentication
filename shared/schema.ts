import { pgTable, text, serial, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Changed to text to store ObjectId as string
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const playlists = pgTable("playlists", {
  id: text("id").primaryKey(), // Changed to text for consistency
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  songCount: serial("song_count").notNull(),
});

export const favorites = pgTable("favorites", {
  id: text("id").primaryKey(), // Changed to text for consistency
  userId: text("user_id").notNull(),
  playlistId: text("playlist_id").notNull(),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertPlaylistSchema = createInsertSchema(playlists).omit({
  id: true,
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type User = typeof users.$inferSelect;
export type Playlist = typeof playlists.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;