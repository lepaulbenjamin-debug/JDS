// Construction de la requête de lecture d'image, partagée par le client
// (appel direct navigateur) et par le serveur Node (SDK Anthropic).
//
// Le contexte de règles vient du module de jeu, jamais de la requête HTTP :
// le serveur résout le jeu par son identifiant avant de construire le prompt.

export const MODEL = 'claude-opus-5';

/** Schéma de sortie structurée : la réponse est garantie conforme. */
export const SCHEMA = {
  type: 'object',
  properties: {
    detected: {
      type: 'string',
      enum: ['scoresheet', 'cards', 'unclear'],
      description: "Ce que montre la photo : une feuille de scores, des cartes, ou rien d'exploitable.",
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
          description: 'Valeur en points de chaque carte comptabilisée, une entrée par carte.',
          items: { type: 'integer' },
        },
        count: { type: 'integer', description: 'Nombre de cartes prises en compte.' },
        detail: { type: 'string', description: 'En une phrase : ce qui a été vu sur la photo.' },
      },
      required: ['values', 'count', 'detail'],
      additionalProperties: false,
    },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    notes: { type: 'string', description: 'Une phrase en français : ce qui a été lu, ou ce qui pose problème.' },
  },
  required: ['detected', 'rounds', 'cards', 'confidence', 'notes'],
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
