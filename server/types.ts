import type { User, InsertUser, Playlist } from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Playlist methods
  getPlaylist(id: string): Promise<Playlist | undefined>;
  getFavorites(userId: string): Promise<Playlist[]>;
  addToFavorites(userId: string, playlistId: string): Promise<void>;
  removeFromFavorites(userId: string, playlistId: string): Promise<boolean>;
}
