let movesToSubmit = []; // Array to store all movement actions selected by the current player during the round
let currentPlayer = null; // Tracks the currently active player
let selectedMonster = null; // Holds the type of monster currently selected for placement
let selectedCell = null;
let currentBoard = [];
let playerOrder = [];
let playerDeaths = {}; // Stores monster deaths for each player
// Represents the latest board state received from the server
let hasPlacedThisRound = false; // Indicates whether the current player has already placed a monster this round

let pendingMove = null;
// Set to track positions where monsters have been placed during the current round (prevents immediate movement)
const justPlacedPositions = new Set();
let cachedPlayers = null; // Temporarily hold players if playerOrder isn't ready

// // Request a player ID when this tab connects
// socket.emit('requestPlayerId');
const playerName = prompt('Enter your name:');

// Validate input before sending to server
if (!playerName || playerName.length === 0) {
  alert('Name is required to play.');
  throw new Error('Invalid player name');
}

socket.emit('registerPlayer', {name: playerName});

// Receive the assigned player ID from the server
socket.on('assignPlayer', ({id, name, wins, losses}) => {
  currentPlayer = id;

  document.getElementById('player-label').textContent = `${name} (ID: ${id})`;
  document.getElementById('current-player').textContent = ` - ${name}'s Board!`;
});

// Handle case where the game is full
socket.on('gameFull', () => {
  alert('Game is full. Try again later.');
});

// Check if the cell is on the current player's edge
function isEdgeCellForPlayer(x, y, playerId) {
  const index = playerOrder.findIndex(p => p === playerId);
  if (index === -1) {
    console.warn(`Player ${playerId} not in playerOrder`, playerOrder);
    return false;
  }

  return (
    (index === 0 && y === 0) || // Top edge
    (index === 1 && x === 9) || // Right edge
    (index === 2 && y === 9) || // Bottom edge
    (index === 3 && x === 0) // Left edge
  );
}

// Select a monster type to place
function selectMonster(monster) {
  // If the player already placed a monster this round, block further selection
  if (hasPlacedThisRound) {
    alert('You’ve already placed a monster this round.');
    return; // Stop the function here
  }

  // If the clicked monster is already selected, deselect it
  if (selectedMonster === monster) {
    selectedMonster = null; // Reset the selection
    document.getElementById('selected-monster').textContent = 'None'; // Update UI to show no selection
    clearHighlights(); // Remove visual highlights from the board
    return; // Stop the function
  }

  // Otherwise, select the clicked monster
  selectedMonster = monster; // Update selection to this monster
  document.getElementById('selected-monster').textContent = monster; // Update UI to show selected monster
  clearHighlights(); // Clear any old highlights before potentially adding new ones
}

// Highlight valid move positions for the selected cell
function highlightValidMoves(cell) {
  // Select all elements with the class 'cell' (entire board)
  const cells = document.querySelectorAll('.cell');

  // Get the X and Y coordinates of the selected cell (origin)
  const fromX = parseInt(cell.dataset.x);
  const fromY = parseInt(cell.dataset.y);

  // Loop through all possible cells on a 10x10 board
  for (let x = 0; x < 10; x++) {
    for (let y = 0; y < 10; y++) {
      // Calculate the distance from the origin to the current cell
      const dx = Math.abs(x - fromX);
      const dy = Math.abs(y - fromY);

      // Find the DOM element that matches the target coordinates (x, y)
      const target = Array.from(cells).find(
        c => parseInt(c.dataset.x) === x && parseInt(c.dataset.y) === y
      );

      // Skip if the cell doesn’t exist or it's the original cell itself
      if (!target || target === cell) continue;

      // Check if the movement is valid:
      // - Vertical or horizontal (dx or dy is 0)
      const isVH = dx === 0 || dy === 0;

      // - Diagonal movement (dx and dy are equal, and up to 2 cells)
      const isDiagonal = dx === dy && dx <= 2;

      // If the move is valid (either VH or short diagonal), highlight the cell
      if (isVH || isDiagonal) {
        target.classList.add('highlight'); // Add a visual highlight
      }
    }
  }
}

// Clear all move highlights and selection
function clearHighlights() {
  document.querySelectorAll('.cell').forEach(cell => {
    cell.classList.remove('highlight', 'selected');
  });
}

