// Vérifie que la lecture photo est correctement branchée, avant d'ouvrir l'appli.
//
//   ANTHROPIC_API_KEY=sk-ant-... npm run check
//
// Le script fait deux appels minimaux : un pour valider la clé, un second qui
// envoie une vraie image de test et vérifie que la réponse structurée revient
// bien au format attendu par l'appli. Il n'affiche jamais la clé.

import Anthropic from '@anthropic-ai/sdk';
import { buildPayload, parseResponse, MODEL, BETA_REPLI } from '../web/js/vision-prompt.js';
import { GAMES } from '../web/js/games/index.js';

const ok = (m) => console.log(`  [32m✓[0m ${m}`);
const ko = (m) => console.log(`  [31m✗[0m ${m}`);

/** Une vraie image PNG (160x100), générée une fois et figée ici. */
function imageDeTest() {
  return 'iVBORw0KGgoAAAANSUhEUgAAAKAAAABkCAIAAACO1KzYAAAB6UlEQVR42u3dv44pUQDA4WNpaFal9AaiJiuZLSh11BIv4BFUdB5AsU8g2ZeQ6JTbKKcRIlGKZm4hdxuyxfXnZtb3VaeYkTg/54zCiUySJIHf68UUCIzACIzACIzACCwwAiMwAiMwAiOwwAiMwAjMI+WuuTmTyZjBx/jnn85ZwbZonnaLvn4D4d4PQSvYFo3ACIzACIzACCwwAiMwAiMwAiOwwAiMwAiMwAiMwAgs8P/y+fkZRVEURblc7jSYzWaFQiH6azKZhBCWy2Wr1Xp/f282m3EcX7zr2QsnV7jJi/zs9fX14vikWq3GcZwkyWw263a7P1yZUtfPcC7Vn87NZnM4HEII7Xa7VCrZkH/bM3g0GjUajX6/P5/PG42GnOkOfDwev5/Bi8UihNDr9b6+vt7e3gaDwXA4lPNc5ppzY99Ho+53+KxYLO73+/NxCGG73a5Wq3q9fhpXKpX1en3xyhTnuXqGX1L95rvdbhzHIYTdblcul63Xc2n6knXaok/jWq02Ho+n02mn08nn89ls9uPjQ870bdHPnueZt2gERmCBERiBERiBERiBBUZgBEZgBEZgBBYYgREYgRGYG7rN76L9BZoVjMDcQcahBCsYgREYgREYgRFYYARGYARGYARGYIERGIERmEf6Aw9IOR2GFNg1AAAAAElFTkSuQmCC';
}

async function main() {
  console.log(`\nVérification de la lecture photo (modèle ${MODEL})\n`);

  if (!process.env.ANTHROPIC_API_KEY) {
    ko('ANTHROPIC_API_KEY n’est pas définie.');
    console.log('\n    Lancez :  ANTHROPIC_API_KEY=sk-ant-... npm run check');
    console.log('    La clé se crée sur https://console.anthropic.com → Settings → API keys.\n');
    process.exit(1);
  }
  ok('Une clé est présente dans l’environnement.');

  const client = new Anthropic();

  // 1. La clé est-elle acceptée ? Un appel minuscule suffit.
  try {
    await client.messages.create({
      model: MODEL,
      max_tokens: 16,
      messages: [{ role: 'user', content: 'Réponds exactement : ok' }],
    });
    ok('La clé est acceptée par l’API.');
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      ko('La clé est refusée par l’API (401). Vérifiez qu’elle est active et complète.');
    } else if (error instanceof Anthropic.PermissionDeniedError) {
      ko('Clé valide mais sans accès à ce modèle (403).');
    } else if (error instanceof Anthropic.RateLimitError) {
      ko('Trop de requêtes (429) : réessayez dans un instant.');
    } else if (error instanceof Anthropic.APIConnectionError) {
      ko('Impossible de joindre api.anthropic.com : problème de réseau ou de proxy.');
    } else {
      ko(`Échec inattendu : ${error.message}`);
    }
    console.log('');
    process.exit(1);
  }

  // 2. Le format de requête de l'appli passe-t-il vraiment ?
  const jeu = GAMES.find((g) => g.vision) ?? GAMES[0];
  try {
    const message = await client.beta.messages.create({
      betas: [BETA_REPLI],
      ...buildPayload({
        mode: 'scoresheet',
        game: jeu,
        players: ['Test'],
        imageBase64: imageDeTest(),
        mediaType: 'image/png',
      }),
    });
    const lu = parseResponse(message);
    if (typeof lu?.detected !== 'string') throw new Error('champ "detected" absent de la réponse');
    ok(`La requête de l’appli est acceptée et la réponse est conforme (detected = "${lu.detected}").`);
    console.log(`\n  Tout est prêt : la lecture photo fonctionnera dans l’appli.`);
    console.log(`  Coût de cette vérification : moins d’un centime.\n`);
  } catch (error) {
    ko(`La clé marche, mais la requête de l’appli échoue : ${error.message}`);
    console.log('\n  C’est un problème de code, pas de configuration : signalez ce message.\n');
    process.exit(1);
  }
}

main().catch((error) => {
  ko(`Erreur inattendue : ${error.message}`);
  process.exit(1);
});
