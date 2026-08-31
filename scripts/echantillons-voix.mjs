// Écouter plusieurs voix côte à côte avant d'en refaire 741.
//
//   export OPENAI_API_KEY=sk-...
//   node scripts/echantillons-voix.mjs                    # TOUTES les voix du catalogue
//   node scripts/echantillons-voix.mjs --voix=coral,sage  # une liste précise
//   node scripts/echantillons-voix.mjs --animateur=clasheur
//   node scripts/echantillons-voix.mjs --sec              # le catalogue et ce qui serait dit,
//                                                         # sans demander un seul son
//   node scripts/echantillons-voix.mjs --autonome         # un seul fichier, sons embarqués
//   node scripts/echantillons-voix.mjs --reference=coral  # marque la voix déjà en place
//
// Sans --voix, la liste n'est pas écrite en dur : elle est DEMANDÉE à l'API. Un
// catalogue recopié vieillit en silence, et on croirait avoir tout essayé. Le
// sondage porte sur le modèle en cours (OPENAI_TTS_MODEL), donc changer de
// modèle donne bien SON catalogue et non celui d'un autre.
//
// La clé se lit dans l'environnement, jamais en argument : une clé passée en
// ligne de commande finit dans l'historique du shell, et dans le presse-papier
// de tous ceux à qui on montre la commande.
//
// Pourquoi un script à part plutôt qu'un `generate-audio.mjs --voix=onyx` : ce
// dernier refait la banque entière, 741 fichiers, pour une décision qui se prend
// sur sept répliques. Ici on paie sept phrases par voix.
//
// Ce qui se compare vraiment. Le nom d'une voix ne dit presque rien du résultat
// — c'est la CONSIGNE DE JEU qui domine, au point que les trois premières voix
// essayées ont été jugées plates alors que c'était la consigne qui l'était. On
// applique donc à chaque voix la direction réelle de l'animateur choisi, et on
// lit les phrases de la vraie banque, nombres compris. Ce qu'on entend ici est
// exactement ce qu'on entendrait en partie.
//
// Le résultat va dans `dist/echantillons/` — ignoré par git — avec une page qui
// met les voix en colonnes. Une voix se juge sur une soirée, pas sur un mot :
// chaque colonne a donc un bouton pour enchaîner tous ses extraits d'affilée.

import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// La direction de jeu vient du générateur, et non d'une copie locale : c'est
// elle qui décide du rendu bien plus que le nom de la voix, donc un échantillon
// joué sur une autre consigne ne dirait rien de la banque qu'on fabriquerait.
import { inventaire, directionDe } from './generate-audio.mjs';

const SORTIE = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'echantillons');

// `… | head` ferme le tuyau avant la dernière ligne. Sans ça, Node lève EPIPE et
// crache dix lignes de trace pour une commande qui s'est parfaitement passée.
process.stdout.on('error', (erreur) => {
  if (erreur.code === 'EPIPE') process.exit(0);
  throw erreur;
});

// Le filet, si la découverte échoue. Écrit de mémoire, donc périmable : c'est
// précisément pourquoi il ne sert que de repli.
const VOIX_DE_REPLI = [
  'alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer',
];

const arg = (nom) => process.argv.find((a) => a.startsWith(`--${nom}=`))?.split('=').slice(1).join('=');

/**
 * Le catalogue réel, demandé à l'API plutôt que recopié.
 *
 * Il n'existe pas de route qui liste les voix. Mais une voix inconnue fait
 * répondre 400 avec l'énumération des valeurs acceptées — c'est la seule source
 * qui ne puisse pas être périmée, et elle vient du service lui-même. Une requête
 * refusée pour paramètre invalide n'est pas facturée, et aucun son n'est rendu.
 *
 * Rend `null` si le message ne se laisse pas lire : le format n'est pas un
 * contrat, et deviner à sa place vaudrait moins que le repli écrit plus haut.
 */
async function catalogue(cle, modele) {
  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { authorization: `Bearer ${cle}`, 'content-type': 'application/json' },
      // Un nom qu'aucune voix ne portera : on veut le refus, pas le son.
      body: JSON.stringify({ model: modele, voice: '__catalogue__', input: '.' }),
    });
    if (res.ok) return null;                   // accepté : le sondage ne prouve rien
    return lireLeCatalogue(await res.text());
  } catch {
    return null;
  }
}

/**
 * Les identifiants énumérés par un message de refus. Exporté pour être testé.
 *
 * Deux formulations coexistent chez OpenAI, et il a fallu sonder pour le voir :
 *
 *   gpt-4o-mini-tts   « Supported values are: 'alloy', 'echo', … »
 *   tts-1-hd          « Input should be 'nova', 'shimmer', … »
 *
 * D'où deux amorces. Ce n'est pas de la générosité : un modèle dont on ne sait
 * pas lire le refus retombe sur la liste écrite en dur, c'est-à-dire sur celle
 * d'un AUTRE modèle — et on croirait avoir tout essayé.
 */
