// Construction de la requête de lecture d'image, partagée par le client
// (appel direct navigateur) et par le serveur Node (SDK Anthropic).

export const MODEL = 'claude-opus-5';

/** Schéma de sortie structurée : la réponse est garantie conforme. */
export const SCHEMA = {
  type: 'object',
  properties: {
    detected: {
      type: 'string',
      enum: ['scoresheet', 'cards', 'unclear'],
      description: "Ce que montre la photo : une feuille de scores, des cartes ramassées, ou rien d'exploitable.",
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
      description: 'Cartes de pénalité visibles sur la photo. Utilise seulement si detected = "cards".',
      properties: {
        payoos: {
          type: 'array',
          description: 'Valeurs des Payoos visibles (cartes jaunes numérotées de 1 à 20).',
          items: { type: 'integer' },
        },
        papayoo: { type: 'boolean', description: 'true si le Papayoo (7 de la couleur désignée) est visible.' },
        total: { type: 'integer', description: 'Somme des Payoos, +40 si le Papayoo est présent.' },
      },
      required: ['payoos', 'papayoo', 'total'],
      additionalProperties: false,
    },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    notes: { type: 'string', description: 'Une phrase en français : ce qui a été lu, ou ce qui pose problème.' },
  },
  required: ['detected', 'rounds', 'cards', 'confidence', 'notes'],
  additionalProperties: false,
};

const SYSTEM = `Tu lis des photos pour une application de comptage de points de jeux de société.
Tu ne devines jamais : si un chiffre est illisible, tu le signales dans "notes" et tu baisses "confidence".
Tu réponds uniquement avec les données demandées, en respectant le schéma.

Règles du Papayoo utiles à la lecture :
- Les Payoos sont 20 cartes jaunes numérotées de 1 à 20 ; chacune vaut sa valeur en points.
- Le Papayoo est le 7 de la couleur désignée au dé ; il vaut 40 points.
- Toutes les autres cartes valent 0 point.
- Le total distribué sur une manche complète est de 250 points.`;

function instructionFor(mode, players, roundTotal) {
  const names = players.length ? players.map((p) => `"${p}"` ).join(', ') : 'inconnus';

  if (mode === 'cards') {
    return `La photo montre les cartes de pénalité ramassées par UN joueur sur une manche.
Liste chaque Payoo visible (une entrée par carte, une même valeur ne peut apparaître qu'une fois), indique si le Papayoo est présent, et calcule le total.
Ne compte pas les cartes des couleurs classiques : elles valent 0.
Laisse "rounds" vide et mets detected = "cards".`;
  }

  return `La photo montre une feuille de scores manuscrite.
Joueurs attendus dans la partie : ${names}. Réutilise ces noms quand la correspondance est évidente, sinon recopie le nom tel qu'il est écrit.
Rends une entrée dans "rounds" par ligne/manche lisible, dans l'ordre de la feuille.
Si la feuille donne des totaux cumulés au lieu des points par manche, mets cumulative = true pour ces lignes sans faire la soustraction toi-même.
Une manche complète totalise ${roundTotal} points : si une ligne s'en écarte, signale-le dans "notes" sans corriger les chiffres.
Laisse "cards" avec des valeurs vides et mets detected = "scoresheet".`;
}

/**
 * Corps de requête pour POST /v1/messages.
 * @param {{mode:'scoresheet'|'cards', players:string[], roundTotal:number, imageBase64:string, mediaType:string}} input
 */
export function buildPayload({ mode, players = [], roundTotal = 250, imageBase64, mediaType = 'image/jpeg' }) {
  return {
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: instructionFor(mode, players, roundTotal) },
        ],
      },
    ],
  };
}

/** Extrait le JSON structuré d'une réponse Messages API. */
export function parseResponse(message) {
  if (message?.stop_reason === 'refusal') {
    throw new Error("L'IA a refuse de traiter cette image.");
  }
  const block = (message?.content ?? []).find((b) => b.type === 'text');
  if (!block) throw new Error("Réponse vide de l'IA.");
  return JSON.parse(block.text);
}
