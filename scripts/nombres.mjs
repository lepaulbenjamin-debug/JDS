// Écrire les nombres en toutes lettres, pour la voix seulement.
//
// « 1665 marches » se lit très bien à l'écran, mais le modèle de synthèse l'a
// prononcé « seize, soixante-cinq » : il l'a pris pour une année. Le problème
// vient donc des quantités qui ressemblent à des dates, et il n'a rien à voir
// avec l'affichage — la banque doit continuer d'écrire des chiffres.
//
// D'où ce module, branché sur le seul chemin de l'audio : ce qui part au
// modèle est écrit en lettres, ce qui s'affiche garde ses chiffres.
//
// Le parti pris est d'écrire TOUS les entiers, années comprises. « Mille neuf
// cent quatre-vingt-neuf » se dit aussi naturellement que « dix-neuf cent
// quatre-vingt-neuf », et une règle uniforme vaut mieux qu'une heuristique
// qui devinerait à tort qu'un nombre à quatre chiffres est une date.

const UNITES = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf',
];

const DIZAINES = {
  20: 'vingt', 30: 'trente', 40: 'quarante', 50: 'cinquante', 60: 'soixante',
};

/**
 * De 0 à 99.
 *
 * `final` dit si le nombre termine l'écriture : « quatre-vingts » prend son s
 * tout seul, mais le perd dès qu'il est suivi de quelque chose — quatre-vingt
 * mille, quatre-vingt-deux.
 */
function sousCent(n, final) {
  if (n < 20) return UNITES[n];
  if (n < 70) {
    const dizaine = Math.floor(n / 10) * 10;
    const unite = n % 10;
    if (unite === 0) return DIZAINES[dizaine];
    if (unite === 1) return `${DIZAINES[dizaine]} et un`;
    return `${DIZAINES[dizaine]}-${UNITES[unite]}`;
  }
  if (n < 80) {
    // 70 à 79 : soixante, puis dix à dix-neuf.
    const reste = n - 60;
    return reste === 11 ? 'soixante et onze' : `soixante-${UNITES[reste]}`;
  }
  const reste = n - 80;
  if (reste === 0) return final ? 'quatre-vingts' : 'quatre-vingt';
  // Pas de « et » ici : quatre-vingt-un, et non quatre-vingt et un.
  return `quatre-vingt-${UNITES[reste]}`;
}

/** De 0 à 999. Même règle du s pour « cent » que pour « vingt ». */
function sousMille(n, final) {
  if (n < 100) return sousCent(n, final);
  const centaines = Math.floor(n / 100);
  const reste = n % 100;
  if (reste === 0) {
    if (centaines === 1) return 'cent';
    return final ? `${UNITES[centaines]} cents` : `${UNITES[centaines]} cent`;
  }
  const tete = centaines === 1 ? 'cent' : `${UNITES[centaines]} cent`;
  return `${tete} ${sousCent(reste, final)}`;
}

/** Un entier de 0 à 999 999, en toutes lettres. */
export function entierEnLettres(n) {
  if (!Number.isInteger(n) || n < 0) return String(n);
  if (n === 0) return 'zéro';
  if (n >= 1_000_000) return String(n);          // hors de portée : on n'y touche pas

  const milliers = Math.floor(n / 1000);
  const reste = n % 1000;
  let sortie = '';
  // « mille » est invariable, et « un mille » ne se dit pas.
  if (milliers === 1) sortie = 'mille';
  else if (milliers > 1) sortie = `${sousMille(milliers, false)} mille`;
  if (reste > 0) sortie = sortie ? `${sortie} ${sousMille(reste, true)}` : sousMille(reste, true);
  return sortie;
}

/** Un décimal simple : 1,21 devient « un virgule vingt et un ». */
export function nombreEnLettres(texte) {
  const [entier, decimale] = String(texte).split(',');
  const gauche = entierEnLettres(Number(entier));
  if (decimale == null) return gauche;
  return `${gauche} virgule ${entierEnLettres(Number(decimale))}`;
}

