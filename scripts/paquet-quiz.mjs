// Assembler le quiz tout seul, détaché du compteur de points.
//
// Le dépôt héberge deux applications qui partagent deux modules — `ui.js` et
// `speech.js` — et le quiz les atteint en remontant d'un cran : `../../js/`.
// C'est très bien tant qu'on sert `web/` en entier, et c'est précisément ce
// qu'on ne veut plus : sur quizentreamis.fr, l'adresse de base doit ouvrir le
// quiz, et le compteur de points n'a rien à y faire — ni à sa racine, ni à ses
// anciennes adresses, ni dans le code source livré au navigateur.
//
// D'où cette fabrique, partagée par les deux paquets :
//
//   dist/ios/   pour l'application native
//   dist/web/   pour le site
//
// Les deux commencent pareil — le quiz devient la racine, les deux modules
// partagés le suivent dans `commun/` — puis divergent : le paquet natif grave
// l'adresse du relais et jette le service worker, le paquet web garde les deux.
//
// Une seule fabrique parce qu'une divergence serait silencieuse : renommer un
// module partagé casserait un paquet sur deux, et le paquet cassé serait
// justement celui qu'on ne reconstruit pas ce jour-là.

import { cp, mkdir, readFile, writeFile, rm, readdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
export const WEB = join(RACINE, 'web');

/** Les modules que les deux applications se partagent, et rien d'autre. */
export const MODULES_COMMUNS = ['ui.js', 'speech.js'];

/** Poids d'un dossier, pour vérifier d'un coup d'œil ce qu'on embarque. */
export async function poids(chemin) {
  let total = 0;
  let fichiers = 0;
  for (const entree of await readdir(chemin, { withFileTypes: true })) {
    const complet = join(chemin, entree.name);
    if (entree.isDirectory()) {
      const sous = await poids(complet);
      total += sous.octets;
      fichiers += sous.fichiers;
    } else {
      total += (await stat(complet)).size;
      fichiers += 1;
    }
  }
  return { octets: total, fichiers };
}

export const remplacer = async (chemin, paires) => {
  let texte = await readFile(chemin, 'utf8');
  for (const [avant, apres] of paires) texte = texte.split(avant).join(apres);
  await writeFile(chemin, texte, 'utf8');
};

/**
 * Le quiz, seul, à la racine du dossier donné.
 *
 * Rien du compteur de points n'entre ici : ni sa page, ni ses scripts, ni ses
 * icônes. Seuls les deux modules communs suivent, et sous un nom qui ne se
 * heurte pas au `js/` du quiz.
 */
export async function assemblerLeQuiz(sortie) {
  await rm(sortie, { recursive: true, force: true });
  await mkdir(sortie, { recursive: true });

  await cp(join(WEB, 'quiz'), sortie, { recursive: true });

  await mkdir(join(sortie, 'commun'), { recursive: true });
  for (const module of MODULES_COMMUNS) {
    await cp(join(WEB, 'js', module), join(sortie, 'commun', module));
  }

  // Les chemins que la remontée d'un cran vient de casser.
  for (const module of await readdir(join(sortie, 'js'))) {
    if (module.endsWith('.js')) {
      await remplacer(join(sortie, 'js', module), [['../../js/', '../commun/']]);
    }
  }
}
