// Import the helper that applies a move and resolves 1v1 combat
import {applyMove} from './applyMove.js';
// Import the function that decides the outcome of combat between two monster types
import {resolveCombat} from './resolveCombat.js';

// Main function to resolve all players' moves in a single game round
export function resolveRound(moves, board, state) {
  // Handle monster placements (placeOnly)
  for (const move of moves) {
    if (move.placeOnly) {
      const {playerId, to, type} = move;

      // Only place if the cell is still empty
      if (!board[to.y][to.x]) {
        board[to.y][to.x] = {player: playerId, type};
      }
    }
  }
  const results = []; // This will hold the outcome of each conflict/move

  //  Filter out only the players who actually made a valid move
  // This removes moves where 'from' or 'to' is null (e.g. when the player only placed a monster)
  // const validMoves = moves.filter(m => m.from && m.to);
  const validMoves = moves.filter(m => m.from && m.to && !m.placeOnly);

  // Log which players skipped their move (sent null from/to)
  for (const m of moves) {
    if (!m.from || !m.to) {
      console.log(`Player ${m.playerId} skipped their move.`);
    }
  }

  // Create a Set of all positions monsters are moving from (to check for escapes)
  const outgoingMoves = new Set(validMoves.map(m => `${m.from.x},${m.from.y}`));

  // Group all moves by their destination cell (x,y)
  const targetMap = {};
  for (const move of validMoves) {
    const key = `${move.to.x},${move.to.y}`;
    if (!targetMap[key]) {
      targetMap[key] = [];
    }
    targetMap[key].push(move); // Add move to the destination group
  }

  // Process each destination group separately
  for (const [key, moveGroup] of Object.entries(targetMap)) {
    const [x, y] = key.split(',').map(Number); // Convert "x,y" string back to numbers
    const defender = board[y][x]; // Get the current monster on the target cell, if any
    const defenderKey = `${x},${y}`; // Position key to check if the defender is escaping
    const defenderIsEscaping = outgoingMoves.has(defenderKey); // Is the defender moving away?
    const escaped = []; // List of monsters that escaped before attack landed

    // Case 1: Defender is present and NOT escaping → resolve combat normally
    if (defender && !defenderIsEscaping) {
      if (moveGroup.length === 1) {
        // Only one attacker → use applyMove to resolve attacker vs defender
        const move = moveGroup[0];
        const result = applyMove(move.from, move.to, board, state);
        results.push(result);
      } else {
        // Multiple attackers vs a stationary defender → eliminate all
        const eliminated = [];

        // Eliminate each attacker
        for (const move of moveGroup) {
          const attacker = board[move.from.y][move.from.x];
          if (attacker) {
            eliminated.push({...attacker, x: move.from.x, y: move.from.y});
            board[move.from.y][move.from.x] = null; // Remove attacker from board
          }
        }

        // Eliminate the defender too
        eliminated.push({...defender, x, y});
        board[y][x] = null;

        results.push({
          eliminated,
          moved: false,
        });
      }
    } else {
      // Case 2: Defender is escaping OR the cell is empty → treat it as empty

      if (defender && defenderIsEscaping) {
        // Log that the defender escaped before the attack
        escaped.push({...defender, x, y});
      }

      if (moveGroup.length === 1) {
        // Only one attacker moving into an empty/escaped cell → apply normally
        const move = moveGroup[0];
        const result = applyMove(move.from, move.to, board, state);

        results.push({
          ...result,
          escaped, // include escape log even if no one escaped
        });
      } else if (moveGroup.length === 2) {
        // Two attackers - resolve attacker vs attacker combat
        const [move1, move2] = moveGroup;
        const monster1 = board[move1.from.y][move1.from.x];
        const monster2 = board[move2.from.y][move2.from.x];

        const eliminated = [];
        let winner = null;

        // Determine outcome of the combat between the two attackers
        const outcome = resolveCombat(monster1.type, monster2.type);

        if (outcome === 'attacker') {
          // monster1 wins
          eliminated.push({...monster2, x: move2.from.x, y: move2.from.y});
          board[move2.from.y][move2.from.x] = null;
          board[move1.from.y][move1.from.x] = null;
          board[y][x] = {...monster1};
          winner = {...monster1, x, y};
        } else if (outcome === 'defender') {
          // monster2 wins
          eliminated.push({...monster1, x: move1.from.x, y: move1.from.y});
          board[move1.from.y][move1.from.x] = null;
          board[move2.from.y][move2.from.x] = null;
          board[y][x] = {...monster2};
          winner = {...monster2, x, y};
        } else {
          // Both monsters are eliminated (same type)
          eliminated.push(
            {...monster1, x: move1.from.x, y: move1.from.y},
            {...monster2, x: move2.from.x, y: move2.from.y}
          );
          board[move1.from.y][move1.from.x] = null;
          board[move2.from.y][move2.from.x] = null;
        }

        results.push({
          eliminated,
          moved: !!winner,
          winner,
          escaped,
        });
      } else {
        // 3 or more attackers → everyone dies
        const eliminated = [];

        for (const move of moveGroup) {
          const attacker = board[move.from.y][move.from.x];
          if (attacker) {
            eliminated.push({...attacker, x: move.from.x, y: move.from.y});
            board[move.from.y][move.from.x] = null;
          }
        }

        results.push({
          eliminated,
          moved: false,
          escaped,
        });
      }
    }
  }

  // Update the deaths count for each player based on eliminated monsters
  for (const result of results) {
    if (result.eliminated) {
      for (const unit of result.eliminated) {
        if (unit?.player) {
          state.deaths[unit.player] = (state.deaths[unit.player] || 0) + 1;
        }
      }
    }
  }

  // Remove monsters of players who reached 10 deaths
  for (const playerId of Object.keys(state.deaths)) {
    if (state.deaths[playerId] >= 10) {
      for (let y = 0; y < board.length; y++) {
        for (let x = 0; x < board[y].length; x++) {
          if (board[y][x]?.player === parseInt(playerId)) {
            board[y][x] = null;
          }
        }
      }
    }
  }

  // Return all results to the game engine - frontend
  return results;
}
