// La racine des deux paquets :
//
//   dist/ios/   pour l'application native
//   dist/web/   pour le site
//
// Les deux commencent pareil — le quiz devient la racine — puis divergent : le
// paquet natif grave l'adresse du relais et jette le service worker, le paquet
// web garde les deux.
//
// Une seule fabrique parce qu'une divergence serait silencieuse : le paquet
// cassé serait justement celui qu'on ne reconstruit pas ce jour-là.
//
// Cette fabrique a longtemps fait davantage. Le dépôt hébergeait aussi un
// compteur de points, et `ui.js` et `speech.js` vivaient dans un `web/js/`
// partagé que le quiz atteignait par `../../js/` ; il fallait les recopier dans
// un `commun/` et réécrire ce chemin dans chaque module. Le compteur est parti
// dans son propre dépôt, les deux modules sont rentrés dans `web/quiz/js/`, et
// il ne reste plus qu'une copie.

import { cp, mkdir, readFile, writeFile, rm, readdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
export const WEB = join(RACINE, 'web');

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

/** Le quiz, à la racine du dossier donné. */
export async function assemblerLeQuiz(sortie) {
  await rm(sortie, { recursive: true, force: true });
  await mkdir(sortie, { recursive: true });
  await cp(join(WEB, 'quiz'), sortie, { recursive: true });
}