// Place a monster on the board (one per round, only on your edge)
function placeMonster(cell) {
  // If no monster is selected, exit the function
  if (!selectedMonster) return;

  // If the player has already placed a monster this round, block placement
  if (hasPlacedThisRound) {
    alert('You can only place one monster per round.');
    return;
  }

  // Block eliminated players
  if (playerDeaths?.[currentPlayer] >= 10) {
    alert('You are eliminated and cannot place or move monsters.');
    return;
  }

  // Get X and Y coordinates of the clicked cell
  const x = parseInt(cell.dataset.x);
  const y = parseInt(cell.dataset.y);

  // Check if the cell is on the player's edge of the board
  if (!isEdgeCellForPlayer(x, y, currentPlayer)) {
    alert('You can only place a monster on your edge of the board.');
    return;
  }

  const key = `${x},${y}`;
  justPlacedPositions.add(key);

  // Send the placement action to the server via Socket.IO
  socket.emit('placeMonster', {
    playerId: currentPlayer, // Who is placing the monster
    type: selectedMonster, // What kind of monster is being placed
    x, // X position on the board
    y, // Y position on the board
  });

  // Locally mark that the player already placed this round
  hasPlacedThisRound = true;
  selectedMonster = null;
  document.getElementById('selected-monster').textContent = 'None';
}

// Select and move monsters (multiple per round, but not just-placed ones)
function selectCellForMovement(cell) {
  // Block eliminated players
  if (playerDeaths?.[currentPlayer] >= 10) {
    alert('You are eliminated and cannot place monsters.');
    return;
  }
  // If a monster is selected, this click is for placing it
  if (selectedMonster) {
    placeMonster(cell); // Attempt to place the selected monster
    return;
  }

  // If no cell is selected yet (first click for movement)
  if (!selectedCell) {
    const x = cell.dataset.x;
    const y = cell.dataset.y;
    const key = `${x},${y}`;

    // Prevent movement of a monster that was just placed this turn
    if (justPlacedPositions.has(key)) {
      alert('You cannot move a monster on the same turn it was placed.');
      return;
    }

    // Only allow selection if it's your own monster
    if (cell.dataset.player == currentPlayer) {
      selectedCell = cell; // Store the selected monster cell
      cell.classList.add('selected'); // Highlight the selected cell
      highlightValidMoves(cell); // Show valid destination options
    } else {
      alert('You can only move your own monsters!');
    }
    return;
  }

  // If clicked cell is one of the highlighted valid destinations
  if (cell.classList.contains('highlight')) {
    // Get coordinates of origin and destination
    const from = {
      x: parseInt(selectedCell.dataset.x),
      y: parseInt(selectedCell.dataset.y),
    };
    const to = {
      x: parseInt(cell.dataset.x),
      y: parseInt(cell.dataset.y),
    };

    pendingMove = {from, to};
    // Check if the move is valid (not jumping over enemies)
    socket.emit('validateMove', {
      playerId: currentPlayer,
      from,
      to,
      justPlaced: Array.from(justPlacedPositions),
    });
  } else if (cell === selectedCell) {
    // If the same cell is clicked again, cancel the selection
    selectedCell.classList.remove('selected');
    clearHighlights();
    selectedCell = null;
  } else {
    // If it's not a valid move or selection, show error
    alert('Invalid move!');
  }
}

// Render the board and monster positions
function renderBoard(board) {
  board.forEach((row, y) => {
    // Loop through each row in the board (y is the row index)
    row.forEach((cell, x) => {
      // Loop through each cell in the row (x is the column index)
      // Select the corresponding DOM element for this cell
      const dom = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);

      // Reset the cell's class and background image before applying new data
      dom.className = 'cell';
      dom.style.backgroundImage = '';

      // If the cell has a monster on it
      if (cell) {
        // Save player ID and monster type as data attributes
        dom.dataset.player = cell.player;
        dom.dataset.type = cell.type;

        // Find player's layout position: 0 = top, 1 = right, 2 = bottom, 3 = left
        const layoutIndex = playerOrder.indexOf(cell.player);
        if (layoutIndex !== -1) {
          const colorClass = `player${layoutIndex + 1}-monster`;
          dom.classList.add(cell.type, colorClass);
        }

        // Set the background image based on the monster type
        dom.style.backgroundImage = `url(images/${cell.type}.png)`;
        dom.style.backgroundSize = 'cover';
        dom.style.backgroundPosition = 'center';
      } else {
        // If the cell is empty, remove any existing data attributes
        delete dom.dataset.player;
        delete dom.dataset.type;
      }
    });
  });
}

