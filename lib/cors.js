// Qui a le droit d'appeler le relais depuis une autre origine.
//
// Servie sur le web, la PWA parle à son propre domaine : le navigateur
// n'applique aucun contrôle inter-origine et rien de ce fichier ne sert.
//
// Emballée dans une application native, la même page ne s'exécute plus sur le
// domaine du relais mais sur `capacitor://localhost`. Chaque appel devient donc
// inter-origine, et sans les en-têtes qui suivent le navigateur les bloque tous
// — création de salon, entrée, sondage, réponse. L'application se lance,
// affiche son accueil, et ne joue jamais.
//
// La liste est explicite plutôt qu'une étoile. Le relais n'a ni cookie ni jeton
// d'identité à protéger, donc ouvrir à tout le monde ne serait pas une faille
// au sens strict ; mais ce serait inviter n'importe quelle page du web à ouvrir
// des salons chez nous, et on n'y gagne rien.

const ORIGINES = new Set([
  'capacitor://localhost',           // iOS
  'ionic://localhost',               // anciennes versions de Capacitor
  'http://localhost',                // Android, et le rechargement à chaud en développement
  ...(process.env.ORIGINES_APP ?? '')
    .split(',')
    .map((origine) => origine.trim())
    .filter(Boolean),
]);

/** Cette origine a-t-elle le droit d'appeler le relais ? */
export const origineAutorisee = (origine) => Boolean(origine) && ORIGINES.has(origine);

/**
 * Les en-têtes à poser sur une réponse du relais, ou `null` si l'origine n'est
 * pas des nôtres — auquel cas on ne pose rien, et l'appel depuis le même
 * domaine continue de fonctionner comme avant.
 */
export function enTetesCors(origine) {
  if (!origineAutorisee(origine)) return null;
  return {
    'access-control-allow-origin': origine,
    // L'origine varie d'un appelant à l'autre : sans ça, un cache intermédiaire
    // pourrait servir à l'application la réponse préparée pour le site.
    vary: 'Origin',
    // Ces deux-là ne comptent que dans la réponse au préflight, mais les poser
    // partout évite d'avoir à distinguer deux jeux d'en-têtes.
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
  };
}

/**
 * Le préflight. Le pupitre envoie ses réponses en `application/json`, ce qui
 * suffit à faire précéder chaque POST d'un OPTIONS : sans réponse à celui-là,
 * la vraie requête n'est jamais émise.
 */
export const estPreflight = (methode) => String(methode ?? '').toUpperCase() === 'OPTIONS';
