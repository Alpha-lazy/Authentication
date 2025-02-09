import jwt from "jsonwebtoken";
import { getDB } from "./db";
import { ObjectId } from "mongodb";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export function generateToken(user: any) {
  return jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): any {
  return jwt.verify(token, JWT_SECRET);
}

export async function registerUser(email: string, name: string) {
  try {
    const db = getDB();
    const usersCollection = db.collection("users");

    const existingUser = await usersCollection.findOne({ email });

    if (existingUser) {
      throw new Error("User already exists");
    }

    const newUser = {
      email,
      name,
      createdAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);
    return { ...newUser, _id: result.insertedId };
  } catch (error) {
    throw error;
  }
}