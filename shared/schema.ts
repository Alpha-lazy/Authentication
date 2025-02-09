import { pgTable, text, serial, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
});

export const playlists = pgTable("playlists", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  songCount: serial("song_count").notNull(),
});

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").notNull(),
  playlistId: serial("playlist_id").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertPlaylistSchema = createInsertSchema(playlists).omit({
  id: true,
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
});

export type User = typeof users.$inferSelect;
export type Playlist = typeof playlists.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;