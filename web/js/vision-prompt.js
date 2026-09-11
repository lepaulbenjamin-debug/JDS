// Construction de la requête de lecture d'image, partagée par le client
// (appel direct navigateur) et par le serveur Node (SDK Anthropic).
//
// Le contexte de règles vient du module de jeu, jamais de la requête HTTP :
// le serveur résout le jeu par son identifiant avant de construire le prompt.

export const MODEL = 'claude-opus-5';

/**
 * Repli côté serveur en cas de refus.
 * Les classificateurs de sécurité peuvent décliner une requête ; sans ce
 * paramètre l'appel s'arrête là et l'utilisateur voit une erreur sèche. En
 * mode « default », l'API rejoue elle-même la demande sur un autre modèle,
 * choisi selon le motif du refus.
 */
export const BETA_REPLI = 'server-side-fallback-2026-07-01';

/** Schéma de sortie structurée : la réponse est garantie conforme. */
export const SCHEMA = {
  type: 'object',
  properties: {
    detected: {
      type: 'string',
      enum: ['scoresheet', 'cards', 'inventory', 'unclear'],
      description: "Ce que montre la photo : une feuille de scores, des cartes à additionner, un tableau de cartes à inventorier, ou rien d'exploitable.",
    },
    rounds: {
      type: 'array',
      description: 'Manches lues sur une feuille de scores. Vide si la photo montre des cartes.',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'Intitulé de la manche, ex. "Manche 3".' },
          scores: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                player: { type: 'string', description: 'Nom lu sur la feuille.' },
                points: { type: 'integer', description: 'Points de la manche pour ce joueur.' },
              },
              required: ['player', 'points'],
              additionalProperties: false,
            },
          },
          cumulative: {
            type: 'boolean',
            description: 'true si les nombres lus sont des totaux cumulés et non des points de la manche.',
          },
        },
        required: ['label', 'scores', 'cumulative'],
        additionalProperties: false,
      },
    },
    cards: {
      type: 'object',
      description: 'Cartes lues sur la photo. Utilisé seulement si detected = "cards".',
      properties: {
        values: {
          type: 'array',
          description: "Nombre lu sur chaque carte prise en compte, une entrée par carte. L'instruction précise s'il s'agit de points ou du numéro imprimé sur la carte.",
          items: { type: 'integer' },
        },
        count: { type: 'integer', description: 'Nombre de cartes prises en compte.' },
        detail: { type: 'string', description: 'En une phrase : ce qui a été vu sur la photo.' },
      },
      required: ['values', 'count', 'detail'],
      additionalProperties: false,
    },
    inventory: {
      type: 'object',
      description: 'Cartes inventoriées sur un tableau étalé. Utilisé seulement si detected = "inventory".',
      properties: {
        cards: {
          type: 'array',
          description: 'Une entrée par carte visible identifiée.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Le nom lu sur la carte, recopié tel quel.' },
              rule: { type: 'string', description: 'La règle de score imprimée sur la carte, recopiée telle quelle. Chaîne vide si elle n’est pas lisible.' },
              side: {
                type: 'string',
                enum: ['arbre', 'haut', 'bas', 'gauche', 'droite', 'inconnu'],
                description: 'Où se trouve la carte : "arbre" pour une carte Arbre posée entière, sinon le côté de l’arbre auquel sa moitié visible est rattachée.',
              },
              certainty: {
                type: 'string',
                enum: ['read', 'guessed'],
                description: '"read" si le nom est déchiffré sur la carte, "guessed" s’il est déduit de l’illustration.',
              },
            },
            required: ['name', 'rule', 'side', 'certainty'],
            additionalProperties: false,
          },
        },
        tree: {
          type: 'string',
          description: 'Quand la photo montre un seul arbre et ce qui lui est rattaché, le nom de cet arbre. Chaîne vide sinon.',
        },
        unreadable: { type: 'integer', description: 'Cartes visibles mais non identifiables.' },
      },
      required: ['cards', 'tree', 'unreadable'],
      additionalProperties: false,
    },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    notes: { type: 'string', description: 'Une phrase en français : ce qui a été lu, ou ce qui pose problème.' },
  },
  required: ['detected', 'rounds', 'cards', 'inventory', 'confidence', 'notes'],
  additionalProperties: false,
};

