// Assemble la PWA en un seul fichier HTML autonome (styles et scripts inclus).
//
//   node scripts/build-single-file.mjs [chemin/de/sortie.html]
//
// Utile pour partager l'appli là où on ne peut poser qu'une page : un artifact,
// une pièce jointe, une clé USB. Le fichier produit est dérivé des sources —
// on ne le modifie pas à la main, on relance le script.
//
// Limites du fichier unique par rapport au dossier `web/` :
//  - pas de service worker, donc pas d'installation ni de fonctionnement
//    hors-ligne (le scoring marche quand même, tout est local) ;
//  - la lecture par IA suppose que la page puisse joindre api.anthropic.com,
//    ce que certains hébergeurs bloquent.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = join(ROOT, 'web');
const OUT = process.argv[2] ?? join(ROOT, 'dist', 'scores-app.html');

// Ordre de dépendance : chaque module ne référence que les précédents.
// La valeur est le nom sous lequel `export default` doit être exposé.
const MODULES = [
  ['js/ui.js', null],
  ['js/store.js', null],
  ['js/speech.js', null],
  ['js/vision-prompt.js', null],
  ['js/ai.js', null],
  ['js/games/papayoo.js', 'papayoo'],
  ['js/games/skyjo.js', 'skyjo'],
  ['js/games/six-qui-prend.js', 'sixQuiPrend'],
  ['js/games/tarot.js', 'tarot'],
  ['js/games/belote.js', 'belote'],
  ['js/games/skull-king.js', 'skullKing'],
  ['js/games/barbu.js', 'barbu'],
  ['js/games/index.js', null],
  ['js/app.js', null],
];

/** Retire les import/export d'un module pour pouvoir tout concaténer. */
function flatten(source, defaultName, file) {
  let code = source
    .replace(/^import\b[^;]*;[ \t]*\r?\n/gm, '')     // import … from '…';
    .replace(/^export\s+(?=(async\s+function|const|let|var|function|class)\b)/gm, '');

  if (/^export\s+default\b/m.test(code)) {
    if (!defaultName) throw new Error(`${file} exporte un défaut sans nom associé.`);
    code = code.replace(/^export\s+default\s+/m, `const ${defaultName} = `);
  }
  if (/^\s*(import|export)\b/m.test(code)) {
    throw new Error(`${file} : import/export non traité, le fichier unique serait cassé.`);
  }
  return `// ===== ${file} =====\n${code.trim()}\n`;
}

const html = readFileSync(join(WEB, 'index.html'), 'utf8');
const css = readFileSync(join(WEB, 'styles.css'), 'utf8');

const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? 'Scores';
const body = html
  .slice(html.indexOf('<body>') + '<body>'.length, html.indexOf('</body>'))
  .replace(/^\s*<script[^>]*><\/script>\s*$/gm, '')
  .trim();

/** Un fichier unique n'a pas de service worker à côté : inutile de le chercher. */
function dropServiceWorker(code) {
  const bloc = /if \('serviceWorker' in navigator\) \{[\s\S]*?\n\}\n?/;
  if (!bloc.test(code)) throw new Error("Bloc du service worker introuvable dans app.js.");
  return code.replace(bloc, '');
}

/**
 * Noms déclarés au premier niveau d'un module.
 * Isolés dans leurs fichiers, deux modules peuvent employer le même nom sans
 * se gêner ; concaténés, ils s'écrasent. Le navigateur le signale par un
 * « Identifier … has already been declared » qui ne dit pas d'où il vient.
 */
function topLevelNames(code) {
  return [...code.matchAll(/^(?:const|let|var|function|async function|class)\s+([A-Za-z_$][\w$]*)/gm)]
    .map((m) => m[1]);
}

const vus = new Map();
const bundle = MODULES
  .map(([file, name]) => {
    let code = readFileSync(join(WEB, file), 'utf8');
    if (file === 'js/app.js') code = dropServiceWorker(code);
    const plat = flatten(code, name, file);

    for (const nom of topLevelNames(plat)) {
      if (vus.has(nom)) {
        throw new Error(
          `Collision de noms : « ${nom} » est déclaré dans ${vus.get(nom)} et dans ${file}.\n`
          + 'Les modules sont concaténés dans un seul script : renommez-en un.',
        );
      }
      vus.set(nom, file);
    }
    return plat;
  })
  .join('\n');

// La page est destinée à un hôte qui fournit lui-même <html>, <head> et <body>.
// Le charset est déclaré quand même : sans lui, une page servie sans en-tête
// d'encodage est décodée au jugé, et le script lui-même devient invalide.
const page = `<meta charset="utf-8">
<title>${title}</title>
<style>
${css.trim()}
</style>

${body}

<script type="module">
${bundle}
</script>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, page);
console.log(`${basename(OUT)} — ${(Buffer.byteLength(page) / 1024).toFixed(1)} Ko`);
