// Moves monsters and applies combat if needed
import {resolveCombat} from './resolveCombat.js'; // Import the function that decides the outcome of combat between two monster types

export function applyMove(from, to, board, state) {
  // Get the monster trying to move
  const attacker = board[from.y][from.x];

  // Defensive check: if the attacker no longer exists (was already eliminated), skip this move
  if (!attacker) {
    console.log(
      `[applyMove] Skipping move from empty cell (${from.x},${from.y})`
    );
    return {eliminated: [], moved: false};
  }

  // Get the monster (if any) currently in the destination cell
  const defender = board[to.y][to.x];

  // Object to store the result of this move:
  // - 'eliminated' will hold any monsters that were removed
  // - 'moved' will indicate whether the attacker actually moved
  let result = {eliminated: [], moved: false};

  // If there's an enemy in the target cell
  if (defender?.player && defender.player !== attacker.player) {
    // Resolve combat using attacker and defender types
    const outcome = resolveCombat(attacker.type, defender.type);

    if (outcome === 'attacker') {
      // Attacker wins: defender is eliminated
      result.eliminated.push({...defender, x: to.x, y: to.y});
      board[to.y][to.x] = {...attacker}; // Move attacker to destination
      board[from.y][from.x] = null; // Clear origin cell
      result.moved = true;
    } else if (outcome === 'defender') {
      // Defender wins: attacker is eliminated
      result.eliminated.push({...attacker, x: from.x, y: from.y});
      board[from.y][from.x] = null; // Clear origin cell (attacker dies)
    } else {
      // Both lose: attacker and defender are eliminated
      result.eliminated.push(
        {...attacker, x: from.x, y: from.y},
        {...defender, x: to.x, y: to.y}
      );
      board[from.y][from.x] = null; // Clear origin cell
      board[to.y][to.x] = null; // Clear destination cell
    }
  } else {
    // No defender: just move the attacker
    board[to.y][to.x] = {...attacker};
    board[from.y][from.x] = null;
    result.moved = true;
  }

  // Return what happened during this move (for updating stats, logs, etc.)
  return result;
}
