// Checks if a monster can move to a target cell
export function isValidMove(from, to, board, playerId) {
  // Calculate horizontal distance between the origin and destination
  const dx = Math.abs(from.x - to.x);

  // Calculate vertical distance between the origin and destination
  const dy = Math.abs(from.y - to.y);

  // Determine if the move is in a straight line (either x or y is the same)
  const isVH = dx === 0 || dy === 0;

  // Determine if the move is diagonal (equal x and y distance) and within 2 cells
  const isDiagonal = dx === dy && dx <= 2;

  // If the move is neither straight nor valid diagonal, it's not allowed
  if (!isVH && !isDiagonal) return false;

  // If it's a straight-line move, check if the path is blocked by enemy monsters
  const pathBlocked = isVH && isPathBlocked(from, to, board, playerId);

  // The move is valid only if the path is not blocked
  return !pathBlocked;
}

// Helper function that checks if the path is blocked by an enemy piece
export function isPathBlocked(from, to, board, playerId) {
  // Determine the direction of movement for x and y
  // (1 for forward/right, -1 for backward/left, 0 for no movement)
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);

  // Start checking from the next cell after the origin
  let x = from.x + dx;
  let y = from.y + dy;

  // Continue looping until you reach the destination cell
  while (x !== to.x || y !== to.y) {
    // Get the current cell on the board (with optional chaining to avoid errors)
    const cell = board[y]?.[x];

    // If the cell contains a monster from another player, the path is blocked
    if (cell?.player && cell.player !== playerId) return true;

    // Move one step forward in the current direction
    x += dx;
    y += dy;
  }

  // No blocking enemy found — path is clear
  return false;
}
