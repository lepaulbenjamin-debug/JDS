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
import { fileURLToPath } from 'node:url';

import { QUESTIONS, nomDuTheme } from '../web/quiz/js/questions.js';
import { typeDeManche } from '../web/quiz/js/manches/index.js';
import { inventaireDesParoles } from '../web/quiz/js/emcee.js';

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
    });
    clips.push({ id: `note/${entree.id}`, texte: entree.note });
  }

  return clips;
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

function fournisseurOpenAI(voixDemandee) {
  const cle = process.env.OPENAI_API_KEY;
  if (!cle) {
    throw new Error('OPENAI_API_KEY n’est pas définie (ou passez --blanc pour un essai).');
  }
  const voix = voixDemandee ?? 'onyx';

  return {
    nom: `OpenAI TTS — ${voix}`,
    extension: 'mp3',
    async rendre(texte) {
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { authorization: `Bearer ${cle}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: process.env.OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts',
          voice: voix,
          input: texte,
          response_format: 'mp3',
          instructions: 'Tu es l’animateur d’un quiz de soirée entre amis, en français. '
            + 'Ton chaleureux et vif, débit soutenu, sans emphase excessive.',
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
const empreinteDe = (texte) => createHash('sha1').update(texte).digest('hex').slice(0, 12);

/** Le manifeste précédent, s'il y en a un : c'est lui qui porte les empreintes. */
async function manifestePrecedent() {
  try {
    return JSON.parse(await readFile(join(RACINE, 'manifeste.json'), 'utf8'));
  } catch {
    return null;
  }
}

/** Ne pas refaire ce qui existe déjà, et seulement si le texte n'a pas bougé. */
async function dejaFait(chemin, id, texte, anciennesEmpreintes) {
  try {
    await readFile(chemin);
  } catch {
    return false;
  }
  // Un manifeste d'avant les empreintes ne peut rien affirmer : on refait.
  return anciennesEmpreintes?.[id] === empreinteDe(texte);
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
    manifeste.empreintes[clip.id] = empreinteDe(clip.texte);

    if (!tout && await dejaFait(chemin, clip.id, clip.texte, ancien?.empreintes)) {
      manifeste.clips[clip.id] = ancien?.clips?.[clip.id]
        ?? Number(Math.max(1, clip.texte.length / 14).toFixed(2));
      reutilises += 1;
      continue;
    }
    // Un clip déjà là mais dont le texte a bougé : c'est une reformulation.
    if (ancien?.clips?.[clip.id] !== undefined) refaits += 1;

    const { donnees, secondes } = await fournisseur.rendre(clip.texte);
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

main().catch((erreur) => {
  console.error(`\nÉchec : ${erreur.message}\n`);
  process.exit(1);
});
