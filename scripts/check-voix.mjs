// Qu'est-ce que la personne entend, vraiment ?
//
//   node scripts/check-voix.mjs
//
// Ce banc d'essai existe à cause d'une panne qu'aucun autre test ne pouvait
// voir. Sur l'iPhone, l'animateur parlait avec la voix de synthèse du téléphone
// au lieu des clips embarqués. Rien ne le signalait : le repli sur la synthèse
// est le comportement PRÉVU quand la banque manque, donc la panne se présentait
// exactement comme une installation sans clips. Aucune erreur, aucun log, et
// une suite de tests qui reste verte.
//
// La seule mesure qui répond à la question est la sortie audio elle-même. On
// joue donc une vraie partie solo sur le paquet iOS, et on regarde qui parle :
// les fichiers, ou la synthèse.
//
// Le serveur ment sur commande, parce que les installations à couvrir existent
// toutes en vrai :
//
//   complet         le paquet tel qu'il est livré          → clips
//   manifeste-lent  la réponse traîne, le tap arrive avant → clips quand même
//   sans-clips      le manifeste seul, les mp3 absents     → synthèse, et on le dit
//   sans-manifeste  une installation sans voix             → synthèse
//
// Le cas « manifeste-lent » est celui qui a mordu : en solo la partie démarre
// au premier tap, sans salon ni attente, donc la première phrase partait avant
// que la banque soit connue.
//
// Playwright n'est pas une dépendance du projet : il ferait télécharger un
// navigateur à chaque `npm install`, pour un banc d'essai qu'on lance à la
// main. À installer au besoin :
//
//   npm i -D playwright && npx playwright install chromium

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'ios');

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.mp3': 'audio/mpeg',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml',
};

