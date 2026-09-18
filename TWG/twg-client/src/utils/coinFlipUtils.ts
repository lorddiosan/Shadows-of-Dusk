export const getDeterministicCoinWinner = (seed?: string): 'player1' | 'player2' => {
  if (!seed) return Math.random() >= 0.5 ? 'player1' : 'player2';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2 === 0 ? 'player1' : 'player2';
};
