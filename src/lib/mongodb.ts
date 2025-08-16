import mongoose, { Mongoose } from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

interface Cached {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// Gunakan global supaya tidak bikin banyak koneksi saat hot reload
const globalWithMongoose = global as typeof globalThis & {
  mongoose?: Cached;
};

let cached: Cached = globalWithMongoose.mongoose ?? {
  conn: null,
  promise: null,
};

async function dbConnect(): Promise<Mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((mongoose) => mongoose);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

globalWithMongoose.mongoose = cached;

export default dbConnect;
