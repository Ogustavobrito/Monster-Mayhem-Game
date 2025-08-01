// Export the function so it can be used in other modules
export function createInitialBoard() {
  // Initialize an empty array that will represent the game board (2D grid)
  const board = [];

  // Loop through each row index (from 0 to 9 = 10 rows total)
  for (let y = 0; y < 10; y++) {
    const row = []; // Create a new row as an empty array

    for (let x = 0; x < 10; x++) {
      // Loop through each column index (from 0 to 9 = 10 columns per row)
      row.push(null); // Add a null value to represent an empty cell
    }
    board.push(row); // After the row is filled, add it to the board
  }
  return board; // Return the complete 10x10 board
}
