// Fabrique les enregistrements de l'animateur.
//
//   node scripts/generate-audio.mjs --blanc            # clips muets, pour tester la chaîne
//   OPENAI_API_KEY=sk-... node scripts/generate-audio.mjs --voix=onyx
//
// Pourquoi pré-générer plutôt que lire en direct : `speechSynthesis` ne donne
// accès qu'aux voix installées sur l'appareil, et un Mac, un iPhone et un
// Android n'ont pas le même catalogue. Aucun réglage ne permet de garantir la
// même voix à toute la table. La banque de questions étant connue à l'avance,
// on fabrique les fichiers une fois : même voix partout, aucune latence,
// hors-ligne, et rien à payer à chaque partie.
//
// Trois clips par question — l'énoncé, la bonne réponse, l'explication — plus
// les répliques de l'animateur, qui ne contiennent jamais de prénom : un
// fichier pré-généré ne peut pas dire « Ana ». Les prénoms restent à l'écran.
//
// Le résultat va dans `web/quiz/audio/`, avec un manifeste que l'appli lit au
// démarrage. Sans ce dossier, l'appli retombe sur la synthèse du navigateur.

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { QUESTIONS, nomDuTheme } from '../web/quiz/js/questions.js';
import { typeDeManche } from '../web/quiz/js/manches/index.js';
import { inventaireDesParoles } from '../web/quiz/js/emcee.js';
import { direLesNombres } from './nombres.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', 'web', 'quiz', 'audio');

/* --- Ce qu'il y a à dire -------------------------------------------------- */

/**
 * L'inventaire complet. Un identifiant stable par clip : c'est lui que l'appli
 * demande, et il ne doit jamais changer une fois les fichiers distribués.
 */
export function inventaire() {
  const clips = inventaireDesParoles();

  for (const entree of QUESTIONS) {
    const type = typeDeManche(entree.type);
    // On prépare sans mélanger : la solution ne dépend pas de l'ordre dans
    // lequel une partie donnée affichera les réponses.
    const manche = type.preparer(entree, (liste) => liste);

    clips.push({ id: `question/${entree.id}`, texte: entree.texte });

    // Un TTMC n'a pas de réponse commune : dix corrections différentes tournent
    // en même temps, et chacune s'affiche sur son propre écran. L'animateur
    // annonce la carte, puis se tait.
    if (!type.solutionTexte(manche)) continue;

    clips.push({
      id: `reponse/${entree.id}`,
      texte: {
        rafale: () => type.solutionTexte(manche),
        // Vingt titres valables : « la bonne réponse » n'a pas de sens ici.
        mix: () => `Il y avait par exemple : ${type.solutionTexte(manche)}.`,
      }[type.id]?.() ?? `La bonne réponse était : ${type.solutionTexte(manche)}.`,
      // Une liste de titres, pas une phrase : 99 Luftballons, 9 to 5, 19-2000.
      // Ces chiffres-là font partie du nom et se disent tels quels.
      titres: type.id === 'mix',
    });
    clips.push({ id: `note/${entree.id}`, texte: entree.note });
  }

  // Les chiffres partent en lettres au modèle, jamais à l'écran : c'est la
  // seule façon qu'il lise « 1665 marches » comme une quantité et non comme
  // une année. La banque, elle, continue d'écrire 1665.
  return clips.map((clip) => {
    if (clip.titres) return clip;
    // Une phrase qui commence par un nombre repart en minuscule une fois le
    // nombre écrit en lettres (« 7ᵉ question » → « septième question »). Sans
    // effet sur la prononciation, mais l'inventaire est ce qu'on relit pour
    // vérifier ce qui part au modèle : autant qu'il se lise.
    const texte = direLesNombres(clip.texte);
    return { ...clip, texte: texte.charAt(0).toUpperCase() + texte.slice(1) };
  });
}

/* --- Fournisseurs --------------------------------------------------------- */

/**
 * Un clip muet mais valide, de durée plausible. Il ne sert pas à jouer : il
 * sert à vérifier que le manifeste, le préchargement, l'enchaînement et le
 * repli fonctionnent, sans dépenser un centime ni attendre une clé.
 */
