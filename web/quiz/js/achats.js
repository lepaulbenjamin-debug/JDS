// La caisse de l'App Store.
//
// Sur iOS, tout contenu numérique vendu dans l'application passe obligatoirement
// par l'achat intégré — renvoyer vers un paiement web, même par un lien, fait
// refuser l'application. Ce module est donc le seul chemin d'achat de la
// version native, et il n'existe que là : sur le web, il se déclare absent et
// la boutique reste la vitrine qu'elle était.
//
// Le partage des rôles est le point important. Le plugin (`ios/AchatsPlugin.swift`)
// encaisse et rend le jeton SIGNÉ par Apple ; ce module le transmet tel quel au
// relais, qui vérifie la signature avant d'ouvrir quoi que ce soit
// (`lib/apple.js`). Rien de ce que dit l'appareil n'est cru sur parole : un
// achat validé côté téléphone se falsifierait en écrivant une ligne dans le
// stockage local.
//
// Le contrat, tenu par notre propre plugin :
//
//   getProducts({ productIds })  → { products: [{ id, price, title }] }
//   purchase({ productId })      → { transaction } | { cancelled } | { pending }
//   restorePurchases()           → { transactions: ['<jws>', …] }

const pont = () => globalThis.Capacitor?.Plugins?.Achats ?? null;

/** Vrai dans l'application native, faux partout ailleurs. */
export const disponible = () => Boolean(pont());

/**
 * Un abandon n'est pas une panne.
 *
 * Quelqu'un qui referme la feuille de paiement a changé d'avis ; lui afficher
 * une erreur, c'est lui dire que quelque chose s'est mal passé alors que non.
 * On distingue donc le renoncement du reste, plutôt que de le deviner en
 * lisant un message d'erreur.
 */
export class AchatAbandonne extends Error {
  constructor(enAttente = false) {
    super(enAttente
      ? 'Achat en attente d’autorisation. Il se débloquera tout seul.'
      : 'Achat abandonné.');
    this.name = 'AchatAbandonne';
    this.enAttente = enAttente;
  }
}

/**
 * Les prix affichés par l'App Store.
 *
 * Ce sont eux qu'il faut montrer, et non le prix écrit dans le catalogue : ils
 * arrivent dans la devise et le format du pays du compte, et ils suivent les
 * grilles tarifaires d'Apple. Une étiquette « 3,99 € » servie à un compte
 * canadien serait fausse — et c'est un motif de refus.
 */
export async function prixDuStore(produits) {
  const plugin = pont();
  if (!plugin || !produits.length) return new Map();
  try {
    const { products } = await plugin.getProducts({ productIds: produits });
    return new Map((products ?? []).map((p) => [p.id, p.price]));
  } catch {
    return new Map();               // hors-ligne : le catalogue garde ses prix
  }
}

/**
 * Envoie des transactions au relais, qui les vérifie et rend la liste des packs
 * ouverts. Achat et restauration empruntent le même chemin : l'appli transmet
 * ce que StoreKit lui donne, le relais tranche.
 */
async function faireValider(transactions, licence, base) {
  const res = await fetch(new URL(`${base}/api/packs`, location.href), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ licence, transactions }),
    cache: 'no-store',
  });
  const charge = await res.json().catch(() => null);
  if (!res.ok) throw new Error(charge?.error ?? 'Achat non confirmé.');
  return charge;
}

/**
 * Acheter un pack.
 *
 * L'achat n'est acquis qu'une fois le relais d'accord : StoreKit peut très bien
 * confirmer un paiement que la vérification refuse ensuite — transaction d'une
 * autre application, produit retiré du catalogue. Ouvrir le pack sur la seule
 * foi de StoreKit reviendrait à s'en remettre à l'appareil.
 *
 * Si le paiement passe mais que l'appel au relais échoue, rien n'est perdu :
 * l'achat reste acquis chez Apple, et « Restaurer mes achats » le rattrape.
 * C'est aussi pour ça que ce bouton n'est pas une formalité.
 */
export async function acheter(produitApple, licence, base = '') {
  const plugin = pont();
  if (!plugin) throw new Error('Les achats ne sont pas disponibles ici.');

  const { transaction, cancelled, pending } = await plugin.purchase({ productId: produitApple });
  if (cancelled) throw new AchatAbandonne(false);
  if (pending) throw new AchatAbandonne(true);
  if (!transaction) throw new Error('Achat non confirmé par l’App Store.');
  return faireValider([transaction], licence, base);
}

/**
 * Restaurer ses achats.
 *
 * Obligatoire chez Apple, et pas seulement pour la forme : nos packs sont
 * attachés à une licence d'appareil, donc changer de téléphone les perdrait.
 * StoreKit, lui, sait ce que ce compte a acheté — c'est de là que vient la
 * vérité, et cette fonction la redonne au relais.
 */
export async function restaurer(licence, base = '') {
  const plugin = pont();
  if (!plugin) throw new Error('Les achats ne sont pas disponibles ici.');

  const { transactions } = await plugin.restorePurchases();
  if (!transactions?.length) return { packs: [], accordes: [], refuses: [] };
  return faireValider(transactions, licence, base);
}
