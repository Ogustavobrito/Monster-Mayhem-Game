// Import the function that resolves a round of the game
import {resolveRound} from '../../game-engine/resolveRound.js';

// Import the function that creates the initial empty board
import {createInitialBoard} from '../state/board.js';

import {isValidMove} from '../../game-engine/validateMove.js';

// Import the Mongoose model for the Player
import Player from '../models/Player.js';

import {updateStatsAfterVictory} from '../models/persistence.js';

// Initialize the board using the imported function
let resolvedBoard = createInitialBoard(); // Board from last resolved round
let board = createInitialBoard(); // Working copy for current player actions
const justPlacedPositions = {};

// Initialize the overall game state
let gameState = {
  players: [], // List of player IDs will be filled from playerOrder
  deaths: {}, // Tracks how many monsters each player has lost
  moves: {}, // Stores submitted moves during each round
  playerOrder: [], // Stores the player IDs in order: [top, right, bottom, left]
};

// Handles all socket events and game logic for an individual player connection
export default function setupGameSocket(io, socket) {
  let assignedPlayerId = null;

  // Handle new player registration and assignment
  socket.on('registerPlayer', async ({name}) => {
    if (!name || typeof name !== 'string' || !name.trim()) {
      socket.emit('registrationError', {message: 'Invalid player name'});
      return;
    }

    const cleanedName = name.trim();

    try {
      // Look up existing player or create a new one
      let player = await Player.findOne({name: cleanedName});

      if (!player) {
        const highest = await Player.findOne().sort({playerId: -1}).lean();
        const newId = highest ? highest.playerId + 1 : 1;
        player = await Player.create({name: cleanedName, playerId: newId});
      }

      // Assign the new player to this socket connection
      assignedPlayerId = player.playerId;
      socket.join(String(assignedPlayerId));

      // Inform client of successful assignment
      socket.emit('assignPlayer', {
        id: player.playerId,
        name: player.name,
        wins: player.wins,
        losses: player.losses,
      });

      // Track this player in the global game state
      if (!gameState.playerOrder.includes(player.playerId)) {
        gameState.playerOrder.push(player.playerId);
      }
      if (!gameState.players.includes(player.playerId)) {
        gameState.players.push(player.playerId);
      }
      if (!gameState.deaths[player.playerId]) {
        gameState.deaths[player.playerId] = 0;
      }

      // Send current player order and list of players to all clients
      const playerData = await Player.find({
        playerId: {$in: gameState.playerOrder.slice(0, 4)},
      });

      // Determines the layout/position of players on the board
      io.emit('setPlayerOrder', gameState.playerOrder.slice(0, 4));
      // Send the full list of player data (name, wins, losses)
      io.emit('updatePlayerList', playerData);

      console.log(`Player ${assignedPlayerId} joined as ${player.name}`);
    } catch (err) {
      if (err.code === 11000) {
        socket.emit('registrationError', {
          message: 'Name already in use. Please choose a different one.',
        });
      } else {
        socket.emit('registrationError', {
          message: 'Server error during registration.',
        });
      }
    }
  });

  // Return all players who are still active (not eliminated)
  function getActivePlayers() {
    return gameState.players.filter(
      playerId => gameState.deaths[playerId] < 10
    );
  }

  // Handle a monster placement attempt
  socket.on('placeMonster', ({playerId, type, x, y}) => {
    if (board[y][x]) {
      socket.emit('placementError', {message: 'Cell already occupied!'});
      return;
    }

    board[y][x] = {player: playerId, type};

    // Only show this player their own monsters on the board
    const maskedBoard = resolvedBoard.map((row, yIndex) =>
      row.map((cell, xIndex) => {
        if (board[yIndex][xIndex]?.player === playerId) {
          return board[yIndex][xIndex];
        }
        return cell;
      })
    );

    socket.emit('boardUpdateForPlacement', {
      maskedBoard,
      playerId,
      deaths: gameState.deaths,
    });
  });

  // Handle a move submission from a player
  socket.on('submitMove', async ({playerId, from, to}) => {
    // Skip null moves (used to pass/skip turn)
    if (from && to) {
      // Validate the move on the server using game rules
      if (!isValidMove(from, to, board, playerId)) {
        socket.emit('moveError', {
          message: 'Invalid move: path blocked or not allowed.',
        });
        return;
      }
    }

    // Store this move in the game state
    if (!gameState.moves[playerId]) {
      gameState.moves[playerId] = [];
    }

    gameState.moves[playerId].push(from && to ? {playerId, from, to} : null);

    const activePlayers = getActivePlayers();
    const submittedPlayers = Object.keys(gameState.moves);

    // If all active players have submitted, resolve the round
    const allActiveSubmitted = activePlayers.every(pid =>
      submittedPlayers.includes(pid.toString())
    );

    if (allActiveSubmitted) {
      const roundResults = resolveRound(
        Object.values(gameState.moves).flat().filter(Boolean),
        board,
        gameState
      );

      // Remove all monsters from eliminated players
      for (const playerId of gameState.players) {
        if (gameState.deaths[playerId] >= 10) {
          for (let y = 0; y < board.length; y++) {
            for (let x = 0; x < board[y].length; x++) {
              if (board[y][x]?.player === playerId) {
                board[y][x] = null;
              }
            }
          }
        }
      }

      // Check for win condition (only one player left)
      const remaining = getActivePlayers();
      if (remaining.length === 1) {
        const winnerId = remaining[0];

        const winnerData = await updateStatsAfterVictory(
          gameState.players,
          winnerId
        );

        io.emit('gameOver', winnerData);
      }

      // Reset round state and sync board/deaths
      gameState.moves = {};

      // Clear justPlacedPositions
      for (const pid of Object.keys(justPlacedPositions)) {
        justPlacedPositions[pid].clear();
      }

      // Create a copy of the current board to save it as the resolved state after this round
      resolvedBoard = board.map(row =>
        row.map(cell => (cell ? {...cell} : null))
      );

      // Broadcast the updated board state to all connected clients
      io.emit('boardUpdated', {
        board: resolvedBoard,
        current: null,
        deaths: gameState.deaths,
      });
    }
  });

  // Listen for a 'validateMove' event from the client, which checks if a move is allowed
  socket.on('validateMove', ({playerId, from, to, justPlaced}) => {
    // Create a key from the origin coordinates to identify the specific monster position
    const key = `${Number(from.x)},${Number(from.y)}`;

    // Check if this monster was just placed in the current round
    if (justPlacedPositions[playerId]?.has(key)) {
      // If so, block the move and inform the client with a reason
      socket.emit('moveValidationResult', {
        valid: false,
        reason: 'You cannot move a monster on the same turn it was placed.',
      });
      return; // Stop further validation
    }

    // Call the validation function to check if the move is allowed by game rules
    const valid = isValidMove(from, to, board, playerId);

    // Send the validation result back to the client
    // If the move is not valid, provide a reason; otherwise, send null for the reason
    socket.emit('moveValidationResult', {
      valid,
      reason: valid ? null : 'You cannot move through enemy monsters!',
    });
  });

  // Handle sync request from a client (usually on late join)
  socket.on('requestPlayerSync', async () => {
    const playerData = await Player.find({
      playerId: {$in: gameState.playerOrder.slice(0, 4)},
    });
    socket.emit('syncPlayers', playerData);
  });
}
