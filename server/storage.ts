import { IStorage } from "./types";
import { getDB } from "./db";
import { ObjectId } from "mongodb";
import type { User, InsertUser, Playlist, InsertPlaylist } from "@shared/schema";

export class MongoStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const db = getDB();
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(id) });
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const db = getDB();
    const user = await db.collection("users").findOne({ googleId });
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const db = getDB();
    const result = await db.collection("users").insertOne(user);
    return { ...user, id: result.insertedId };
  }

  async getPlaylist(id: number): Promise<Playlist | undefined> {
    const db = getDB();
    const playlist = await db
      .collection("playlists")
      .findOne({ _id: new ObjectId(id) });
    return playlist || undefined;
  }

  async createPlaylist(playlist: InsertPlaylist): Promise<Playlist> {
    const db = getDB();
    const result = await db.collection("playlists").insertOne(playlist);
    return { ...playlist, id: result.insertedId };
  }
}

export const storage = new MongoStorage();
