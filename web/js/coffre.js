// Rangement durable des données, pour survivre à un changement de téléphone.
//
// Dans un navigateur, le `localStorage` suffit : il est synchrone, rapide, et
// l'appli s'en sert comme source de vérité pendant toute son exécution. Mais
// une fois l'appli empaquetée, ce `localStorage`-là appartient au WebView, et
// rien ne garantit que la sauvegarde du téléphone l'emporte — un utilisateur
// qui change d'appareil pourrait retrouver l'appli vide malgré une sauvegarde
// complète.
//
// D'où ce second étage : quand l'appli tourne en natif, chaque enregistrement
// est recopié dans le stockage de préférences du système (UserDefaults sur
// iOS, SharedPreferences sur Android), qui entre lui dans la sauvegarde
// iCloud et l'Auto Backup Android. Au démarrage, si le WebView est vide alors
// que le coffre contient quelque chose, on remet le contenu en place.
//
// L'accès passe par la variable globale `window.Capacitor` plutôt que par un
// `import` du paquet : l'appli n'a pas d'étape de compilation, et le pont natif
// expose ses greffons à l'exécution. Sur le web, la globale n'existe pas et
// tout ce fichier devient une série de non-opérations.

/** Le pont natif est-il là ? Faux dans un navigateur ordinaire. */
export function enNatif() {
  try {
    return Boolean(globalThis.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

function preferences() {
  return globalThis.Capacitor?.Plugins?.Preferences ?? null;
}

/**
 * Lit la copie durable. Renvoie `null` sur le web, et en cas d'échec : le
 * coffre est un filet de sécurité, jamais une dépendance dure.
 */
export async function lireCoffre(cle) {
  const prefs = enNatif() ? preferences() : null;
  if (!prefs) return null;
  try {
    const { value } = await prefs.get({ key: cle });
    return value ?? null;
  } catch {
    return null;
  }
}

// Une écriture par frappe au clavier serait du gaspillage : la saisie d'une
// manche appelle `persist()` à chaque chiffre tapé. On regroupe.
const ATTENTE = 800;
let minuteur = null;
let enAttente = null;

/**
 * Recopie l'état dans le coffre, en différé et sans attendre le résultat.
 * L'appli ne doit jamais ralentir ni échouer à cause de cette copie.
 */
export function ecrireCoffre(cle, valeur) {
  if (!enNatif()) return;
  enAttente = valeur;
  clearTimeout(minuteur);
  minuteur = setTimeout(() => {
    const prefs = preferences();
    const aEcrire = enAttente;
    enAttente = null;
    if (!prefs || aEcrire == null) return;
    Promise.resolve(prefs.set({ key: cle, value: aEcrire })).catch(() => {
      /* coffre indisponible : le localStorage reste, on ne bloque rien */
    });
  }, ATTENTE);
}

/**
 * Vide en cours d'écriture, à appeler quand l'appli passe en arrière-plan :
 * un système qui suspend l'appli n'attendra pas la fin du délai de regroupement.
 */
export function viderEnAttente(cle) {
  if (!enNatif() || enAttente == null) return;
  clearTimeout(minuteur);
  const prefs = preferences();
  const aEcrire = enAttente;
  enAttente = null;
  if (!prefs) return;
  Promise.resolve(prefs.set({ key: cle, value: aEcrire })).catch(() => {});
}
