// L'icône de l'application native, posée dans le catalogue d'assets d'Xcode.
//
// Pourquoi ce fichier existe : `cap sync` copie le paquet web et les plugins,
// et **ne touche pas aux icônes**. Le catalogue reste donc celui du gabarit de
// Capacitor — un carré gris — et c'est lui qu'on retrouve sur le téléphone, dans
// TestFlight et sur la fiche App Store. Rien ne signale l'erreur : l'application
// se compile, se signe et se publie très bien avec l'icône de personne.
//
// Le dossier `ios/` n'étant pas versionné (il est engendré par `cap add ios` sur
// le Mac), l'icône ne peut pas y être déposée une fois pour toutes. Elle est
// donc reposée à chaque `npm run build:ios`, qui tourne juste avant `cap sync`.
//
// Deux vérifications avant d'écrire, parce qu'elles coûtent un mois quand on les
// découvre à l'envoi :
//
//   - 1024 × 1024 exactement. En dessous, Xcode refuse l'archive ;
//   - aucune transparence. Une icône avec canal alpha est rejetée par App Store
//     Connect (ITMS-90717) après le téléversement, c'est-à-dire après vingt
//     minutes d'attente et sans que rien n'ait prévenu dans Xcode.

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';

/** Les entrées d'en-tête d'un PNG, sans dépendance ni décodage complet. */
export function lireLEnTetePng(donnees) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!donnees.subarray(0, 8).equals(signature)) {
    throw new Error('ce n’est pas un PNG.');
  }
  return {
    largeur: donnees.readUInt32BE(16),
    hauteur: donnees.readUInt32BE(20),
    typeDeCouleur: donnees[25],
    // Un PNG sans canal alpha peut quand même déclarer une couleur transparente
    // par un bloc tRNS. Apple compte cela comme de la transparence.
    tRNS: donnees.includes(Buffer.from('tRNS', 'ascii')),
  };
}

/**
 * L'icône est-elle acceptable pour l'App Store ?
 *
 * Renvoie la liste des reproches, vide si tout va bien. Une liste plutôt qu'une
 * exception : on veut les dire tous d'un coup, pas les découvrir un par un.
 */
export function reprochesALIcone(entete) {
  const reproches = [];
  if (entete.largeur !== 1024 || entete.hauteur !== 1024) {
    reproches.push(`elle fait ${entete.largeur} × ${entete.hauteur}, il faut 1024 × 1024`);
  }
  // 6 = RVB+alpha, 4 = gris+alpha, 3 = palette (qui peut porter un tRNS).
  if (entete.typeDeCouleur === 6 || entete.typeDeCouleur === 4) {
    reproches.push('elle a un canal alpha : App Store Connect la rejettera (ITMS-90717)');
  }
  if (entete.tRNS) {
    reproches.push('elle déclare une couleur transparente (bloc tRNS), ce qui compte aussi');
  }
  return reproches;
}

const existe = async (chemin) => access(chemin).then(() => true, () => false);

// Xcode 16 et au-delà ne demandent plus qu'une seule image : la déclinaison en
// dix-huit tailles est faite à la compilation. Ce nom de fichier est celui que
// le gabarit de Capacitor emploie, on le garde pour ne rien casser d'autre.
const NOM = 'AppIcon-512@2x.png';
const CONTENTS = {
  images: [{ filename: NOM, idiom: 'universal', platform: 'ios', size: '1024x1024' }],
  info: { author: 'quizentreamis', version: 1 },
};

/**
 * Pose l'icône dans le projet natif, s'il existe.
 *
 * Renvoie ce qui s'est passé, pour que l'appelant l'affiche : ce script tourne
 * au milieu d'un build, et une icône silencieusement non posée est précisément
 * le problème qu'il corrige.
 */
export async function poserLIconeIOS(racine) {
  const source = join(racine, 'assets', 'icon.png');
  if (!(await existe(source))) {
    return { etat: 'source-absente', message: 'assets/icon.png est introuvable.' };
  }

  const donnees = await readFile(source);
  const reproches = reprochesALIcone(lireLEnTetePng(donnees));
  if (reproches.length) {
    throw new Error(`assets/icon.png ne convient pas :\n    - ${reproches.join('\n    - ')}`);
  }

  const dossier = join(racine, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
  if (!(await existe(join(racine, 'ios')))) {
    return {
      etat: 'projet-absent',
      message: 'projet natif pas encore engendré (npm run ios:add sur le Mac).',
    };
  }

  await mkdir(dossier, { recursive: true });
  await writeFile(join(dossier, NOM), donnees);
  await writeFile(join(dossier, 'Contents.json'), `${JSON.stringify(CONTENTS, null, 2)}\n`, 'utf8');
  return { etat: 'posee', message: `icône posée (1024 × 1024, sans transparence) dans ${dossier}` };
}
