// Link for ‘start-game.mov’
// https://drive.google.com/file/d/19SRpXpWLhmc06XmK7P5aZRSjSw7h9cRo/view?usp=drive_link

// Link for ‘modeling-explanation-mvc.MOV’
// https://drive.google.com/file/d/1DlQOvchSRzqRvpkKJfnH8_RwzQFXOabH/view?usp=drive_link

// Import the Express framework for handling HTTP routes and middleware
import express from 'express';
// Import Node's built-in HTTP module to create a raw HTTP server
import http from 'http';
// Import path utilities for working with file and directory paths
import path from 'path';
// Import utility to convert import.meta.url to a usable file path
import {fileURLToPath} from 'url';
// Import the Server class from socket.io to create a WebSocket server
import {Server} from 'socket.io';
// Import your custom socket logic (game events, handlers, etc.)
import setupGameSocket from './socket/game.js';
// Import the `connectDB` function from the local file `mongoose.js`
import {connectDB} from './db/mongoose.js';
// Import function to create players on database
// import createPlayers from './seedDb/createPlayers.js';

// Initialize the Express application
const app = express();

// Create an HTTP server using the Express app
const server = http.createServer(app);

// Create a WebSocket server with CORS enabled for all origins (for dev/testing)
const io = new Server(server, {
  cors: {origin: '*'},
});

// Get the absolute path to the current module's directory (since __dirname doesn't exist in ES Modules)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve static files from the 'public' folder (frontend)
app.use(express.static(path.join(__dirname, '../public')));

// Set the port number for the server.
const PORT = process.env.PORT || 3000;

// Connect to MongoDB using the connectDB() function.
// This function returns a Promise, so we wait for the connection to succeed before starting the server.
connectDB()
  .then(async () => {
    // await createPlayers();
    // Once MongoDB is connected, set up the WebSocket connection handler.
    // Every time a new client connects, pass the socket to the game logic.
    io.on('connection', socket => {
      setupGameSocket(io, socket);
    });

    // Start the HTTP server and listen on the defined port
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    // If there's an error connecting to MongoDB, log it and prevent the server from starting.
    console.error('Failed to connect to MongoDB:', err);
  });
