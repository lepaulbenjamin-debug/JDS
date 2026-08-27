// Écrit un brouillon de questions pour Quiz entre amis.
//
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-questions.mjs musique 10
//
// Le résultat va dans `scripts/questions-brouillon.json`, PAS dans le jeu. Ce
// détour est le point important du script : un modèle se trompe sur des faits
// pointus, et une mauvaise réponse annoncée par l'animateur en pleine soirée ne
// se rattrape pas. On relit, on vérifie ce dont on n'est pas sûr, puis on
// recopie dans `web/quiz/js/questions.js`.

import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import Anthropic from '@anthropic-ai/sdk';
import { MODEL } from '../web/js/vision-prompt.js';
import { THEMES, QUESTIONS } from '../web/quiz/js/questions.js';

const SORTIE = join(dirname(fileURLToPath(import.meta.url)), 'questions-brouillon.json');

const SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          texte: { type: 'string', description: 'L’énoncé, une seule phrase.' },
          reponses: {
            type: 'array',
            items: { type: 'string' },
            minItems: 4,
            maxItems: 4,
            description: 'Quatre réponses, la bonne EN PREMIER.',
          },
          note: {
            type: 'string',
            description: 'Une ou deux phrases lues à la révélation : l’anecdote qui rend la réponse intéressante.',
          },
          surete: {
            type: 'string',
            enum: ['certaine', 'a-verifier'],
            description: 'a-verifier dès qu’il subsiste le moindre doute sur le fait.',
          },
        },
        required: ['texte', 'reponses', 'note', 'surete'],
      },
    },
  },
  required: ['questions'],
};

function consigne(theme, nombre, dejaVues) {
  return `Tu écris des questions pour un quiz de SOIRÉE ENTRE AMIS en français, sur le thème « ${theme} ».

Écris-en ${nombre}. Contraintes :
- Quatre réponses par question, la bonne en premier — le jeu mélange ensuite.
- Les trois mauvaises doivent être plausibles : rien qui se devine sans savoir.
- Public adulte francophone, culture partagée. Ni question de concours, ni question d'école.
- Énoncés courts : ils se lisent sur un téléphone, en quinze secondes, un verre à la main.
- La note est ce qui fait dire « ah bon, tiens » : l'anecdote, pas la reformulation de la réponse.
- Uniquement des faits stables, vérifiables et non datés. Rien qui dépende de l'actualité récente.
- Marque « a-verifier » dès le moindre doute : chiffres précis, records, superlatifs, dates serrées.

Questions déjà dans la banque, à ne pas refaire :
${dejaVues.map((q) => `- ${q}`).join('\n')}`;
}

async function main() {
  const [themeDemande, nombreDemande] = process.argv.slice(2);
  const theme = THEMES.find((t) => t.id === themeDemande);
  const nombre = Number(nombreDemande) || 10;

  if (!theme) {
    console.log(`\nUsage : node scripts/generate-questions.mjs <thème> [nombre]\n`);
    console.log(`Thèmes : ${THEMES.map((t) => t.id).join(', ')}\n`);
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('\nANTHROPIC_API_KEY n’est pas définie.\n');
    process.exit(1);
  }

  const dejaVues = QUESTIONS.filter((q) => q.theme === theme.id).map((q) => q.texte);
  console.log(`\n${theme.emoji} ${theme.nom} — ${nombre} questions demandées.`);
  console.log(`${dejaVues.length} déjà en banque, elles seront évitées.\n`);

  const client = new Anthropic();
  const reponse = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    tools: [{ name: 'proposer', description: 'Rend les questions.', input_schema: SCHEMA }],
    tool_choice: { type: 'tool', name: 'proposer' },
    messages: [{ role: 'user', content: consigne(theme.nom, nombre, dejaVues) }],
  });

  const bloc = reponse.content.find((c) => c.type === 'tool_use');
  if (!bloc) {
    console.log('Le modèle n’a rien rendu d’exploitable.');
    process.exit(1);
  }

  const propositions = bloc.input.questions.map((q, i) => ({
    id: `${theme.id.slice(0, 3)}-brouillon-${String(i + 1).padStart(2, '0')}`,
    theme: theme.id,
    texte: q.texte,
    reponses: q.reponses,
    bonne: 0,
    note: q.note,
    surete: q.surete,
  }));

  await writeFile(SORTIE, `${JSON.stringify(propositions, null, 2)}\n`, 'utf8');

  const douteuses = propositions.filter((q) => q.surete === 'a-verifier');
  console.log(`${propositions.length} questions écrites dans scripts/questions-brouillon.json`);
  if (douteuses.length) {
    console.log(`\n${douteuses.length} à vérifier avant de les recopier :`);
    for (const q of douteuses) console.log(`  • ${q.texte}  →  ${q.reponses[0]}`);
  }
  console.log('\nRelisez tout, puis recopiez dans web/quiz/js/questions.js');
  console.log('(en retirant le champ « surete »). Enfin : npm run check:quiz\n');
}

main().catch((error) => {
  console.error(`\nÉchec : ${error.message}\n`);
  process.exit(1);
});