const AMORCES = /supported values are|input should be/i;

export function lireLeCatalogue(message) {
  const apres = message.split(AMORCES)[1];
  if (!apres) return null;
  const noms = [...apres.matchAll(/'([a-z][a-z0-9_-]*)'/gi)].map((m) => m[1]);
  const propres = [...new Set(noms)].filter((n) => n !== '__catalogue__');
  return propres.length ? propres : null;
}

// Un nombre écrit en toutes lettres. `inventaire()` a déjà fait la conversion —
// on ne cherche donc pas des chiffres, on cherche leur version dite.
const NOMBRE_DIT = /\b(?:mille|cents?|quatre-vingts?|soixante|cinquante|quarante|trente|vingt)\b/i;

/**
 * Les sept phrases sur lesquelles se décide une voix.
 *
 * Choisies pour couvrir ce qui est difficile, pas ce qui est joli :
 *
 *   ouverture    la première impression, la seule phrase longue et posée
 *   numéro       très court — beaucoup de voix s'écroulent sur trois syllabes
 *   formule      l'enchaînement immédiat après le numéro, autre registre
 *   commentaire  le ton quand quelqu'un vient de se planter
 *   nombre       une quantité en toutes lettres : « mille six cent soixante-cinq »
 *                est un piège d'intonation, on l'entend basculer en date
 *   titres       le cas inverse — 99 Luftballons, Summer of ’69. Ces chiffres-là
 *                font partie du nom et ne doivent PAS être convertis ; c'est le
 *                seul endroit où la banque les laisse en chiffres
 *   explication  la plus longue de la banque. Si elle est écoutable dans cette
 *                voix, tout le reste l'est.
 *
 * Tirées de la vraie banque et non écrites pour l'occasion : un échantillon
 * flatteur ne sert à rien si la soirée sonne autrement.
 */
function repliques(clips, animateur) {
  const par = (prefixe) => clips.filter((c) => c.id.startsWith(prefixe));
  const leplusLong = (liste) => liste.slice().sort((a, b) => b.texte.length - a.texte.length)[0];
  const leplusCourt = (liste) => liste.slice().sort((a, b) => a.texte.length - b.texte.length)[0];
  const premier = (prefixe) => par(prefixe)[0];

  const choix = [
    ['Ouverture', premier(`emcee/${animateur}/ouverture/`)],
    ['Numéro de manche', clips.find((c) => c.id === `emcee/${animateur}/manche/3`)],
    ['Formule d’annonce', leplusLong(par(`emcee/${animateur}/avantManche/`))],
    ['Commentaire de révélation', leplusLong(par(`emcee/${animateur}/personne/`))],
    // La plus courte, et non la plus longue : on veut entendre le nombre, pas
    // une rafale de trois affirmations où il se perd.
    ['Une quantité, en toutes lettres', leplusCourt(
      par('reponse/').filter((c) => !c.titres && NOMBRE_DIT.test(c.texte)),
    )],
    // Un titre SANS chiffre ne prouve rien : c'est le chiffre gardé tel quel
    // qu'on vient écouter.
    ['Des titres, chiffres compris', leplusLong(
      par('reponse/').filter((c) => c.titres && /\d/.test(c.texte)),
    )],
    ['Explication la plus longue', leplusLong(par('note/'))],
  ];

  return choix
    .filter(([, clip]) => clip)
    .map(([role, clip]) => ({ role, id: clip.id, texte: clip.texte }));
}

