// La durée réelle d'un MP3, en comptant ses trames.
//
// Le générateur notait une estimation — quatorze caractères par seconde — en
// pensant qu'elle ne servait qu'au rythme. Mais le rythme, ici, c'est tout : le
// temps de lecture avant d'ouvrir les réponses, la longueur de la révélation,
// la place laissée à l'annonce avant la question. Mesurée sur les vrais clips,
// l'estimation se trompait de trente pour cent dans les deux sens : l'animateur
// se faisait couper au milieu d'une explication, ou une annonce mordait sur
// l'énoncé.
//
// Pas de décodeur : chaque trame MP3 annonce son débit et sa fréquence dans un
// en-tête de quatre octets, et porte un nombre fixe d'échantillons. Les
// additionner suffit, et ne demande aucune dépendance.

const DEBITS = {
  mpeg1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  mpeg2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const FREQUENCES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

/** La durée en secondes d'un MP3 (couche III), ou 0 s'il n'en contient aucune trame. */
export function dureeMp3(octets) {
  let i = 0;
  // Une étiquette ID3v2 en tête : sa taille est codée sur 4 × 7 bits.
  if (octets.length > 10 && octets.toString('latin1', 0, 3) === 'ID3') {
    i = 10 + ((octets[6] << 21) | (octets[7] << 14) | (octets[8] << 7) | octets[9]);
  }
  let secondes = 0;
  while (i + 4 <= octets.length) {
    if (octets[i] !== 0xff || (octets[i + 1] & 0xe0) !== 0xe0) { i += 1; continue; }
    const version = (octets[i + 1] >> 3) & 3;    // 3 : MPEG-1, 2 : MPEG-2, 0 : MPEG-2.5
    const couche = (octets[i + 1] >> 1) & 3;     // 1 : couche III
    const indiceDebit = octets[i + 2] >> 4;
    const indiceFrequence = (octets[i + 2] >> 2) & 3;
    const bourrage = (octets[i + 2] >> 1) & 1;
    if (couche !== 1 || version === 1 || indiceDebit === 0 || indiceDebit === 15 || indiceFrequence === 3) {
      i += 1;
      continue;
    }
    const debit = DEBITS[version === 3 ? 'mpeg1' : 'mpeg2'][indiceDebit] * 1000;
    const frequence = FREQUENCES[version][indiceFrequence];
    secondes += (version === 3 ? 1152 : 576) / frequence;
    i += Math.floor(((version === 3 ? 144 : 72) * debit) / frequence) + bourrage;
  }
  return secondes;
}
