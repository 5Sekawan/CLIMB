import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Logger } from '../utils/logger';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || '';

interface ConnectionState {
  isConnected: number;
}

const connection: ConnectionState = {
  isConnected: 0,
};

export class Database {
  /**
   * Establishes a Singleton connection to MongoDB.
   * Prevents multiple connections in serverless/container environments.
   */
  static async connect(): Promise<void> {
    if (connection.isConnected) {
      Logger.info('Using existing MongoDB connection');
      return;
    }

    if (!MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not defined.');
    }

    try {
      const db = await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      connection.isConnected = db.connections[0].readyState;
      Logger.info(`MongoDB Connected: ${db.connections[0].host}`);
    } catch (error) {
      Logger.error('MongoDB connection error', error);
      process.exit(1); // Exit process with failure
    }
  }

  /**
   * Disconnects from MongoDB.
   * Useful for graceful shutdowns.
   */
  static async disconnect(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
      await mongoose.disconnect();
    }
  }
}