function systemPrompt(game) {
  return `Tu lis des photos pour une application de comptage de points de jeux de société.
La partie en cours est une partie de ${game.name}.
Tu ne devines jamais : si un chiffre est illisible, tu le signales dans "notes" et tu baisses "confidence".
Tu réponds uniquement avec les données demandées, en respectant le schéma.

${game.vision?.context ?? ''}`.trim();
}

function instructionFor(mode, game, players) {
  const names = players.length ? players.map((p) => `"${p}"`).join(', ') : 'inconnus';

  // Inventorier, c'est lire ce qui est posé sans rien calculer. Un jeu dont
  // chaque carte porte sa propre règle — au Forêt Mixte — ne peut pas être
  // scoré à partir d'une carte isolée : les conditions parlent de toute la
  // forêt. On relève donc d'abord, on évaluera ensuite.
  if (mode === 'inventaire') {
    return `${game.vision?.inventaire?.instruction ?? 'Inventorie les cartes visibles sur la photo.'}

Ne calcule aucun score, aucun total : cette étape ne sert qu'à relever ce qui est posé.
Ne devine pas un nom que tu ne lis pas. Une carte dont le nom n'est pas déchiffrable se compte dans "unreadable" plutôt que de s'inventer.
Distingue dans "certainty" ce que tu as lu de ce que tu déduis de l'illustration : une identification confiante mais fausse donnerait un score faux sans que personne ne s'en aperçoive.
Recopie la règle imprimée sur la carte dans "rule", mot pour mot, ou laisse la chaîne vide si elle n'est pas lisible.
Indique dans "side" où se trouve chaque carte : "arbre" si elle est posée entière, sinon le côté de l'arbre auquel sa moitié visible est rattachée — c'est ce côté qui décide de la ligne du décompte, et une carte rangée du mauvais côté fausserait le total.
Si la photo ne montre qu'un seul arbre et ce qui lui est rattaché, donne son nom dans "tree".
Laisse "rounds" et "cards" vides, et mets detected = "inventory".`;
  }

  if (mode === 'cards') {
    return `${game.vision?.cards?.instruction ?? 'Liste la valeur en points de chaque carte visible sur la photo.'}
Laisse "rounds" vide et mets detected = "cards".`;
  }

  const totalLine = game.roundTotal
    ? `Une manche complète totalise ${game.roundTotal} points : si une ligne s'en écarte, signale-le dans "notes" sans corriger les chiffres.`
    : `Au ${game.name}, chaque joueur compte ses propres points : il n'y a pas de total de manche à vérifier.`;

  return `La photo montre une feuille de scores manuscrite.
Joueurs attendus dans la partie : ${names}. Réutilise ces noms quand la correspondance est évidente, sinon recopie le nom tel qu'il est écrit.
Rends une entrée dans "rounds" par ligne/manche lisible, dans l'ordre de la feuille.
Si la feuille donne des totaux cumulés au lieu des points par manche, mets cumulative = true pour ces lignes sans faire la soustraction toi-même.
${totalLine}
Laisse "cards" avec des valeurs vides et mets detected = "scoresheet".`;
}

/**
 * Corps de requête pour POST /v1/messages.
 * @param {{mode:'scoresheet'|'cards', game:object, players:string[], imageBase64:string, mediaType:string}} input
 */
export function buildPayload({ mode, game, players = [], imageBase64, mediaType = 'image/jpeg' }) {
  return {
    model: MODEL,
    max_tokens: 16000,
    fallbacks: 'default',
    system: systemPrompt(game),
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: instructionFor(mode, game, players) },
        ],
      },
    ],
  };
}

/** Extrait le JSON structuré d'une réponse Messages API. */
export function parseResponse(message) {
  if (message?.stop_reason === 'refusal') {
    throw new Error("L'IA a refusé de traiter cette image.");
  }
  const block = (message?.content ?? []).find((b) => b.type === 'text');
  if (!block) throw new Error("Réponse vide de l'IA.");
  return JSON.parse(block.text);
}