// Update the death counters for each player
function updateMonsterCountsFromServer(deaths) {
  if (!Array.isArray(playerOrder) || playerOrder.length === 0) return;

  playerOrder.forEach((playerId, index) => {
    const deathCount = deaths[playerId] || 0;

    // Update the death count display on the panel
    const deathEl = document.getElementById(`player${index + 1}-deaths`);
    if (deathEl) deathEl.textContent = deathCount;

    // Handle elimination UI if player reached death limit
    if (deathCount >= 10) {
      const container = document.querySelector(
        `.player-container.${getPlayerClass(index + 1)}`
      );
      if (container) {
        container.style.opacity = 0.5;

        if (!container.querySelector('.elimination-message')) {
          const status = document.createElement('p');
          status.className = 'elimination-message';
          status.style.color = 'white';
          status.textContent = 'Player Eliminated from Game!';
          container.appendChild(status);
        }
      }
    }
  });
}

// Helper function returns the corresponding CSS class name for a player's layout based on their player ID
function getPlayerClass(playerId) {
  return ['one', 'two', 'three', 'four'][playerId - 1];
}

// Setup click handlers on each board cell
document.querySelectorAll('.cell').forEach(cell => {
  cell.addEventListener('click', () => {
    if (selectedMonster) {
      placeMonster(cell);
    } else {
      selectCellForMovement(cell);
    }
  });
});

// Submit round
function submitTurn() {
  const submitBtn = document.getElementById('submit-turn');
  // If there are moves to submit
  if (movesToSubmit.length > 0) {
    // Loop through all moves made by the player this turn
    for (const move of movesToSubmit) {
      // Send each move to the server via socket
      socket.emit('submitMove', {
        playerId: currentPlayer, // ID of the player making the move
        from: move.from, // Starting position of the move
        to: move.to, // Target position of the move
      });
    }
  } else {
    // If no moves were made, send a "skip turn" move to the server
    socket.emit('submitMove', {
      playerId: currentPlayer,
      from: null,
      to: null,
    });
  }

  // Clear the move queue after sending them
  movesToSubmit = [];

  // Disable the submit button and update its appearance
  submitBtn.disabled = true;
  submitBtn.classList.add('disabled');
  submitBtn.textContent = 'Waiting for round resolution...';

  // Notify the user that their turn has been submitted
  alert(`Player ${currentPlayer} has submitted their turn.`);
}

// Handle board update from the server (reset round state)
socket.on('boardUpdated', ({board, current, deaths}) => {
  const submitBtn = document.getElementById('submit-turn');
  // Sync local deaths count from server
  playerDeaths = deaths;

  // Update the local board and re-render it
  currentBoard = board;
  renderBoard(board);

  // Update monster count display
  updateMonsterCountsFromServer(deaths);

  // Reset selection state (no monster selected, no cell selected)
  selectedMonster = null;
  selectedCell = null;
  clearHighlights(); // Remove any cell highlights from previous moves

  // Enable or disable turn based on who should act now
  if (current === currentPlayer || current === null) {
    hasPlacedThisRound = false;

    // Re-enable the "Submit Turn" button
    submitBtn.disabled = false;
    submitBtn.classList.remove('disabled');
    submitBtn.textContent = 'Submit Turn';
  } else {
    // Disable button while waiting
    submitBtn.disabled = false;
    submitBtn.classList.add('disabled');
    submitBtn.textContent = 'Submit Turn';
  }

  // Clear any records of monsters placed this round
  justPlacedPositions.clear();
});

// Listen for confirmation that a monster was placed successfully
socket.on('monsterPlaced', ({x, y, monster}) => {
  const key = `${x},${y}`;
  justPlacedPositions.add(key); // Prevent this monster from moving this round

  // Update the board locally with the new monster
  currentBoard[y][x] = monster;
  renderBoard(currentBoard);
});

// Handle placement on occupied cell
socket.on('placementError', ({message}) => {
  alert(message);
});

