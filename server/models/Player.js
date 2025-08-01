// Import the Mongoose library to define schemas and interact with MongoDB
import mongoose from 'mongoose';

// Define the schema for a Player document in the MongoDB database
const playerSchema = new mongoose.Schema({
  playerId: Number, // Unique identifier for the player
  name: {type: String, unique: true}, // Enforce uniqueness for name
  wins: {type: Number, default: 0}, // Number of games the player has won
  losses: {type: Number, default: 0}, // Number of games the player has lost
});

// Export the model so it can be used in other files to create, read, or update players
export default mongoose.model('Player', playerSchema);
