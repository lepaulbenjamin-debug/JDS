// Fabrique de transactions signées, pour les tests.
//
// On ne peut pas éprouver un vérificateur d'achats avec de vraies transactions :
// il en faudrait une par cas, dont celles qu'Apple n'émet jamais — chaîne
// tronquée, signature retouchée, racine étrangère. C'est précisément ces
// cas-là qu'il faut voir échouer.
//
// Ce module construit donc une autorité de test complète (racine,
// intermédiaire, feuille en P-256) et signe des transactions avec. La forme est
// celle d'Apple ; seule la racine diffère, et c'est justement le point qu'on
// épingle. Rien ici ne sert en production.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { X509Certificate, createSign } from 'node:crypto';

const openssl = (args, cwd) => execFileSync('openssl', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });

const enBase64Url = (buffer) => Buffer.from(buffer)
  .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/**
 * Une autorité complète : racine → intermédiaire → feuille.
 *
 * Trois niveaux et non deux, parce que c'est la forme d'Apple et que la boucle
 * de vérification doit être éprouvée sur plus d'un maillon.
 */
export function fabriquerAutorite() {
  const dossier = mkdtempSync(join(tmpdir(), 'faux-apple-'));

  const cle = (nom) => {
    openssl(['ecparam', '-name', 'prime256v1', '-genkey', '-noout', '-out', `${nom}.key`], dossier);
    return join(dossier, `${nom}.key`);
  };

  // La racine, auto-signée.
  cle('racine');
  openssl([
    'req', '-x509', '-new', '-key', 'racine.key', '-sha256', '-days', '2',
    '-subj', '/CN=Fausse racine de test', '-out', 'racine.pem',
  ], dossier);

  // L'intermédiaire, émis par la racine.
  cle('inter');
  openssl(['req', '-new', '-key', 'inter.key', '-subj', '/CN=Faux intermediaire', '-out', 'inter.csr'], dossier);
  writeFileSync(join(dossier, 'inter.ext'), 'basicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign\n');
  openssl([
    'x509', '-req', '-in', 'inter.csr', '-CA', 'racine.pem', '-CAkey', 'racine.key',
    '-CAcreateserial', '-days', '2', '-sha256', '-extfile', 'inter.ext', '-out', 'inter.pem',
  ], dossier);

  // La feuille, qui signera les transactions.
  cle('feuille');
  openssl(['req', '-new', '-key', 'feuille.key', '-subj', '/CN=Faux signataire', '-out', 'feuille.csr'], dossier);
  openssl([
    'x509', '-req', '-in', 'feuille.csr', '-CA', 'inter.pem', '-CAkey', 'inter.key',
    '-CAcreateserial', '-days', '2', '-sha256', '-out', 'feuille.pem',
  ], dossier);

  const pem = (nom) => readFileSync(join(dossier, `${nom}.pem`), 'utf8');
  const der = (nom) => new X509Certificate(pem(nom)).raw.toString('base64');

  const autorite = {
    racine: new X509Certificate(pem('racine')),
    x5c: [der('feuille'), der('inter'), der('racine')],
    clePrivee: readFileSync(join(dossier, 'feuille.key'), 'utf8'),
    /** Range le dossier temporaire. */
    ranger: () => rmSync(dossier, { recursive: true, force: true }),
  };
  return autorite;
}

/** Une transaction signée, de la forme rendue par StoreKit. */
export function signerTransaction(autorite, charge, { x5c, alg = 'ES256' } = {}) {
  const entete = enBase64Url(JSON.stringify({ alg, x5c: x5c ?? autorite.x5c }));
  const corps = enBase64Url(JSON.stringify(charge));
  const signature = createSign('SHA256')
    .update(`${entete}.${corps}`)
    .sign({ key: autorite.clePrivee, dsaEncoding: 'ieee-p1363' });
  return `${entete}.${corps}.${enBase64Url(signature)}`;
}

/** Une charge utile plausible, que chaque test ajuste. */
export const transactionType = (extra = {}) => ({
  bundleId: 'fr.quizentreamis.app',
  productId: 'fr.quizentreamis.pack.noel',
  transactionId: '2000000900000001',
  originalTransactionId: '2000000900000001',
  purchaseDate: Date.now(),
  type: 'Non-Consumable',
  environment: 'Sandbox',
  ...extra,
});