// Update the board view for the current player when a monster is placed
socket.on('boardUpdateForPlacement', ({maskedBoard, playerId, deaths}) => {
  playerDeaths = deaths;

  // Only process board if it's the current player
  if (playerId === currentPlayer) {
    for (let y = 0; y < maskedBoard.length; y++) {
      for (let x = 0; x < maskedBoard[y].length; x++) {
        const cell = maskedBoard[y][x];

        // Track newly placed monster to prevent movement same turn
        if (!currentBoard[y]) continue;
        if (!currentBoard[y][x]) {
          if (cell && cell.player === currentPlayer) {
            const key = `${x},${y}`;
            justPlacedPositions.add(key);
          }
        }
      }
    }

    renderBoard(maskedBoard); // Show only player's monsters
    updateMonsterCountsFromServer(deaths); // Sync deaths
  }
});

// Listen for the 'updatePlayerList' from the server - sends the list of current players
socket.on('updatePlayerList', players => {
  // Abort if player order is invalid (needed to layout UI)
  if (!Array.isArray(playerOrder) || playerOrder.length === 0) {
    console.warn('[updatePlayerList] Invalid playerOrder:', playerOrder);
    cachedPlayers = players;
    return;
  }

  // Define layout slot identifiers used in the HTML/CSS
  const layoutSlots = ['one', 'two', 'three', 'four'];
  const layoutNames = {
    one: 'Top',
    two: 'Right',
    three: 'Bottom',
    four: 'Left',
  };

  // Loop over the first 4 player IDs in the defined player order
  playerOrder.slice(0, 4).forEach((id, index) => {
    // Find the full player object based on their playerId
    const player = players.find(p => p.playerId === id);

    // Map the index to a layout class ('one', 'two', 'three', 'four')
    const slotClass = layoutSlots[index];

    // Select the corresponding player container in the UI
    const container = document.querySelector(`.player-container.${slotClass}`);

    // Update the title with player name and directional board position
    const title = container.querySelector('h3');
    if (title) {
      title.textContent = `${player.name} - ${layoutNames[slotClass]} Side Board Game`;
    }

    // Update death count display for this player
    const deathEl = container.querySelector(`#player${index + 1}-deaths`);
    if (deathEl) {
      const count = (playerDeaths && playerDeaths[id]) || 0;
      deathEl.textContent = count;
    }

    // Find or create the stats container - show Wins/Losses
    let stats = container.querySelector('.player-stats');
    if (!stats) {
      stats = document.createElement('p');
      stats.className = 'player-stats';
      container.appendChild(stats);
    }

    // Fill in player stats: default to 0 if missing
    stats.textContent = `Wins: ${player.wins ?? 0} | Losses: ${
      player.losses ?? 0
    }`;
  });
});

// Listen for the server's response to a move validation request
socket.on('moveValidationResult', ({valid, reason}) => {
  // If the move is invalid show an alert
  if (!valid) {
    alert(reason || 'Invalid move!');
    clearHighlights(); // Remove highlights from the board
    selectedCell = null; // Reset selected cell
    pendingMove = null; // Cancel the move that was about to be submitted
    return; // Exit early
  }

  // If the move is valid, add it to the list of moves to be submitted
  movesToSubmit.push(pendingMove);

  // Enable the "Submit Turn" button so the player can confirm their moves
  document.getElementById('submit-turn').disabled = false;

  // Inform the player that the move was accepted
  alert("Move added! You can select more or click 'Submit Turn' to confirm.");

  clearHighlights(); // Clear highlights after move selection
  selectedCell = null; // Reset selected cell
  pendingMove = null; // Reset the pending move
});

// Receive the player order and replay cached player data if needed
socket.on('setPlayerOrder', order => {
  playerOrder = order;

  if (cachedPlayers) {
    const temp = cachedPlayers;
    cachedPlayers = null;

    socket.emit('requestPlayerSync'); // Ask for full list again
    const event = new CustomEvent('cachedPlayerList', {detail: temp});
    window.dispatchEvent(event); // Trigger manual replay
  }
});

// Handle full sync of all players
socket.on('syncPlayers', players => {
  socket.listeners('updatePlayerList')[0](players);
});

// Handle manually replayed cached player data
window.addEventListener('cachedPlayerList', e => {
  const players = e.detail;
  if (socket.listeners('updatePlayerList')[0]) {
    socket.listeners('updatePlayerList')[0](players);
  }
});

// Show winner alert when game ends
socket.on('gameOver', ({name, wins, losses}) => {
  alert(
    `🏆 ${name} wins the game! Total Wins: ${wins}, Total  Losses: ${losses}`
  );
});
