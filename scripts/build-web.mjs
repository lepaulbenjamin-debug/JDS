// Assemble ce que le site publie.
//
//   node scripts/build-web.mjs
//
// Deux choses, et une seule adresse :
//
//   /            la page d'accueil, qui existe pour être trouvée — moteurs de
//                recherche, liens partagés, fiche de l'App Store
//   /jouer/      le jeu lui-même
//
// Pourquoi une page d'accueil séparée plutôt que le jeu à la racine : une
// application d'une page, dont tout le contenu apparaît au tap, ne donne à
// indexer qu'un écran de connexion et trois boutons. Ce qui se référence, ce
// sont des phrases — ce que le jeu est, comment on y joue, ce qu'il coûte — et
// ça n'a pas sa place dans l'appli, où ce serait du remplissage.
//
// Deux différences avec le paquet natif, et une seule vraie :
//
//  - le service worker reste, puisque la page vient du réseau ;
//  - toutes les voix restent. Sur le web rien n'est téléchargé avant d'être
//    joué : le choix peut rester entier, contrairement au paquet natif où
//    chaque banque pèse soixante mégaoctets dans la décision d'installer.
//
// L'adresse du relais n'est pas inscrite : l'appli et l'API viennent du même
// serveur, et la chaîne vide veut dire « l'origine courante ».

import { cp, readFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { RACINE, WEB, assemblerLeQuiz, poids, remplacer } from './paquet-quiz.mjs';

const SORTIE = join(RACINE, 'dist', 'web');
const SITE = join(WEB, 'site');

async function batir() {
  // On repart d'un dossier vide : un paquet précédent a pu poser le jeu
  // ailleurs, et un fichier oublié reste servi.
  await rm(SORTIE, { recursive: true, force: true });
  await mkdir(SORTIE, { recursive: true });

  await assemblerLeQuiz(join(SORTIE, 'jouer'));

  // La page d'accueil et ce qui va avec — `robots.txt`, `sitemap.xml`, l'image
  // de partage — par-dessus, à la racine.
  await cp(SITE, SORTIE, { recursive: true });

  const { octets, fichiers } = await poids(SORTIE);
  const audio = await poids(join(SORTIE, 'jouer', 'audio'));
  const voix = JSON.parse(await readFile(join(SORTIE, 'jouer', 'audio', 'voix.json'), 'utf8'))
    .voix.map((v) => v.id).join(', ');

  console.log('\nSite prêt dans dist/web/');
  console.log(`  ${fichiers} fichiers, ${(octets / 1e6).toFixed(1)} Mo`);
  console.log(`  /          la page d’accueil`);
  console.log(`  /jouer/    le jeu — ${audio.fichiers} clips, ${(audio.octets / 1e6).toFixed(1)} Mo, voix : ${voix}`);
  console.log('');
}

batir().catch((erreur) => {
  console.error(`\nÉchec : ${erreur.message}\n`);
  process.exit(1);
});
