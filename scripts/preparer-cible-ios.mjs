// Fait dans le projet Xcode ce qu'on faisait à la souris.
//
//   npm run ios:preparer
//
// Les trois choses d'`apple/README.md` sont toutes des modifications de
// fichiers : rien n'oblige à passer par les menus d'Xcode, et tout ce qui passe
// par les menus se refait à la main au prochain `cap add ios`. Ce script les
// applique, il est idempotent, et `npm run ios:verifier` dit ensuite si la
// cible construit bien ce qu'elle doit construire.
//
// Ce qu'il fait, et pourquoi chacun compte :
//
//   1. copie les sources d'`apple/` dans `ios/App/App/` ;
//   2. ajoute `SessionAudio.activer()` dans l'AppDelegate — sans elle,
//      l'animateur est muet dès que le téléphone est en silencieux, et rien ne
//      le signale ;
//   3. déclare les cinq fichiers dans la CIBLE. Les poser sur le disque ne
//      suffit pas : Xcode ne compile que ce que le projet déclare, et un
//      fichier présent mais non déclaré ne produit aucune erreur ;
//   4. écrit les droits « Sign in with Apple » et les rattache à la cible ;
//   5. déclare le schéma d'URL de Google, sans quoi la page de connexion
//      s'ouvre et ne revient jamais ;
//   6. passe la cible en iPhone seul et en portrait seul.
//
// Ce qu'il ne fait PAS, parce que cela ne vit pas dans le projet : activer la
// capacité « Sign in with Apple » sur l'identifiant d'app dans le portail
// développeur. Sans elle, la signature échoue avec un message qui la nomme.

