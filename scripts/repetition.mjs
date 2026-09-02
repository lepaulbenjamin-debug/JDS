// Répétition générale : quatre pupitres et la télé jouent une partie entière,
// dans de vrais navigateurs, contre un vrai relais.
//
// Ce que les tests unitaires ne voient pas : le réseau entre les appareils, un
// téléphone qui recharge en pleine manche, l'écran commun qui suit avec un tour
// de retard. Autant de choses qui ne se découvrent, sinon, que devant les amis.
//
//   npm start                         # dans un autre terminal
//   node scripts/repetition.mjs
//   node scripts/repetition.mjs https://quiz-entre-amis.vercel.app/quiz/
//
// Playwright n'est pas une dépendance du projet : il ne sert qu'ici et pèse
// plus que tout le reste réuni.

const BASE = process.argv[2] ?? 'http://127.0.0.1:8099/quiz/';
const PRENOMS = ['Ana', 'Bruno', 'Chloé', 'Dimitri'];
const soucis = [];
const dire = (...m) => console.log(...m);

const pupitre = async (navigateur, prenom) => {
  const contexte = await navigateur.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  });
  const page = await contexte.newPage();
  page.on('pageerror', (e) => soucis.push(`${prenom} : erreur JS — ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') soucis.push(`${prenom} : console — ${m.text().slice(0, 120)}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400) soucis.push(`${prenom} : ${r.status()} sur ${new URL(r.url()).pathname}`);
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.fill('#mon-prenom', prenom);
  return { page, contexte, prenom };
};

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('\nPlaywright manque. Installez-le :\n');
  console.error('  npm i -D playwright && npx playwright install chromium\n');
  process.exit(2);
}

const navigateur = await chromium.launch({
  executablePath: process.env.CHROMIUM || undefined,
  // Le navigateur ne sort pas seul de cet environnement : il passe par le même
  // relais que le reste, et accepte son autorité de certification.
  proxy: BASE.startsWith('http://127.') || BASE.startsWith('http://localhost')
    ? undefined
    : (process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined),
  ignoreHTTPSErrors: true,
  args: [
    '--autoplay-policy=no-user-gesture-required', '--mute-audio',
    '--ignore-certificate-errors', '--disable-quic',
    '--disable-features=HttpsUpgrades,HttpsFirstBalancedMode',
  ],
});

const joueurs = [];
for (const prenom of PRENOMS) joueurs.push(await pupitre(navigateur, prenom));
const [regie, ...invites] = joueurs;

dire(`Adresse : ${BASE}`);

// --- Le salon --------------------------------------------------------------

await regie.page.click('#btn-creer');
await regie.page.waitForSelector('#choix-nombre .chip', { timeout: 20000 });
// La partie la plus courte, pour tenir dans une répétition.
const manches = await regie.page.$$eval('#choix-nombre .chip', (n) => n.map((b) => b.textContent.trim()));
dire('Longueurs proposées :', manches.join(' · '));
await regie.page.click('#choix-nombre .chip');
await regie.page.click('#btn-ouvrir-salon');
await regie.page.waitForSelector('#code-affiche', { timeout: 20000 });
const code = (await regie.page.textContent('#code-affiche')).trim();
dire(`Salon ouvert : ${code}`);

for (const invite of invites) {
  await invite.page.fill('#code-salon', code);
  await invite.page.click('#btn-rejoindre');
}

// La télé, qui ne rejoint pas la table : elle ne fait que regarder.
const tele = await (await navigateur.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } })).newPage();
tele.on('pageerror', (e) => soucis.push(`télé : erreur JS — ${e.message}`));
await tele.goto(`${new URL('tv.html', BASE).href}#${code}`, { waitUntil: 'domcontentloaded' });

await regie.page.waitForFunction(
  () => document.querySelectorAll('#liste-joueurs > *').length >= 4,
  null, { timeout: 25000 },
).catch(() => soucis.push('la régie ne voit pas les quatre joueurs'));

const vus = await tele.$$eval('#tv-joueurs .tv-joueur', (n) => n.map((e) => e.textContent));
dire('Vus sur la télé :', vus.join(', ') || '(aucun)');
if (vus.length !== 4) soucis.push(`la télé voit ${vus.length} joueurs sur 4`);

