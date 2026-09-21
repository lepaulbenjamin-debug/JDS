// Assemble ce que le site publie.
//
//   node scripts/build-web.mjs
//
// Le dépôt héberge deux applications sous `web/` : le compteur de points à la
// racine, le quiz dans `quiz/`. Servir `web/` en entier — ce qu'on faisait —
// donnait un quizentreamis.fr dont l'adresse de base ouvrait le compteur de
// points, avec tout son code source à disposition.
//
// On ne masque pas le compteur : on ne le publie pas. Le paquet ne contient que
// le quiz, ses modules communs et rien d'autre ; il n'y a donc aucune adresse à
// deviner, aucune règle de réécriture à tenir à jour, et rien qui réapparaisse
// le jour où quelqu'un ajoute un fichier au compteur.
//
// Deux différences avec le paquet natif, et une seule vraie :
//
//  - le service worker reste, puisque la page vient du réseau. Ses chemins sont
//    réécrits comme les autres — sans quoi il précharge deux fichiers qui
//    n'existent plus à cette place, et l'installation échoue en silence ;
//  - toutes les voix restent. Sur le web rien n'est téléchargé avant d'être
//    joué : le choix peut rester entier, contrairement au paquet natif où
//    chaque banque pèse soixante mégaoctets dans la décision d'installer.
//
// L'adresse du relais n'est pas inscrite : l'appli et l'API viennent du même
// serveur, et la chaîne vide veut dire « l'origine courante ».

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { RACINE, assemblerLeQuiz, poids, remplacer } from './paquet-quiz.mjs';

const SORTIE = join(RACINE, 'dist', 'web');

async function batir() {
  await assemblerLeQuiz(SORTIE);

  // Le service worker précharge deux modules partagés, qui ont changé de place.
  await remplacer(join(SORTIE, 'sw.js'), [['../js/', 'commun/']]);

  const { octets, fichiers } = await poids(SORTIE);
  const audio = await poids(join(SORTIE, 'audio'));
  const voix = JSON.parse(await readFile(join(SORTIE, 'audio', 'voix.json'), 'utf8'))
    .voix.map((v) => v.id).join(', ');

  console.log('\nSite prêt dans dist/web/');
  console.log(`  ${fichiers} fichiers, ${(octets / 1e6).toFixed(1)} Mo`);
  console.log(`  dont audio : ${audio.fichiers} clips, ${(audio.octets / 1e6).toFixed(1)} Mo`);
  console.log(`  voix       : ${voix}`);
  console.log('  le compteur de points n’est pas dedans, et c’est le but.\n');
}

batir().catch((erreur) => {
  console.error(`\nÉchec : ${erreur.message}\n`);
  process.exit(1);
});
