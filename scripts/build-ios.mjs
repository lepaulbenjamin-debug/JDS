// Assemble ce que l'application native embarque.
//
//   node scripts/build-ios.mjs [--relais=https://…]
//
// Capacitor sert un dossier depuis le paquet de l'application : sa racine doit
// être le quiz, et lui seul. Le dépôt, lui, héberge deux applications sous
// `web/` — copier le tout embarquerait le compteur de points et sa clé d'API
// dans une appli de quiz, pour rien.
//
// D'où ce script plutôt qu'une copie : il ne prend que ce dont le quiz a
// besoin, remonte les fichiers partagés dans `commun/`, et réécrit les trois
// chemins que ce déplacement casse.
//
// Trois différences assumées avec la version web :
//
//  - le relais est nommé en dur. Sur le web, l'appli et l'API viennent du même
//    serveur ; dans l'application, la page vit sur `capacitor://localhost`, où
//    il n'y a aucune API.
//  - pas de service worker. Tout est déjà dans le paquet, et un cache qui
//    doublerait le paquet ne pourrait que servir une version périmée.
//  - pas de réglage « adresse du relais ». Utile en développement, c'est dans
//    une application publiée un bouton pour tout casser.

import { readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { RACINE, assemblerLeQuiz, poids, remplacer } from './paquet-quiz.mjs';
import { poserLIconeIOS } from './icones-ios.mjs';

const SORTIE = join(RACINE, 'dist', 'ios');

// L'adresse est GRAVÉE dans le paquet : une application déjà installée
// continuera de l'appeler, et le jour où elle ne répondrait plus, ces
// installations-là s'arrêteraient de fonctionner sans mise à jour. C'est donc un
// choix définitif, à faire avant la première soumission — d'où le domaine
// propre plutôt que le sous-domaine `.vercel.app`, qui dépend d'un hébergeur.
//
// `www` et non l'apex : `quizentreamis.fr` répond 308 vers `www`, et chaque
// battement de la partie — toutes les 450 ms sur la régie — passerait par cette
// redirection. Doublement de la latence sur le chemin le plus chaud du jeu, et
// un en-tête `Authorization` qui n'a aucune raison de survivre à un saut
// d'hôte. On vise donc l'hôte canonique, celui qui répond pour de bon.
const RELAIS_DEFAUT = 'https://www.quizentreamis.fr';
const relais = (process.argv.find((a) => a.startsWith('--relais=')) ?? '')
  .split('=').slice(1).join('=') || RELAIS_DEFAUT;

/**
 * Une seule banque de voix dans le paquet, sauf demande contraire.
 *
 *   --voix=toutes        les embarquer toutes
 *   --voix=coral,cedar   celles-là
 *
 * Chaque voix pèse une soixantaine de mégaoctets. Les embarquer toutes double
 * le poids de l'application pour un réglage que personne n'ouvrira — et le
 * poids d'une application se paie deux fois : à la revue, et dans la décision
 * d'installer. Sur le web la question ne se pose pas, rien n'est téléchargé
 * avant d'être joué : c'est là que le choix reste entier.
 *
 * L'index est réécrit en conséquence : proposer une voix absente du paquet
 * rendrait l'animateur muet, sans rien signaler.
 */
async function taillerLesVoix() {
  const dossier = join(SORTIE, 'audio');
  let index;
  try {
    index = JSON.parse(await readFile(join(dossier, 'voix.json'), 'utf8'));
  } catch {
    return;                                   // pas de banque : rien à tailler
  }

  const demande = (process.argv.find((a) => a.startsWith('--voix=')) ?? '').split('=')[1];
  const garder = demande === 'toutes'
    ? index.voix.map((v) => v.id)
    : demande ? demande.split(',').map((v) => v.trim()).filter(Boolean)
      : [index.defaut].filter(Boolean);

  for (const voix of index.voix) {
    if (!garder.includes(voix.id)) await rm(join(dossier, voix.id), { recursive: true, force: true });
  }

  const restantes = index.voix.filter((v) => garder.includes(v.id));
  await writeFile(join(dossier, 'voix.json'), `${JSON.stringify({
    defaut: garder.includes(index.defaut) ? index.defaut : restantes[0]?.id ?? null,
    voix: restantes,
  }, null, 2)}\n`, 'utf8');

  return restantes.map((v) => v.id);
}

async function batir() {
  // Le quiz seul, à la racine, avec ses modules communs : la même fabrique que
  // pour le site.
  await assemblerLeQuiz(SORTIE);

  // Le service worker n'a plus lieu d'être : tout est dans le paquet.
  await rm(join(SORTIE, 'sw.js'), { force: true });

  const voixEmbarquees = await taillerLesVoix();

  let page = await readFile(join(SORTIE, 'index.html'), 'utf8');

  // Le relais, inscrit avant le premier script qui pourrait l'interroger.
  page = page.replace(
    '<script type="module" src="js/app.js"></script>',
    `<script>window.QUIZ_RELAIS = ${JSON.stringify(relais)};</script>\n`
    + '  <script type="module" src="js/app.js"></script>',
  );

  // Le réglage « adresse du relais » : le bloc entier, pas seulement le champ.
  const debut = page.indexOf('<details class="reglage-avance">\n      <summary>Le relais');
  if (debut !== -1) {
    const fin = page.indexOf('</details>', debut) + '</details>'.length;
    page = page.slice(0, debut) + page.slice(fin);
  }
  await writeFile(join(SORTIE, 'index.html'), page, 'utf8');

  // Le service worker est référencé depuis l'appli : sans ce retrait, elle
  // tenterait d'enregistrer un fichier absent à chaque lancement.
  await remplacer(join(SORTIE, 'js', 'app.js'), [
    ["if ('serviceWorker' in navigator) {", 'if (false) {'],
  ]);

  const { octets, fichiers } = await poids(SORTIE);
  const audio = await poids(join(SORTIE, 'audio'));

  // L'icône, reposée à chaque build : `cap sync` ne la touche pas, et le
  // catalogue d'Xcode retomberait sur le carré gris du gabarit de Capacitor.
  const icone = await poserLIconeIOS(RACINE);

  console.log(`\nPaquet prêt dans dist/ios/`);
  console.log(`  ${fichiers} fichiers, ${(octets / 1e6).toFixed(1)} Mo`);
  console.log(`  dont audio : ${audio.fichiers} clips, ${(audio.octets / 1e6).toFixed(1)} Mo`);
  console.log(`  voix       : ${voixEmbarquees?.join(', ') ?? 'aucune'}  (--voix=toutes pour toutes les embarquer)`);
  console.log(`  relais     : ${relais}`);
  console.log(`  icône      : ${icone.message}`);
  console.log('\nEnsuite, sur un Mac :  npm run ios:sync && npm run ios:open\n');
}

batir().catch((erreur) => {
  console.error(`\nÉchec : ${erreur.message}\n`);
  process.exit(1);
});