function servir(mode) {
  const app = createServer(async (req, res) => {
    const chemin = decodeURIComponent(req.url.split('?')[0]);
    const cible = chemin === '/' ? '/index.html' : chemin;

    if (mode === 'sans-manifeste' && cible === '/audio/manifeste.json') return res.writeHead(404).end();
    if (mode === 'sans-clips' && cible.endsWith('.mp3')) return res.writeHead(404).end();
    if (mode === 'manifeste-lent' && cible === '/audio/manifeste.json') {
      await new Promise((ok) => setTimeout(ok, 1200));
    }

    try {
      const corps = await readFile(join(RACINE, cible));
      res.writeHead(200, { 'content-type': TYPES[extname(cible)] ?? 'application/octet-stream' });
      res.end(corps);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((ok) => app.listen(0, () => ok([app, app.address().port])));
}

/**
 * Le mouchard, posé avant tout script de la page.
 *
 * On instrumente les prototypes plutôt que de remplacer `speechSynthesis` :
 * l'accesseur de `window` est en lecture seule, et un faux objet posé par-dessus
 * ne prend pas. Chromium n'a par ailleurs aucune voix installée — il n'émet
 * jamais `end`, et refuse une voix qui n'est pas une vraie
 * SpeechSynthesisVoice. D'où les deux prothèses ci-dessous : sans elles, c'est
 * le banc d'essai qui échoue, pas l'application.
 */
const MOUCHARD = () => {
  window.__trace = { clips: [], synthese: [], echecs: [] };

  const jouer = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    // L'instant compte autant que l'identifiant : c'est l'écart entre deux
    // lectures qui dit si la première a eu le temps d'aller au bout.
    window.__trace.clips.push({ id: this.getAttribute('src') ?? this.src, t: Date.now() });
    return jouer.apply(this, args).catch((erreur) => {
      window.__trace.echecs.push(erreur.name);
      throw erreur;
    });
  };

  SpeechSynthesis.prototype.speak = function (enonce) {
    window.__trace.synthese.push(enonce.text);
    setTimeout(() => enonce.dispatchEvent(new Event('end')), 5);
  };
  SpeechSynthesis.prototype.getVoices = () => [
    { name: 'Test FR', lang: 'fr-FR', voiceURI: 'test-fr', localService: true, default: true },
  ];
  Object.defineProperty(SpeechSynthesisUtterance.prototype, 'voice', {
    get: () => null, set: () => {}, configurable: true,
  });
};

async function essai(chromium, mode, secondes) {
  const [app, port] = await servir(mode);
  const nav = await chromium.launch({
    // Le navigateur d'un environnement qui en fournit déjà un, plutôt que d'en
    // télécharger un second : `CHROMIUM=/chemin/vers/chrome`.
    executablePath: process.env.CHROMIUM || undefined,
    // Sans ça, la lecture d'un clip attend un geste utilisateur qu'aucun script
    // ne peut donner — et le test mesurerait sa propre limite.
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const page = await nav.newPage();
  await page.addInitScript(MOUCHARD);
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));

  await page.goto(`http://127.0.0.1:${port}/`);
  // La voix n'est active par défaut que sur la régie — ce qui est le cas en
  // solo — mais le réglage est mémorisé : on part d'un état connu.
  await page.evaluate(() => localStorage.setItem('quizroom.voix', 'on'));
  await page.reload();

  // Le tap est volontairement immédiat : c'est la course qu'on veut reproduire.
  await page.click('#btn-solo');

  const manches = new Set();
  for (let tic = 0; tic < secondes; tic += 1) {
    await page.waitForTimeout(1000);
    const entete = await page.textContent('#jeu-manche').catch(() => '');
    if (entete) manches.add(entete.trim());
    // Répondre quand c'est possible, pour que la partie avance vraiment.
    await page.evaluate(() => {
      document.querySelector('#jeu-reponses button:not([disabled])')?.click();
    });
  }

  const trace = await page.evaluate(() => window.__trace);

  // L'écran des réglages doit dire pourquoi, quand la voix enregistrée ne sort
  // pas : sur un téléphone, c'est le seul endroit où on peut le lire.
  await page.click('#btn-back').catch(() => {});
  await page.getByRole('button', { name: 'Quitter', exact: true }).click().catch(() => {});
  await page.waitForTimeout(300);
  await page.fill('#mon-prenom', 'Test').catch(() => {});
  await page.click('#btn-creer').catch(() => {});
  await page.waitForTimeout(200);
  const reglages = (await page.textContent('#choix-voix').catch(() => '') ?? '')
    .trim().replace(/\s+/g, ' ');

  await nav.close();
  app.close();
  return { trace, manches, reglages, erreurs };
}

/**
 * L'ouverture a-t-elle eu le temps d'aller au bout ?
 *
 * Le clip suivant coupe le précédent — c'est voulu, une partie n'a qu'une voix.
 * Donc si l'annonce de la manche 1 démarre avant la fin de l'ouverture, la
 * première phrase de la soirée est tronquée, et rien ne le signale : on entend
 * juste l'animateur s'interrompre.
 *
 * On compare donc l'écart entre les deux lectures à la durée annoncée par le
 * manifeste. C'est la mesure exacte du défaut, et elle ne dépend d'aucune
 * constante recopiée.
 */
function ouvertureEntiere(clips, manifeste) {
  const i = clips.findIndex((c) => c.id.includes('/ouverture/'));
  if (i === -1) return { verdict: null };
  // `element.src` peut être absolu ou relatif selon la façon dont il a été
  // posé : les deux formes mènent au même identifiant de manifeste.
  const id = clips[i].id.replace(/^(?:.*\/)?audio\//, '').replace(/\.[a-z0-9]+$/, '');
  const attendue = manifeste.clips[id];
  if (!attendue) return { verdict: null, inconnu: id };
  const suivant = clips[i + 1];
  if (!suivant) return { verdict: null, attendue };
  const laisse = (suivant.t - clips[i].t) / 1000;
  // Pas « ça tient tout juste » : il faut une marge, et elle n'est pas de
  // confort. Ce navigateur sans écran démarre la lecture presque
  // instantanément ; un téléphone rend l'écran, décode le fichier, et la régie
  // ne se réveille que tous les 450 ms. Avec la fenêtre fixe d'avant, la mesure
  // ici donnait 5,9 s pour 5,36 s — vert — alors que sur un iPhone la phrase
  // était bel et bien coupée. Une seconde de battement, et le banc voit ce que
  // l'oreille entend.
  const MARGE_S = 1;
  return { verdict: laisse >= attendue + MARGE_S, attendue, laisse };
}

// Ce qu'on attend de chaque installation. `clips` et `synthese` disent qui a le
// droit de parler ; c'est tout l'objet du test.
const ATTENDU = {
  'complet':        { clips: true,  synthese: false, reglages: /Voix enregistrée/ },
  'manifeste-lent': { clips: true,  synthese: false, reglages: /Voix enregistrée/ },
  'sans-clips':     { clips: true,  synthese: true,  reglages: /introuvables à la lecture/ },
  'sans-manifeste': { clips: false, synthese: true,  reglages: /manifeste 404/ },
};

async function main() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.error('\nPlaywright manque. Installez-le :\n');
    console.error('  npm i -D playwright && npx playwright install chromium\n');
    process.exit(2);
  }

  // Une partie complète pour la première installation, juste l'ouverture pour
  // les autres : c'est là que tout se joue, et chaque seconde est réelle.
  const manifeste = JSON.parse(
    await readFile(join(RACINE, 'audio', 'manifeste.json'), 'utf8').catch(() => '{"clips":{}}'),
  );

  let echecs = 0;
  for (const [mode, attendu] of Object.entries(ATTENDU)) {
    const { trace, manches, reglages, erreurs } = await essai(chromium, mode, mode === 'complet' ? 55 : 3);
    const constate = {
      clips: trace.clips.length > 0,
      synthese: trace.synthese.length > 0,
      reglages: attendu.reglages.test(reglages),
    };
    const ouverture = ouvertureEntiere(trace.clips, manifeste);
    const ok = constate.clips === attendu.clips
      && constate.synthese === attendu.synthese
      && constate.reglages
      && ouverture.verdict !== false
      && !erreurs.length;
    if (!ok) echecs += 1;

    console.log(`\n${ok ? '✓' : '✗'} ${mode}`);
    if (ouverture.verdict != null) {
      console.log(`    ouverture     : ${ouverture.laisse.toFixed(1)} s laissées pour ${ouverture.attendue} s`
        + `${ouverture.verdict ? '' : '  ← COUPÉE'}`);
    }
    console.log(`    clips joués   : ${trace.clips.length}  (attendu ${attendu.clips ? '> 0' : '0'})`);
    console.log(`    voix système  : ${trace.synthese.length}  (attendu ${attendu.synthese ? '> 0' : '0'})`);
    if (trace.echecs.length) console.log(`    échecs lecture: ${trace.echecs.join(', ')}`);
    if (manches.size > 1) console.log(`    manches vues  : ${[...manches].join(' · ')}`);
    console.log(`    réglages      : ${reglages.slice(0, 90)}`);
    if (erreurs.length) console.log(`    ERREURS       : ${erreurs.slice(0, 3).join(' | ')}`);
  }

  console.log(echecs ? `\n${echecs} installation(s) en échec.\n` : '\nLa voix enregistrée sort partout où elle le doit.\n');
  process.exit(echecs ? 1 : 0);
}

main();
