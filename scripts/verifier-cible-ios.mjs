// Vérifie que le projet Xcode compile bien ce qu'il doit compiler.
//
//   node scripts/verifier-cible-ios.mjs
//
// Pourquoi ce script existe : les défauts décrits dans `apple/README.md` sont
// tous MUETS. Un fichier Swift posé dans `ios/App/App/` mais absent de la cible
// n'est pas compilé, et rien ne le dit — ni Xcode, ni `cap sync`, qui ne compte
// que les plugins npm. L'application se construit, se signe, se publie, et :
//
//   - sans `SessionAudio.swift`, l'animateur est muet dès que le téléphone est
//     en silencieux ;
//   - sans `AchatsPlugin.swift`, la boutique se croit sur le web et n'affiche
//     aucun bouton d'achat ;
//   - sans `CompteApplePlugin.swift`, « Se connecter avec Apple » ne fait rien ;
//   - sans `PrivacyInfo.xcprivacy`, le dépôt est refusé avant la revue.
//
// Les trois premiers ne se découvrent qu'en soirée, sur un vrai téléphone. Le
// dernier se découvre après l'archive et le téléversement. D'où cette
// vérification, qui coûte une milliseconde et tourne avant chaque build.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const PROJET = join('ios', 'App', 'App.xcodeproj', 'project.pbxproj');

// Xcode écrit une entrée `PBXBuildFile` par fichier réellement construit, et la
// commente avec « <nom> in <phase> ». Un fichier seulement RÉFÉRENCÉ, lui,
// n'apparaît que dans `PBXFileReference` — c'est exactement la différence
// qu'on cherche, et la seule que le disque ne montre pas.
const SOURCES = [
  'SessionAudio.swift',
  'AchatsPlugin.swift',
  'CompteApplePlugin.swift',
  'CompteGooglePlugin.swift',
];
const RESSOURCES = ['PrivacyInfo.xcprivacy'];

/** Les fichiers attendus qui ne sont pas construits, d'après le pbxproj. */
export function manquantsDansLaCible(pbxproj) {
  const absent = (nom, phase) => !pbxproj.includes(`${nom} in ${phase} */`);
  return [
    ...SOURCES.filter((nom) => absent(nom, 'Sources')),
    ...RESSOURCES.filter((nom) => absent(nom, 'Resources')),
  ];
}

async function verifier() {
  let pbxproj;
  try {
    pbxproj = await readFile(PROJET, 'utf8');
  } catch {
    console.error(`\nLe projet natif est absent : ${PROJET} introuvable.`);
    console.error('\nIl s’engendre une fois, sur un Mac, et se versionne ensuite :');
    console.error('  npm run ios:add');
    console.error('  puis les étapes d’apple/README.md, section « Les trois choses à faire dans Xcode »');
    console.error('  puis  git add ios && git commit\n');
    process.exit(1);
  }

  const manquants = manquantsDansLaCible(pbxproj);
  if (manquants.length) {
    console.error('\nCes fichiers ne sont PAS construits par la cible App :\n');
    for (const nom of manquants) console.error(`  - ${nom}`);
    console.error('\nLes poser dans ios/App/App/ ne suffit pas : il faut les ajouter à la');
    console.error('cible. Xcode › File › Add Files to "App"… en décochant « Copy items if');
    console.error('needed » et en cochant la cible « App ». Le détail est dans');
    console.error('apple/README.md, section « 1 bis ».\n');
    process.exit(1);
  }

  console.log(`Cible iOS : ${SOURCES.length + RESSOURCES.length} fichiers bien construits.`);
}

if (process.argv[1]?.endsWith('verifier-cible-ios.mjs')) verifier();
