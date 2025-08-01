// Import the Mongoose library for MongoDB using schemas and models
import mongoose from 'mongoose';

// Define the URI for connecting to the local MongoDB database called "monster_mayhem"
const uri = 'mongodb://localhost:27017/monster_mayhem';

// Async function that connects to the database
export async function connectDB() {
  try {
    // Attempt to connect to MongoDB using Mongoose with the provided URI
    await mongoose.connect(uri);

    // If successful, log a success message
    console.log('Connected to MongoDB with Mongoose');
  } catch (error) {
    // If an error occurs during connection, log the error
    console.error('MongoDB connection error:', error);
  }
}
