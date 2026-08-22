// Petits utilitaires partagés par les modules de jeu.
//
// Les jeux sont concaténés dans un seul script par `scripts/build-single-file.mjs` :
// deux modules ne peuvent pas déclarer le même nom au premier niveau. Ce qui
// servait déjà à deux jeux atterrit donc ici plutôt que d'être renommé à chaque
// nouveau jeu.

/** Le nom d'un joueur à partir de son identifiant, pour les messages. */
export function nomDe(players, id) {
  return players.find((p) => p.id === id)?.name ?? '—';
}