import { readFile, writeFile, copyFile, readdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const APPLE = join(RACINE, 'apple');
const CIBLE = join(RACINE, 'ios', 'App', 'App');
const PBXPROJ = join(RACINE, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

// L'identifiant client iOS, dont le schéma inversé se déduit.
const CLIENT_GOOGLE = '1054167637145-93loo4s7vnuv5nb534bnh2risdc3svee.apps.googleusercontent.com';
const SCHEMA_GOOGLE = CLIENT_GOOGLE.split('.').reverse().join('.');

const existe = (chemin) => access(chemin).then(() => true, () => false);

/**
 * Un identifiant d'objet Xcode : 24 caractères hexadécimaux majuscules.
 *
 * Dérivé du nom plutôt que tiré au sort, pour que relancer le script ne
 * réécrive rien — un pbxproj qui change à chaque exécution rendrait tout diff
 * illisible, et masquerait la modification qu'on cherche vraiment à relire.
 */
const identifiant = (graine) => createHash('sha1')
  .update(`quizentreamis:${graine}`).digest('hex').slice(0, 24).toUpperCase();

/* --- 1. Les sources ------------------------------------------------------- */

async function copierLesSources() {
  const fichiers = (await readdir(APPLE)).filter(
    // L'exemple d'AppDelegate se lit et se compare, il ne se compile pas :
    // copié dans la cible, il redéclarerait `didFinishLaunchingWithOptions`.
    (f) => (f.endsWith('.swift') && f !== 'AppDelegate-exemple.swift') || f.endsWith('.xcprivacy'),
  );
  for (const f of fichiers) await copyFile(join(APPLE, f), join(CIBLE, f));
  return fichiers.sort();
}

/* --- 2. L'AppDelegate ----------------------------------------------------- */

const LIGNE_AUDIO = '        SessionAudio.activer()';

async function activerLaSessionAudio() {
  const chemin = join(CIBLE, 'AppDelegate.swift');
  const source = await readFile(chemin, 'utf8');
  if (source.includes('SessionAudio.activer()')) return 'déjà en place';

  // DANS la méthode, pas à la suite du fichier : redéclarer
  // `didFinishLaunchingWithOptions` est une erreur de compilation.
  const ancre = 'didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {';
  const i = source.indexOf(ancre);
  if (i === -1) throw new Error('AppDelegate.swift : didFinishLaunchingWithOptions introuvable.');

  const apres = i + ancre.length;
  const commentaire = '\n        // Sans elle, l’animateur est muet quand le téléphone est en silencieux.';
  await writeFile(chemin, source.slice(0, apres) + commentaire + '\n' + LIGNE_AUDIO + source.slice(apres), 'utf8');
  return 'ajoutée';
}

/* --- 3. La cible ---------------------------------------------------------- */

const TYPES = {
  '.swift': 'sourcecode.swift',
  '.xcprivacy': 'text.xml',
  '.entitlements': 'text.plist.entitlements',
};
const extension = (nom) => nom.slice(nom.lastIndexOf('.'));

/** Ajoute une entrée dans une liste du pbxproj, en gardant l'indentation. */
function inserer(texte, ancre, ligne) {
  if (texte.includes(ligne.trim())) return texte;
  const i = texte.indexOf(ancre);
  if (i === -1) throw new Error(`pbxproj : ancre introuvable — ${ancre.slice(0, 48)}`);
  const fin = i + ancre.length;
  return texte.slice(0, fin) + '\n' + ligne + texte.slice(fin);
}

async function declarerDansLaCible(fichiers) {
  let p = await readFile(PBXPROJ, 'utf8');
  const ajoutes = [];

  for (const nom of fichiers) {
    const ext = extension(nom);
    const type = TYPES[ext];
    if (!type) throw new Error(`type inconnu pour ${nom}`);

    const refId = identifiant(`ref:${nom}`);
    const buildId = identifiant(`build:${nom}`);
    // Les droits ne se construisent pas : ils se désignent par un réglage.
    const phase = ext === '.swift' ? 'Sources' : ext === '.xcprivacy' ? 'Resources' : null;

    if (p.includes(`/* ${nom} */ = {isa = PBXFileReference`)) continue;
    ajoutes.push(nom);

    p = inserer(p, '/* Begin PBXFileReference section */',
      `\t\t${refId} /* ${nom} */ = {isa = PBXFileReference; lastKnownFileType = ${type}; path = ${nom}; sourceTree = "<group>"; };`);

    // Le groupe « App » : c'est ce qui rend le fichier visible dans Xcode.
    p = inserer(p, '504EC3061FED79650016851F /* App */ = {\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (',
      `\t\t\t\t${refId} /* ${nom} */,`);

    if (!phase) continue;

    p = inserer(p, '/* Begin PBXBuildFile section */',
      `\t\t${buildId} /* ${nom} in ${phase} */ = {isa = PBXBuildFile; fileRef = ${refId} /* ${nom} */; };`);

    const ancrePhase = phase === 'Sources'
      ? '504EC3001FED79650016851F /* Sources */ = {\n\t\t\tisa = PBXSourcesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = ('
      : '504EC3021FED79650016851F /* Resources */ = {\n\t\t\tisa = PBXResourcesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (';
    p = inserer(p, ancrePhase, `\t\t\t\t${buildId} /* ${nom} in ${phase} */,`);
  }

  await writeFile(PBXPROJ, p, 'utf8');
  return ajoutes;
}

/* --- 4. Les droits, 6. la cible ------------------------------------------- */

const DROITS = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>com.apple.developer.applesignin</key>
\t<array>
\t\t<string>Default</string>
\t</array>
</dict>
</plist>
`;

async function reglerLaCible() {
  await writeFile(join(CIBLE, 'App.entitlements'), DROITS, 'utf8');

  let p = await readFile(PBXPROJ, 'utf8');
  const change = [];

  // iPhone seulement : sinon Apple teste l'application sur iPad et juge une
  // mise en page qui n'a jamais été faite pour lui.
  if (p.includes('TARGETED_DEVICE_FAMILY = "1,2";')) {
    p = p.split('TARGETED_DEVICE_FAMILY = "1,2";').join('TARGETED_DEVICE_FAMILY = 1;');
    change.push('iPhone seulement');
  }

  // Les droits s'appliquent aux DEUX configurations : n'en régler qu'une donne
  // une application qui se connecte en développement et pas en production.
  if (!p.includes('CODE_SIGN_ENTITLEMENTS')) {
    p = p.split('INFOPLIST_FILE = App/Info.plist;')
      .join('CODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n\t\t\t\tINFOPLIST_FILE = App/Info.plist;');
    change.push('Sign in with Apple');
  }

  await writeFile(PBXPROJ, p, 'utf8');
  return change;
}

/* --- 5. Le schéma d'URL, et le portrait ----------------------------------- */

async function reglerInfoPlist() {
  const chemin = join(CIBLE, 'Info.plist');
  let plist = await readFile(chemin, 'utf8');
  const change = [];

  if (!plist.includes(SCHEMA_GOOGLE)) {
    const bloc = `\t<key>CFBundleURLTypes</key>
\t<array>
\t\t<dict>
\t\t\t<key>CFBundleURLSchemes</key>
\t\t\t<array>
\t\t\t\t<string>${SCHEMA_GOOGLE}</string>
\t\t\t</array>
\t\t</dict>
\t</array>
`;
    const i = plist.lastIndexOf('</dict>\n</plist>');
    if (i === -1) throw new Error('Info.plist : fin du fichier inattendue.');
    plist = plist.slice(0, i) + bloc + plist.slice(i);
    change.push('schéma d’URL Google');
  }

  // Portrait seulement : le jeu est écrit pour un téléphone tenu debout, et
  // une rotation en pleine manche déplace les réponses sous le pouce.
  const paysage = `\t<key>UISupportedInterfaceOrientations</key>
\t<array>
\t\t<string>UIInterfaceOrientationPortrait</string>
\t\t<string>UIInterfaceOrientationLandscapeLeft</string>
\t\t<string>UIInterfaceOrientationLandscapeRight</string>
\t</array>`;
  if (plist.includes(paysage)) {
    plist = plist.replace(paysage, `\t<key>UISupportedInterfaceOrientations</key>
\t<array>
\t\t<string>UIInterfaceOrientationPortrait</string>
\t</array>`);
    change.push('portrait seulement');
  }

  await writeFile(chemin, plist, 'utf8');
  return change;
}

/* -------------------------------------------------------------------------- */

async function preparer() {
  if (!(await existe(PBXPROJ))) {
    console.error('\nLe projet natif est absent. Sur un Mac :\n');
    console.error('  npm run ios:add\n  npm run ios:preparer\n');
    process.exit(1);
  }

  const copies = await copierLesSources();
  console.log(`\nSources copiées      : ${copies.join(', ')}`);
  console.log(`Session audio        : ${await activerLaSessionAudio()}`);

  const declares = await declarerDansLaCible([...copies, 'App.entitlements']);
  console.log(`Ajoutés à la cible   : ${declares.length ? declares.join(', ') : 'rien de neuf'}`);

  const cible = await reglerLaCible();
  const info = await reglerInfoPlist();
  console.log(`Réglages             : ${[...cible, ...info].join(', ') || 'déjà en place'}`);

  console.log('\nIl reste UNE chose, qui ne vit pas dans le projet :');
  console.log('  activer « Sign in with Apple » sur l’identifiant fr.quizentreamis.app');
  console.log('  dans le portail développeur Apple. Sans elle, la signature échoue.');
  console.log('\nEnsuite :  npm run ios:verifier\n');
}

if (process.argv[1]?.endsWith('preparer-cible-ios.mjs')) preparer();