async function main() {
  const sec = process.argv.includes('--sec');
  const autonome = process.argv.includes('--autonome');
  const reference = arg('reference') ?? null;
  const animateur = arg('animateur') ?? 'classique';
  const demandees = arg('voix')?.split(',').map((v) => v.trim()).filter(Boolean);
  const modele = process.env.OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts';
  const cle = process.env.OPENAI_API_KEY;

  // Le générateur choisit la direction sur l'identifiant du clip : on lui en
  // passe un de cet animateur, c'est son API réelle.
  const direction = directionDe(`emcee/${animateur}/ouverture/0`);
  const clips = await inventaire();
  const lignes = repliques(clips, animateur);
  if (!lignes.length) {
    console.error(`\nAucune réplique trouvée pour « ${animateur} ».`);
    console.error('Animateurs : classique, chambreur, pincesansrire, clasheur\n');
    process.exit(1);
  }

  // Le catalogue avant tout le reste : c'est lui qui décide combien on en fait,
  // et il est demandé même en essai à blanc — la requête est refusée, donc
  // gratuite, et savoir ce qui existe VRAIMENT est la moitié de la question.
  let source = 'demandées';
  let voix = demandees;
  if (!voix) {
    const trouve = cle ? await catalogue(cle, modele) : null;
    voix = trouve ?? VOIX_DE_REPLI;
    source = trouve ? 'catalogue de l’API'
      : cle ? 'repli (le catalogue n’a pas pu être lu)'
        : 'repli (pas de clé pour interroger le catalogue)';
  }

  console.log(`\nAnimateur : ${animateur}`);
  console.log(`Modèle    : ${modele}`);
  console.log(`Voix      : ${voix.join(', ')}   (${voix.length} — ${source})`);
  if (source.startsWith('catalogue')) {
    const inedites = voix.filter((v) => !VOIX_DE_REPLI.includes(v));
    if (inedites.length) console.log(`            dont jamais essayées ici : ${inedites.join(', ')}`);
  }
  console.log(`Extraits  : ${lignes.length} par voix, ${lignes.length * voix.length} au total\n`);
  for (const l of lignes) console.log(`  ${l.role.padEnd(28)} ${JSON.stringify(l.texte).slice(0, 76)}`);

  if (sec) {
    // On écrit quand même la page : elle se relit sans un seul son demandé, et
    // c'est le moment de vérifier qu'elle se tient avant de payer.
    await mkdir(SORTIE, { recursive: true });
    await writeFile(
      join(SORTIE, 'index.html'),
      page({ animateur, modele, direction, lignes, rendus: voix, reference, sec: true }),
      'utf8',
    );
    console.log('\n--sec : aucun son demandé, rien de facturé.');
    console.log('La page est écrite dans dist/echantillons/ — sans les sons.\n');
    return;
  }

  if (!cle) {
    console.error('\nOPENAI_API_KEY n’est pas définie.\n');
    console.error('  export OPENAI_API_KEY=sk-...\n');
    console.error('Passez --sec pour voir ce qui serait demandé sans rien dépenser.\n');
    process.exit(1);
  }

  await rm(SORTIE, { recursive: true, force: true });
  await mkdir(SORTIE, { recursive: true });

  const rendus = [];
  const sautees = [];
  // Gardés en mémoire : `--autonome` les embarque dans la page.
  const sons = new Map();
  for (const v of voix) {
    let ok = 0;
    for (const [i, ligne] of lignes.entries()) {
      const fichier = `${v}-${i}.mp3`;
      try {
        const res = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: { authorization: `Bearer ${cle}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            model: modele,
            voice: v,
            // Le texte tel quel : `inventaire()` a DÉJÀ passé les nombres en
            // lettres, en épargnant les titres. Le refaire ici dirait
            // « quatre-vingt-dix-neuf Luftballons » — précisément le défaut que
            // l'exception sur les titres existe pour éviter.
            input: ligne.texte,
            response_format: 'mp3',
            instructions: direction,
          }),
        });
        if (!res.ok) {
          const detail = (await res.text()).slice(0, 160);
          sautees.push(`${v} : ${res.status} ${detail}`);
          break;                              // voix inconnue : inutile d'insister
        }
        const octets = Buffer.from(await res.arrayBuffer());
        await writeFile(join(SORTIE, fichier), octets);
        sons.set(`${v}-${i}`, octets.toString('base64'));
        ok += 1;
        process.stdout.write(`\r  ${v} … ${ok}/${lignes.length}   `);
      } catch (erreur) {
        sautees.push(`${v} : ${erreur.message}`);
        break;
      }
    }
    if (ok === lignes.length) rendus.push(v);
  }
  process.stdout.write('\r');

  if (!rendus.length) {
    console.error('\nAucune voix n’a pu être rendue.');
    for (const s of sautees) console.error(`  ${s}`);
    console.error('');
    process.exit(1);
  }

  await writeFile(
    join(SORTIE, 'index.html'),
    page({ animateur, modele, direction, lignes, rendus, reference, sons: autonome ? sons : null }),
    'utf8',
  );

  console.log(`\n${rendus.length} voix rendues : ${rendus.join(', ')}`);
  for (const s of sautees) console.log(`  sautée — ${s}`);
  console.log(`\nÀ écouter :  open dist/echantillons/index.html`);
  console.log(`Puis, pour refaire la banque dans la voix retenue :`);
  console.log(`  node scripts/generate-audio.mjs --voix=<la voix>\n`);
}

/** La page de comparaison : les voix en colonnes, les répliques en lignes. */
function page({ animateur, modele, direction, lignes, rendus, sons, reference, sec = false }) {
  const echapper = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Autonome : le son est dans la page. Un seul fichier s'envoie par message,
  // s'ouvre sur un téléphone et se garde ; un dossier de quarante mp3 ne fait
  // aucune de ces trois choses.
  const son = (v, i) => (sons ? `data:audio/mpeg;base64,${sons.get(`${v}-${i}`)}` : `${v}-${i}.mp3`);

  const colonnes = rendus.map((v) => `
      <th${v === reference ? ' class="est-reference"' : ''}>
        <div class="voix">${echapper(v)}${v === reference ? ' <span class="badge">en place</span>' : ''}</div>
        <button type="button" data-voix="${echapper(v)}">▶ tout écouter</button>
      </th>`).join('');

  const corps = lignes.map((ligne, i) => `
    <tr>
      <th scope="row">
        <div class="role">${echapper(ligne.role)}</div>
        <p class="texte">${echapper(ligne.texte)}</p>
      </th>
      ${rendus.map((v) => `<td${v === reference ? ' class="est-reference"' : ''}><audio controls preload="none" data-voix="${echapper(v)}" data-rang="${i}" src="${son(v, i)}"></audio></td>`).join('')}
    </tr>`).join('');

  return `<!doctype html>
<html lang="fr">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Quiz entre amis — comparaison de voix</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 24px; background: #0f1116; color: #e8eaf0;
         font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #9aa1b2; font-size: 13px; margin: 0 0 4px; }
  .direction { color: #9aa1b2; font-size: 13px; max-width: 70ch; margin: 12px 0 24px;
               border-left: 2px solid #2a2f3d; padding-left: 12px; }
  .cadre { overflow-x: auto; }
  table { border-collapse: collapse; }
  th, td { padding: 10px 12px; border-bottom: 1px solid #20242f; vertical-align: top; text-align: left; }
  thead th { position: sticky; top: 0; background: #0f1116; }
  .voix { font-weight: 600; margin-bottom: 6px; }
  th[scope="row"] { max-width: 34ch; }
  .role { font-weight: 600; font-size: 13px; }
  .texte { color: #9aa1b2; font-size: 13px; font-weight: 400; margin: 4px 0 0; }
  button { background: #1a1e28; color: #e8eaf0; border: 1px solid #2a2f3d;
           border-radius: 8px; padding: 6px 10px; font: inherit; font-size: 13px; cursor: pointer; }
  button[aria-pressed="true"] { background: #5b5bd6; border-color: transparent; }
  audio { width: 220px; }
  /* La voix déjà en place : on ne juge pas une voix dans l'absolu, on la juge
     contre celle qu'on remplacerait. */
  .est-reference { background: #14161f; }
  .badge { font-size: 11px; font-weight: 600; color: #0f1116; background: #7c7cf0;
           border-radius: 999px; padding: 2px 7px; vertical-align: middle; }
</style>

<h1>Comparaison de voix</h1>
<p class="meta">Animateur : <strong>${echapper(animateur)}</strong> · modèle : ${echapper(modele)}</p>
<p class="meta">Une voix se juge sur une soirée, pas sur un mot : commencez par « tout écouter » d’une colonne.</p>
<p class="direction">${echapper(direction)}</p>
${sec ? '<p class="meta">Essai à blanc : aucun son n’a été demandé. Relancez sans <code>--sec</code>.</p>' : ''}

<div class="cadre">
<table>
  <thead><tr><th></th>${colonnes}</tr></thead>
  <tbody>${corps}</tbody>
</table>
</div>

<script>
  // Enchaîner les extraits d'une colonne, et n'en laisser jouer qu'un à la fois :
  // deux animateurs qui parlent en même temps ne se comparent pas.
  const tous = [...document.querySelectorAll('audio')];
  let suite = null;

  function stopper() {
    for (const a of tous) { a.pause(); a.currentTime = 0; }
    for (const b of document.querySelectorAll('button')) b.setAttribute('aria-pressed', 'false');
    if (suite) { suite.forEach((a) => a.onended = null); suite = null; }
  }

  for (const a of tous) a.addEventListener('play', () => {
    for (const autre of tous) if (autre !== a) autre.pause();
  });

  for (const bouton of document.querySelectorAll('button[data-voix]')) {
    bouton.addEventListener('click', () => {
      const enCours = bouton.getAttribute('aria-pressed') === 'true';
      stopper();
      if (enCours) return;
      bouton.setAttribute('aria-pressed', 'true');
      const file = tous
        .filter((a) => a.dataset.voix === bouton.dataset.voix)
        .sort((x, y) => Number(x.dataset.rang) - Number(y.dataset.rang));
      suite = file;
      file.forEach((a, i) => {
        a.onended = () => { if (file[i + 1]) file[i + 1].play(); else stopper(); };
      });
      file[0]?.play();
    });
  }
</script>
</html>
`;
}

// Ce fichier s'importe aussi — `lireLeCatalogue` est testé. Sans ce garde,
// l'import déclencherait toute une campagne d'échantillons.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((erreur) => {
    console.error(`\nÉchec : ${erreur.message}\n`);
    process.exit(1);
  });
}
