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

import { cp, mkdir, readFile, writeFile, rm, readdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = join(RACINE, 'web');
const SORTIE = join(RACINE, 'dist', 'ios');

const RELAIS_DEFAUT = 'https://quiz-entre-amis.vercel.app';
const relais = (process.argv.find((a) => a.startsWith('--relais=')) ?? '')
  .split('=').slice(1).join('=') || RELAIS_DEFAUT;

/** Poids d'un dossier, pour vérifier d'un coup d'œil ce qu'on embarque. */
async function poids(chemin) {
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

const remplacer = async (chemin, paires) => {
  let texte = await readFile(chemin, 'utf8');
  for (const [avant, apres] of paires) texte = texte.split(avant).join(apres);
  await writeFile(chemin, texte, 'utf8');
};

async function batir() {
  await rm(SORTIE, { recursive: true, force: true });
  await mkdir(SORTIE, { recursive: true });

  // Le quiz devient la racine.
  await cp(join(WEB, 'quiz'), SORTIE, { recursive: true });
  // Les icônes et les deux modules partagés le suivent, à des places qui ne se
  // heurtent pas au `js/` du quiz.
  await cp(join(WEB, 'icons'), join(SORTIE, 'icons'), { recursive: true });
  await mkdir(join(SORTIE, 'commun'), { recursive: true });
  for (const module of ['ui.js', 'speech.js']) {
    await cp(join(WEB, 'js', module), join(SORTIE, 'commun', module));
  }

  // Le service worker n'a plus lieu d'être : tout est dans le paquet.
  await rm(join(SORTIE, 'sw.js'), { force: true });

  // Les chemins que la remontée d'un cran vient de casser.
  await remplacer(join(SORTIE, 'index.html'), [['../icons/', 'icons/']]);
  await remplacer(join(SORTIE, 'manifest.webmanifest'), [['../icons/', 'icons/']]);
  for (const module of await readdir(join(SORTIE, 'js'))) {
    if (module.endsWith('.js')) {
      await remplacer(join(SORTIE, 'js', module), [['../../js/', '../commun/']]);
    }
  }

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
  console.log(`\nPaquet prêt dans dist/ios/`);
  console.log(`  ${fichiers} fichiers, ${(octets / 1e6).toFixed(1)} Mo`);
  console.log(`  dont audio : ${audio.fichiers} clips, ${(audio.octets / 1e6).toFixed(1)} Mo`);
  console.log(`  relais     : ${relais}`);
  console.log('\nEnsuite, sur un Mac :  npx cap sync ios && npx cap open ios\n');
}

batir().catch((erreur) => {
  console.error(`\nÉchec : ${erreur.message}\n`);
  process.exit(1);
});