function fournisseurBlanc() {
  // En-tête WAV minimal, PCM 8 kHz mono : la façon la plus courte d'obtenir un
  // fichier audio que tous les navigateurs acceptent.
  const silence = (secondes) => {
    const taux = 8000;
    const echantillons = Math.round(taux * secondes);
    const donnees = Buffer.alloc(echantillons * 2);
    const entete = Buffer.alloc(44);
    entete.write('RIFF', 0);
    entete.writeUInt32LE(36 + donnees.length, 4);
    entete.write('WAVE', 8);
    entete.write('fmt ', 12);
    entete.writeUInt32LE(16, 16);
    entete.writeUInt16LE(1, 20);
    entete.writeUInt16LE(1, 22);
    entete.writeUInt32LE(taux, 24);
    entete.writeUInt32LE(taux * 2, 28);
    entete.writeUInt16LE(2, 32);
    entete.writeUInt16LE(16, 34);
    entete.write('data', 36);
    entete.writeUInt32LE(donnees.length, 40);
    return Buffer.concat([entete, donnees]);
  };

  return {
    nom: 'silence (essai à blanc)',
    extension: 'wav',
    async rendre(texte) {
      // Débit de lecture réaliste, pour que les durées du manifeste aient un
      // sens quand on règle le rythme des manches.
      const secondes = Math.max(1, texte.length / 14);
      return { donnees: silence(secondes), secondes: Number(secondes.toFixed(2)) };
    },
  };
}

/**
 * La direction d'acteur, par animateur.
 *
 * Le modèle suit une consigne de jeu bien plus qu'il ne suit le nom de sa voix :
 * les trois premières voix essayées ont été jugées plates, et c'est la consigne
 * qui l'était — elle demandait « chaleureux et posé ». Elles ont repris vie avec
 * celle-ci. C'est aussi ce qui donne enfin une VOIX propre à chaque animateur :
 * jusqu'ici ils ne différaient que par leur texte écrit.
 */
const DIRECTIONS = {
  defaut: 'Tu animes un quiz de soirée entre amis, et tu es ravi d’être là. '
    + 'Énergie haute, sourire audible, débit vif et rebondissant. Tu marques les '
    + 'ponctuations, tu relances en fin de phrase pour tenir l’attention. '
    + 'Surtout, jamais monocorde : c’est une fête, pas un journal télévisé.',

  chambreur: 'Tu chambres la table, avec le sourire. Ton railleur et complice, '
    + 'tu marques un court silence avant la pique puis tu la lâches sans forcer, '
    + 'l’air de rien. Jamais méchant : c’est de la taquinerie entre amis, pas du mépris.',

  pincesansrire: 'Tu animes avec un flegme absolu. Débit lent et posé, aucune '
    + 'emphase, comme si rien ne pouvait te surprendre. C’est le décalage entre '
    + 'ton calme et l’agitation de la table qui fait l’effet.',

  // Le même registre que le chambreur, monté d'un cran. La direction insiste sur
  // l'amusement audible : lues à froid, ces répliques deviendraient blessantes,
  // alors que dites avec le sourire elles restent une vanne entre amis.
  clasheur: 'Tu démolis la table, et ça t’amuse énormément. Ton mordant, '
    + 'assumé, énergique. Tu balances la vanne franchement, sans la mâcher, mais '
    + 'le sourire s’entend toujours derrière : c’est un ami qui charrie fort, pas '
    + 'quelqu’un qui méprise. Appuie les chutes, savoure-les.',
};

/** Les clips d'un animateur portent son nom : `emcee/<persona>/<clé>/<n>`. */
function directionDe(id) {
  const persona = id.startsWith('emcee/') ? id.split('/')[1] : null;
  return DIRECTIONS[persona] ?? DIRECTIONS.defaut;
}

