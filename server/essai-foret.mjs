// Banc d'essai : que sait lire le modèle sur une photo de forêt en fin de
// partie ? Rien n'est branché dans l'appli — ce script sert à décider s'il y a
// quelque chose à brancher.
//
//   ANTHROPIC_API_KEY=… node server/essai-foret.mjs photo.jpg [autre.jpg …]
//
// Ce qu'il mesure, dans l'ordre où ça compte :
//  1. Les noms des cartes sont-ils lisibles à la résolution que l'API accepte ?
//     C'est le point bloquant : une forêt occupe 60 à 80 cm de table, les noms
//     font 3 à 4 mm, et l'image est ramenée à 1568 px sur son grand côté.
//  2. Le modèle sait-il de quelles cartes il s'agit, et le dit-il honnêtement
//     quand il n'est pas sûr ?
//
// Il ne calcule aucun score, volontairement : tant que l'identification n'est
// pas fiable, un total serait une réponse fausse présentée comme juste.

import { readFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';

const MODELE = 'claude-opus-5';
const fichiers = process.argv.slice(2);

if (fichiers.length === 0) {
  console.error('Usage : node server/essai-foret.mjs photo.jpg [autre.jpg …]');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY absente de l’environnement.');
  process.exit(1);
}

const TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['lisibilite', 'cartes', 'illisibles', 'remarques'],
  properties: {
    lisibilite: {
      type: 'string',
      enum: ['bonne', 'moyenne', 'mauvaise'],
      description: 'Les noms imprimés sur les cartes sont-ils déchiffrables ?',
    },
    cartes: {
      type: 'array',
      description: 'Une entrée par carte visible identifiée.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['nom', 'categorie', 'certitude'],
        properties: {
          nom: { type: 'string', description: 'Le nom lu sur la carte, tel quel.' },
          categorie: { type: 'string', enum: ['arbre', 'haut', 'bas', 'gauche', 'droite', 'inconnue'] },
          certitude: { type: 'string', enum: ['lu', 'deviné'], description: '« lu » si le nom est déchiffré, « deviné » si l’identification vient de l’illustration.' },
        },
      },
    },
    illisibles: { type: 'integer', description: 'Nombre de cartes visibles mais non identifiables.' },
    remarques: { type: 'string', description: 'Ce qui gêne la lecture, en une ou deux phrases.' },
  },
};

const CONSIGNE = `Cette photo montre la forêt d'un joueur à Forêt Mixte (Forest Shuffle), en fin de partie.
Des cartes Arbre portent, sur leurs quatre côtés, des moitiés de cartes glissées dessous : animaux, plantes, champignons.

Inventoriez ce que vous voyez, sans rien calculer.

Deux exigences, plus importantes que l'exhaustivité :
- Ne devinez pas un nom que vous ne lisez pas. Si le nom n'est pas déchiffrable, comptez la carte dans « illisibles » plutôt que de l'inventer.
- Distinguez ce que vous avez lu de ce que vous déduisez de l'illustration, via le champ « certitude ».

Une identification confiante mais fausse est le pire résultat possible : elle donnerait un score faux sans que personne ne s'en aperçoive.`;

const client = new Anthropic();

for (const chemin of fichiers) {
  const ext = chemin.split('.').pop().toLowerCase();
  const mediaType = TYPES[ext];
  if (!mediaType) {
    console.error(`${chemin} : extension non gérée (${ext}).`);
    continue;
  }

  const octets = readFileSync(chemin);
  console.log(`\n=== ${chemin} — ${(octets.length / 1024).toFixed(0)} Ko`);
  const debut = Date.now();

  try {
    const reponse = await client.messages.create({
      model: MODELE,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: SCHEMA },
      },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: octets.toString('base64') } },
          { type: 'text', text: CONSIGNE },
        ],
      }],
    });

    if (reponse.stop_reason === 'refusal') {
      console.log('Refus du modèle :', reponse.stop_details?.category ?? '(sans catégorie)');
      continue;
    }

    const texte = reponse.content.find((b) => b.type === 'text')?.text ?? '{}';
    const r = JSON.parse(texte);
    const lues = r.cartes.filter((c) => c.certitude === 'lu');
    const devinees = r.cartes.filter((c) => c.certitude === 'deviné');
    const u = reponse.usage;

    console.log(`lisibilité      : ${r.lisibilite}`);
    console.log(`cartes lues     : ${lues.length}`);
    console.log(`cartes devinées : ${devinees.length}`);
    console.log(`illisibles      : ${r.illisibles}`);
    console.log(`remarques       : ${r.remarques}`);
    if (lues.length) console.log(`  lues     → ${lues.map((c) => `${c.nom} (${c.categorie})`).join(', ')}`);
    if (devinees.length) console.log(`  devinées → ${devinees.map((c) => c.nom).join(', ')}`);
    console.log(`\njetons : ${u.input_tokens} en entrée, ${u.output_tokens} en sortie`);
    console.log(`coût   : ~${((u.input_tokens * 5 + u.output_tokens * 25) / 1e6).toFixed(4)} $ en ${((Date.now() - debut) / 1000).toFixed(1)} s`);
  } catch (erreur) {
    console.error(`échec : ${erreur.message}`);
  }
}
