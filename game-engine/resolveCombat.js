// Export the function so it can be used in other files
export function resolveCombat(attackerType, defenderType) {
  // If both monsters are of the same type, both are eliminated
  if (attackerType === defenderType) return 'both';

  // Vampires beat werewolves
  if (attackerType === 'vampire' && defenderType === 'werewolf')
    return 'attacker';

  // Werewolves beat ghosts
  if (attackerType === 'werewolf' && defenderType === 'ghost')
    return 'attacker';

  // Ghosts beat vampires
  if (attackerType === 'ghost' && defenderType === 'vampire') return 'attacker';

  return 'defender'; // In all other cases, the defender wins
}