// --- La partie -------------------------------------------------------------

await regie.page.click('#btn-lancer');
dire('Partie lancée. On joue…');

const repondre = async ({ page }) => {
  // Chacun tape la première réponse offerte, quelle que soit la forme de manche.
  await page.evaluate(() => {
    const bouton = document.querySelector('#jeu-reponses button:not([disabled])');
    if (bouton) return bouton.click();
    const champ = document.querySelector('#jeu-reponses input:not([disabled])');
    if (champ) {
      champ.value = champ.type === 'number' ? '42' : 'une réponse';
      champ.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#jeu-reponses button[type="submit"], #jeu-reponses .btn-primary')?.click();
    }
  });
};

const debut = Date.now();
let tours = 0;
let fini = false;
let recharge = false;
while (Date.now() - debut < 420000) {
  // À mi-partie, un téléphone se verrouille et Safari recharge la page. C'est
  // l'incident le plus banal d'une soirée : il ne doit rien coûter à celui qui
  // le subit, ni bloquer la table.
  if (!recharge && tours > 25) {
    recharge = true;
    const cobaye = joueurs[2];
    await cobaye.page.reload({ waitUntil: 'domcontentloaded' });
    await cobaye.page.waitForTimeout(2500);
    const revenu = await cobaye.page.evaluate(() => ({
      ecran: [...document.querySelectorAll('[data-screen]')].find((s) => !s.hidden)?.dataset.screen ?? 'aucun',
      nom: document.querySelector('#mon-prenom')?.value ?? '',
    }));
    dire(`${cobaye.prenom} recharge en pleine partie →`, JSON.stringify(revenu));
    if (revenu.ecran !== 'jeu') soucis.push(`${cobaye.prenom} ne retrouve pas la partie après un rechargement`);
  }
  if (await regie.page.$('[data-screen="fin"]:not([hidden])')) { fini = true; break; }
  for (const joueur of joueurs) await repondre(joueur).catch(() => {});
  // Les explications se passent, sinon la répétition dure aussi longtemps qu'une soirée.
  await regie.page.evaluate(() => {
    const zone = document.querySelector('#zone-passer');
    if (zone && !zone.hidden) document.querySelector('#btn-passer')?.click();
  }).catch(() => {});
  await regie.page.waitForTimeout(700);
  tours += 1;
}

dire(fini ? `Podium atteint après ${tours} tours de boucle.` : 'La partie n’est pas allée au bout.');
if (!fini) soucis.push('la partie n’atteint pas le podium');

if (fini) {
  // La télé bat plus lentement que les pupitres : on lui laisse un tour.
  await tele.waitForTimeout(2500);
  const phaseTele = await tele.evaluate(() => ({
    ecran: [...document.querySelectorAll('[data-tv]')].find((s) => !s.hidden)?.dataset.tv ?? 'aucun',
    annonce: document.querySelector('#tv-fin-annonce')?.textContent ?? '',
  }));
  dire('Écran de la télé à la fin :', JSON.stringify(phaseTele));
  // Le cobaye a-t-il gardé sa place et son score malgré le rechargement ?
  const scores = await regie.page.$$eval('#fin-podium > *',
    (n) => Object.fromEntries(n.map((e) => [
      e.querySelector('.podium-nom')?.textContent ?? '?',
      e.querySelector('.podium-score')?.textContent ?? '?'])));
  if (!(PRENOMS[2] in scores)) soucis.push(`${PRENOMS[2]} a disparu du classement`);
  const classement = await regie.page.$$eval('#fin-podium > *',
    (n) => n.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  dire('Classement :', classement.join(' | ') || '(vide)');
  const surTele = await tele.$$eval('#tv-podium .tv-podium-nom', (n) => n.map((e) => e.textContent));
  dire('Podium sur la télé :', surTele.join(', ') || '(vide)');
  if (!surTele.length) soucis.push('la télé n’affiche pas le podium');
}

await navigateur.close();

dire('');
if (soucis.length) {
  dire(`${soucis.length} chose(s) à regarder :`);
  for (const s of [...new Set(soucis)]) dire('  •', s);
  process.exitCode = 1;
} else {
  dire('Rien à signaler : la partie se joue de bout en bout sur le site en ligne.');
}
