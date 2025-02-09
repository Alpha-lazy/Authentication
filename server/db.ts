import { MongoClient } from "mongodb";
import * as ws from "ws"; //Keep this import as it is used in the edited code

const url = "mongodb+srv://anishmore712:Anish%402007@cluster0.rjjzy.mongodb.net/";
const dbName = "AlphaMusic";

let client: MongoClient;

export async function connectDB() {
  try {
    client = await MongoClient.connect(url);
    console.log("Connected to MongoDB");
    return client.db(dbName);
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    throw err;
  }
}

export function getDB() {
  if (!client) {
    throw new Error("Database not initialized. Call connectDB first.");
  }
  return client.db(dbName);
}

export function closeDB() {
  if (client) {
    client.close();
  }
}