function fournisseurOpenAI(voixDemandee) {
  const cle = process.env.OPENAI_API_KEY;
  if (!cle) {
    throw new Error('OPENAI_API_KEY n’est pas définie (ou passez --blanc pour un essai).');
  }
  const voix = voixDemandee ?? 'coral';
  const modele = process.env.OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts';

  return {
    nom: `OpenAI TTS — ${voix}`,
    extension: 'mp3',
    // Entre dans l'empreinte : changer de voix, de modèle ou de direction doit
    // tout refaire, sans quoi la banque finirait à deux voix.
    signature: (id) => `${modele}|${voix}|${directionDe(id)}`,
    async rendre(texte, id) {
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { authorization: `Bearer ${cle}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: modele,
          voice: voix,
          input: texte,
          response_format: 'mp3',
          instructions: directionDe(id),
        }),
      });
      if (!res.ok) {
        throw new Error(`TTS ${res.status} : ${(await res.text()).slice(0, 200)}`);
      }
      const donnees = Buffer.from(await res.arrayBuffer());
      // La durée exacte demanderait de décoder le MP3 ; l'estimation suffit,
      // elle ne sert qu'à régler le rythme, jamais à synchroniser quoi que ce soit.
      return { donnees, secondes: Number(Math.max(1, texte.length / 14).toFixed(2)) };
    },
  };
}

/* --- Génération ----------------------------------------------------------- */

/**
 * L'empreinte d'un texte, notée dans le manifeste à côté de sa durée.
 *
 * Sans elle, le cache ne regardait que l'existence du fichier — et reformuler
 * une question laissait l'animateur lire l'ancienne version jusqu'à la fin des
 * temps. C'est le genre de bug qu'on ne voit pas en développant avec des clips
 * muets, et qu'on découvre en soirée.
 */
const empreinteDe = (fournisseur, clip) => createHash('sha1')
  .update(`${fournisseur.signature?.(clip.id) ?? fournisseur.nom}\u0000${clip.texte}`)
  .digest('hex')
  .slice(0, 12);

/** Le manifeste précédent, s'il y en a un : c'est lui qui porte les empreintes. */
async function manifestePrecedent() {
  try {
    return JSON.parse(await readFile(join(RACINE, 'manifeste.json'), 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Ne pas refaire ce qui existe déjà — à condition que RIEN n'ait bougé.
 *
 * L'empreinte ne couvrait que le texte, ce qui suffisait tant qu'on ne changeait
 * pas de voix. Passer de coral à sage aurait laissé les six cents clips en
 * place : une banque à deux voix, exactement ce que la pré-génération devait
 * empêcher. La voix, le modèle et la direction en font donc partie.
 */
async function dejaFait(chemin, clip, fournisseur, anciennesEmpreintes) {
  try {
    await readFile(chemin);
  } catch {
    return false;
  }
  // Un manifeste d'avant les empreintes ne peut rien affirmer : on refait.
  return anciennesEmpreintes?.[clip.id] === empreinteDe(fournisseur, clip);
}

async function main() {
  const args = process.argv.slice(2);
  const blanc = args.includes('--blanc');
  const tout = args.includes('--tout');
  const voixDemandee = args.find((a) => a.startsWith('--voix='))?.split('=')[1];

  const fournisseur = blanc ? fournisseurBlanc() : fournisseurOpenAI(voixDemandee);
  const clips = inventaire();

  console.log(`\nAnimateur : ${fournisseur.nom}`);
  console.log(`${clips.length} clips à produire (${QUESTIONS.length} questions).`);
  if (!blanc && !tout) console.log('Les clips déjà présents sont conservés (--tout pour tout refaire).\n');

  const ancien = await manifestePrecedent();
  const manifeste = {
    voix: fournisseur.nom, format: fournisseur.extension, clips: {}, empreintes: {},
  };
  let produits = 0;
  let reutilises = 0;
  let refaits = 0;

  for (const [index, clip] of clips.entries()) {
    const chemin = join(RACINE, `${clip.id}.${fournisseur.extension}`);
    await mkdir(dirname(chemin), { recursive: true });
    manifeste.empreintes[clip.id] = empreinteDe(fournisseur, clip);

    if (!tout && await dejaFait(chemin, clip, fournisseur, ancien?.empreintes)) {
      manifeste.clips[clip.id] = ancien?.clips?.[clip.id]
        ?? Number(Math.max(1, clip.texte.length / 14).toFixed(2));
      reutilises += 1;
      continue;
    }
    // Un clip déjà là mais dont le texte a bougé : c'est une reformulation.
    if (ancien?.clips?.[clip.id] !== undefined) refaits += 1;

    const { donnees, secondes } = await fournisseur.rendre(clip.texte, clip.id);
    await writeFile(chemin, donnees);
    manifeste.clips[clip.id] = secondes;
    produits += 1;

    if (produits % 25 === 0 || index === clips.length - 1) {
      process.stdout.write(`\r  ${produits} produits, ${reutilises} réutilisés…   `);
    }
  }

  await writeFile(
    join(RACINE, 'manifeste.json'),
    `${JSON.stringify(manifeste, null, 2)}\n`,
    'utf8',
  );

  const duree = Object.values(manifeste.clips).reduce((t, s) => t + s, 0);
  console.log(`\n\n${produits} clips produits, ${reutilises} réutilisés.`);
  if (refaits) console.log(`dont ${refaits} refaits : le texte avait changé depuis.`);
  console.log(`≈ ${Math.round(duree / 60)} minutes d’audio, dans web/quiz/audio/`);
  console.log('\nÉcoutez quelques clips avant de livrer, en particulier les explications :');
  console.log(`  ${join('web', 'quiz', 'audio', 'note', `${QUESTIONS[0].id}.${fournisseur.extension}`)}`);
  console.log(`\nThèmes couverts : ${[...new Set(QUESTIONS.map((q) => nomDuTheme(q.theme)))].join(', ')}\n`);
}

// Seulement quand on lance le script pour de bon. `inventaire` est exporté pour
// que les tests puissent vérifier ce qui part au modèle ; les importer ne doit
// pas déclencher une génération ni réclamer une clé.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((erreur) => {
    console.error(`\nÉchec : ${erreur.message}\n`);
    process.exit(1);
  });
}
