import Player from '../models/Player.js';

/**
 * Updates the win/loss statistics for all players at the end of the game.
 *
 * @param {number[]} players - Array of player IDs participating in the game.
 * @param {number} winnerId - ID of the player who won the game.
 * @returns {Promise<Object>} - Returns the updated stats of the winner (name, wins, losses).
 */
export async function updateStatsAfterVictory(players, winnerId) {
  // Increment win count for the winning player and return the updated document
  const winner = await Player.findOneAndUpdate(
    {playerId: winnerId},
    {$inc: {wins: 1}},
    {upsert: true, new: true}
  );

  // Filter out the winner to get all losing players
  const losers = players.filter(pid => pid !== winnerId);

  // Increment loss count for each losing player in parallel
  await Promise.all(
    losers.map(pid =>
      Player.findOneAndUpdate(
        {playerId: pid},
        {$inc: {losses: 1}},
        {upsert: true}
      )
    )
  );

  // Return winner stats to notify clients
  return {
    name: winner.name,
    wins: winner.wins,
    losses: winner.losses,
  };
}
