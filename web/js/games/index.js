// Registre des jeux. Ajouter un jeu = ajouter un module ici.
import papayoo from './papayoo.js';

export const GAMES = [papayoo];

export function getGame(id) {
  return GAMES.find((g) => g.id === id) ?? GAMES[0];
}
