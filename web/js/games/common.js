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

/**
 * Lecteur des cases d'un joueur dans une grille de saisie.
 * `lireLigne(form, 'routes', id)('r6')` donne le nombre saisi, 0 si vide.
 */
export function lireLigne(form, cle, playerId) {
  const brut = form?.[cle]?.[playerId] ?? {};
  return (col) => Number(brut[col]) || 0;
}

/**
 * Vrai si un joueur n'a aucune case renseignée dans les grilles données.
 * Un zéro tapé compte comme une saisie : c'est une information.
 */
export function grillesVides(form, cles, playerId) {
  const cases = cles.flatMap((cle) => Object.values(form?.[cle]?.[playerId] ?? {}));
  return cases.every((v) => v === '' || v == null);
}
