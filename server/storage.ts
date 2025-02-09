import { IStorage } from "./types";
import { getDB } from "./db";
import { ObjectId } from "mongodb";
import type { User, InsertUser, Playlist, InsertPlaylist } from "@shared/schema";

export class MongoStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const db = getDB();
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(id) });
    return user ? this.mapUser(user) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const db = getDB();
    const user = await db.collection("users").findOne({ email });
    return user ? this.mapUser(user) : undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const db = getDB();
    const result = await db.collection("users").insertOne({
      ...user,
      createdAt: new Date()
    });
    return {
      ...user,
      id: result.insertedId.toString(),
      createdAt: new Date()
    };
  }

  async getPlaylist(id: string): Promise<Playlist | undefined> {
    const db = getDB();
    const playlist = await db
      .collection("playlists")
      .findOne({ _id: new ObjectId(id) });
    return playlist ? this.mapPlaylist(playlist) : undefined;
  }

  async getFavorites(userId: string): Promise<Playlist[]> {
    const db = getDB();
    const favorites = await db
      .collection("favorites")
      .aggregate([
        { $match: { userId: new ObjectId(userId) } },
        {
          $lookup: {
            from: "playlists",
            localField: "playlistId",
            foreignField: "_id",
            as: "playlist"
          }
        },
        { $unwind: "$playlist" }
      ])
      .toArray();

    return favorites.map(f => this.mapPlaylist(f.playlist));
  }

  async addToFavorites(userId: string, playlistId: string): Promise<void> {
    const db = getDB();
    await db.collection("favorites").insertOne({
      userId: new ObjectId(userId),
      playlistId: new ObjectId(playlistId),
      createdAt: new Date()
    });
  }

  async removeFromFavorites(userId: string, playlistId: string): Promise<boolean> {
    const db = getDB();
    const result = await db.collection("favorites").deleteOne({
      userId: new ObjectId(userId),
      playlistId: new ObjectId(playlistId)
    });
    return result.deletedCount > 0;
  }

  private mapUser(user: any): User {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      createdAt: user.createdAt
    };
  }

  private mapPlaylist(playlist: any): Playlist {
    return {
      id: playlist._id.toString(),
      name: playlist.name,
      url: playlist.url,
      songCount: playlist.songCount
    };
  }
}

export const storage = new MongoStorage();