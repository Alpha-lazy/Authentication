import { z } from "zod";

// User schema
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  password: z.string(),
  createdAt: z.date()
});

export const insertUserSchema = userSchema.omit({ 
  id: true,
  createdAt: true 
});

// Playlist schema
export const playlistSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  songCount: z.number()
});

export const insertPlaylistSchema = playlistSchema.omit({ 
  id: true 
});

// Favorite schema
export const favoriteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  playlistId: z.string(),
  name: z.string(),
  imageUrl: z.string(),
  createdAt: z.date()
});

export const insertFavoriteSchema = favoriteSchema.omit({ 
  id: true,
  createdAt: true 
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Export types
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Playlist = z.infer<typeof playlistSchema>;
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type Favorite = z.infer<typeof favoriteSchema>;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;