/**
 * Un ordinal : 1ᵉʳ, 1ʳᵉ, 2ᵉ, 21ᵉ. Le modèle bute dessus (« un-er janvier »),
 * et la règle française tient en trois exceptions.
 */
export function ordinalEnLettres(n, feminin) {
  if (n === 1) return feminin ? 'première' : 'premier';
  const base = entierEnLettres(n);
  return `${base
    // Seuls « vingts » et « cents » perdent leur s : « trois » garde le sien,
    // sans quoi troisième devenait « troiième ».
    .replace(/(vingt|cent)s$/, '$1')
    .replace(/e$/, '')          // quatre → quatr, onze → onz, trente → trent
    .replace(/q$/, 'qu')        // cinq → cinqu
    .replace(/f$/, 'v')}ième`;  // neuf → neuv
}

// « 1ᵉʳ », « 1er », « 2ᵉ », « 3ème » : le nombre, puis sa terminaison.
const ORDINAL = /(\d+)(ᵉʳ|ʳᵉ|ᵉ|ers?\b|res?\b|ères?\b|èmes?\b|es?\b)/gu;

// Les espaces qui séparent les milliers : ordinaire, insécable, fine insécable.
// Écrites en échappements : invisibles dans un fichier, elles se perdent au
// premier copier-coller.
const SEPARATEUR = '[ \\u00a0\\u202f]';

// Un nombre écrit : chiffres, séparateurs de milliers éventuels, et une
// décimale à la virgule. La virgule suivie d'une espace n'en fait pas partie —
// « 1789, 1914 » reste deux nombres.
const NOMBRE = new RegExp(`\\d+(?:${SEPARATEUR}\\d{3})*(?:,\\d+)?`, 'g');
const ESPACES = new RegExp(SEPARATEUR, 'g');

/**
 * Un nombre collé à des lettres n'est pas une quantité, c'est un nom : U2,
 * UB40, le 221B de Baker Street, les B-52's, l'été ’69. Les écrire en lettres
 * donnerait « Udeux » et « deux cent vingt et unB ». On les laisse tranquilles.
 *
 * Le tiret ne compte que s'il suit une lettre : « B-52 » est un nom, alors que
 * « 1939-1945 » reste deux nombres.
 */
function colleADesLettres(texte, debut, fin) {
  const avant = texte.slice(0, debut);
  const apres = texte.slice(fin);
  if (/[\p{L}’']$/u.test(avant)) return true;
  if (/\p{L}-$/u.test(avant)) return true;
  return /^\p{L}/u.test(apres);
}

/**
 * Réécrit tous les nombres d'un texte en toutes lettres.
 *
 * À n'appliquer qu'au texte destiné à la synthèse. L'écran, lui, garde ses
 * chiffres : « 42 195 mètres » se lit d'un coup d'œil, « quarante-deux mille
 * cent quatre-vingt-quinze mètres » non.
 */
export function direLesNombres(texte) {
  // Les ordinaux d'abord : « 1ᵉʳ » doit devenir « premier » avant que la règle
  // des nombres ne voie un 1 collé à des lettres et ne le laisse tel quel.
  const source = String(texte ?? '').replace(ORDINAL, (brut, chiffres, suffixe) => {
    const n = Number(chiffres);
    if (!Number.isInteger(n) || n < 1) return brut;
    return ordinalEnLettres(n, /^(ʳᵉ|res?$|ères?$)/u.test(suffixe));
  });
  return source.replace(NOMBRE, (brut, position) => {
    if (colleADesLettres(source, position, position + brut.length)) return brut;
    const propre = brut.replace(ESPACES, '');
    const valeur = Number(propre.replace(',', '.'));
    if (!Number.isFinite(valeur)) return brut;
    return nombreEnLettres(propre);
  });
}
