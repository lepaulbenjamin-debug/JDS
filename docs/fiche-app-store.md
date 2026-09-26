# La fiche App Store, prête à coller

Tout ce qu'App Store Connect demande, écrit d'avance. Les chiffres sont relus
dans le code : 409 questions offertes, 19 thèmes, 6 formes de manches, 16
joueurs, 5 jokers, 4 fils rouges, 4 animateurs, 7 packs à 3,99 € — ou 9,99 €
l'ensemble. Si la banque grossit, ces nombres changent ici aussi : une fiche qui
gonfle ses chiffres se fait rattraper à la première partie.

---

## Ordre des opérations, sur le Mac

1. `npm run build:ios` puis `npm run ios:sync` — le paquet web dans le projet ;
2. les quatre fichiers Swift dans la cible, les deux capacités, le schéma
   d'URL de Google : tout est dans **`apple/README.md`**, section « Les trois
   choses à faire dans Xcode » ;
3. une exécution sur un vrai téléphone, sans compte, du salon au podium ;
4. l'archive, puis les métadonnées ci-dessous ;
5. les achats intégrés (leurs fiches sont à remplir une par une, voir plus bas) ;
6. soumettre.

---

## Identité

| Champ | Valeur | Limite |
|---|---|---|
| Nom | `Quiz entre amis` | 30 |
| Sous-titre | `Chaque téléphone, un pupitre` | 30 |
| Catégorie principale | Jeux › Quiz | |
| Catégorie secondaire | Jeux › Famille | |
| Langue principale | Français (France) | |

## Mots-clés

```
soirée,apéro,jeu,amis,famille,questions,culture générale,blind test,buzzer,multijoueur,quizz
```

93 caractères sur 100. Ne pas y remettre « quiz » ni « pupitre » : ce qui est
dans le nom et le sous-titre est déjà indexé, et la place vaut cher.

## Texte promotionnel

*Modifiable sans nouvelle version — c'est là qu'on annonce un pack ou une
soirée à thème.*

```
Cinq nouveaux packs : Génération 2000-2010, En famille, Manga & anime, Geek et
Jeux de société modernes. Toujours 409 questions offertes, et toujours
l'appli qui fait l'animateur.
```

## Description

```
Vous êtes deux ou seize autour d'une table. Chacun sort son téléphone, une
personne crée la partie, les autres tapent un code à quatre lettres. Il n'y a
rien à installer pour les invités, et aucun compte à créer.

L'ANIMATEUR, C'EST L'APPLI
Elle lit les questions à voix haute, ouvre les réponses, compte les points à la
seconde près, puis explique la bonne réponse — le moment où tout le monde
apprend quelque chose. Personne ne reste sur la touche pour tenir le rôle du
maître du jeu.

SIX FAÇONS DE JOUER
• La question — quatre réponses, un tap, et plus on répond vite plus on marque
• L'estimation — un nombre à deviner, le plus proche rafle la mise
• Dans l'ordre — quatre éléments à remettre en place, on marque à chaque
  position juste
• La rafale — cinq affirmations, vrai ou faux, d'affilée
• Le mix — « une chanson avec une couleur dans le titre », réponse libre
• Tu te mets combien ? — chacun annonce sa difficulté avant de voir SA question

DES JOKERS POUR RENVERSER LA TABLE
Doubler la mise, voler des points au leader, le saboter, garder son sang-froid,
couper deux mauvaises réponses. À jouer avant de voir la question : c'est un
pari, pas une évidence.

LE FIL ROUGE
Un même mot se cache dans les bonnes réponses de plusieurs manches. Le nommer
rapporte une grosse prime — qui fond à chaque manche, alors mieux vaut être tôt
que sûr.

19 THÈMES, 409 QUESTIONS
Culture générale, musique, cinéma et séries, années 2000, bouffe, insolite,
sport, le monde, marques et pubs, mots et expressions, Disney et Pixar, les
régions de France, nature, histoire, fake news ou pas ?, Harry Potter, Pokémon,
serial killers, géopolitique.

UN ÉCRAN COMMUN, SI VOUS VOULEZ
Une télé ou un vidéoprojecteur affiche la question, le chrono et le classement
en grand — et surtout, à la révélation, ce que chacun a répondu. C'est là qu'on
rit.

CE QU'IL N'Y A PAS
Pas de publicité. Pas de pistage. Pas d'inscription obligatoire. Pas
d'abonnement. Le compte est facultatif : il garde vos statistiques, vos
questions déjà jouées et vos packs d'un appareil à l'autre, et se supprime en
deux taps.

GRATUIT, ET HONNÊTE
Les 409 questions et les 19 thèmes sont inclus. Des packs de questions
s'achètent à l'unité ou tous ensemble, sans abonnement — et un seul joueur de
la table a besoin de les acheter : ses questions sont posées à tout le monde.
```

## Nouveautés de cette version

```
Première version.
```

## URL

| Champ | Valeur |
|---|---|
| Assistance | `https://www.quizentreamis.fr/assistance` |
| Marketing | `https://www.quizentreamis.fr` |
| Confidentialité | `https://www.quizentreamis.fr/confidentialite` |

---

## Notes à l'examinateur

À coller dans « App Review Information → Notes ». Le premier paragraphe évite
le refus le plus probable : un examinateur seul devant une application qui
parle de salons et de codes.

```
L'application se joue SANS COMPTE et SANS CONNEXION. Aucun identifiant n'est
nécessaire pour la tester.

Pour tester seul : écran d'accueil → « Jouer seul ». Une partie complète se
déroule, avec toutes les formes de manches et l'animateur vocal.

Pour tester le multijoueur, il faut deux appareils (ou deux onglets) :
1. Appareil A : saisir un prénom → « Créer une partie » → « Ouvrir le salon ».
   Un code à quatre lettres s'affiche.
2. Appareil B : saisir un prénom, taper ce code → « Rejoindre ».
3. Appareil A : « Lancer la partie ».
La même partie est jouable dans un navigateur sur https://www.quizentreamis.fr/jouer/

Le compte (facultatif) sert uniquement à conserver statistiques, historique et
achats d'un appareil à l'autre. Il se crée par un code à six chiffres reçu par
courriel, ou avec Apple ou Google. Il se supprime depuis l'application :
« Mon compte » → « Supprimer mon compte et mes données », et la même fonction
existe sur le web, sans installer l'application.

Achats intégrés : des packs de questions non consommables, plus une offre qui
les réunit, à restaurer par
« Restaurer les achats » dans les réglages de la partie. Ils ne débloquent
aucune mécanique de jeu, seulement du contenu supplémentaire.

L'audio est pré-enregistré et embarqué : l'application n'a besoin du réseau que
pour faire communiquer les téléphones d'une même partie.
```

---

## Classification par âge

Le questionnaire se remplit honnêtement, et deux réponses ne vont pas de soi :

- **Thèmes d'horreur ou de peur — « peu fréquents / légers ».** Le thème
  « Serial killers » porte sur des enquêtes et des idées reçues, jamais sur des
  scènes de crime ; mais il nomme des affaires réelles, et répondre « aucun »
  serait faux.
- **Alcool, tabac ou drogues — « peu fréquents / légers ».** Quelques questions
  parlent de vin ou de cocktails.

Le reste est à « aucun ». Viser 4+ en répondant « aucun » partout serait une
fausse déclaration, et c'est le genre d'écart qui se paie au contrôle suivant.

**Résultat obtenu :** **12+** dans 172 pays, 13+ dans quelques-uns, **A14** au
Brésil, 12+ au Vietnam et en Corée du Sud. Conforme à ce qui était prévu.

Cette classification a une conséquence sur la boutique, et c'est pour ça
qu'elle est écrite ici : **aucun pack ne doit annoncer un âge inférieur à 12
ans**. Le pack familial s'appelle donc « En famille », sans mention d'âge — un
produit vendu « dès 8 ans » à l'intérieur d'une application classée 12+ est une
contradiction que l'examinateur voit avant nous.

---

## App Privacy

Le détail est dans `docs/mise-en-production.md`, section 6. En résumé : adresse
électronique, nom et contenu utilisateur (les statistiques de jeu), **liés à
l'identité**, **sans pistage**, et seulement si la personne crée un compte. Le
reste est à « non collecté ».

---

## Les achats intégrés

**Huit produits non consommables** : un par pack, plus l'offre groupée. Chacun
demande un nom d'affichage, une description, une capture d'écran de revue et un
prix.

| Identifiant | Nom affiché | Prix | Description |
|---|---|---|---|
| `fr.quizentreamis.pack.tout` | Tout le catalogue | **9,99 €** | Les sept packs d'un coup, 210 questions, au lieu de les prendre un par un. Et un pack ajouté plus tard est compris, sans rien payer de plus. |
| `fr.quizentreamis.pack.annees80_90` | Pack Années 80-90 | 3,99 € | 30 questions sur les années 80 et 90 : Walkman, Minitel, Dragon Ball et disquettes. Pour ceux qui ont connu, et pour ceux qui feront semblant. |
| `fr.quizentreamis.pack.noel` | Pack Spécial Noël | 3,99 € | 30 questions de Noël : traditions, films, chansons et repas de fête. De quoi occuper la table entre la dinde et la bûche. |
| `fr.quizentreamis.pack.generation2000` | Pack Génération 2000-2010 | 3,99 € | 30 questions sur la décennie du MSN, du Skyblog et du premier iPhone. Pour ceux qui ont eu vingt ans avant le smartphone. |
| `fr.quizentreamis.pack.enfamille` | Pack En famille | 3,99 € | 30 questions que les plus jeunes peuvent gagner, et des explications que les adultes ne connaissaient pas. Le pack où les petits battent les grands. |
| `fr.quizentreamis.pack.manga` | Pack Manga & anime | 3,99 € | 30 questions du Club Dorothée à Jujutsu Kaisen. De quoi départager ceux qui ont lu et ceux qui regardaient par-dessus l'épaule. |
| `fr.quizentreamis.pack.geek` | Pack Geek | 3,99 € | 30 questions de science-fiction, de jeux vidéo, de super-héros et d'histoire de l'informatique. Pour celui qui corrige tout le monde depuis le début de la soirée. |
| `fr.quizentreamis.pack.jeuxsociete` | Pack Jeux de société modernes | 3,99 € | 30 questions sur Catane, Dixit, Pandemic, Wingspan et les autres. Le pack qui départage celui qui possède l'étagère et celui qui lit les règles. |

La capture de revue peut être celle de la boutique dans les réglages de la
partie — Apple veut voir où le produit est proposé, et la même capture sert
pour les huit.

Les identifiants n'ont ni tiret ni accent : App Store Connect les refuse, et le
refus tombe au moment de créer le produit, pas à l'écriture du pack. Un test
(`scripts/check-quiz.mjs`) le vérifie à chaque exécution.

### Ce que l'offre groupée implique, et qu'il faut savoir avant de la créer

**Apple ne sait pas créditer un non-consommable déjà acheté.** Qui possède déjà
un pack à 3,99 € et prend ensuite l'offre repaie ce pack. Il n'existe aucun
mécanisme d'échelon ou de mise à niveau pour les non-consommables — seuls les
abonnements en ont un, et un abonnement contredirait ce que la fiche promet.
L'application le dit donc **avant** l'achat : la carte de l'offre affiche
« tu possèdes déjà N de ces packs », et suggère de prendre les autres à l'unité
si c'est moins cher. Pour un geste commercial, un code cadeau
(`QUIZROOM_CODES_CADEAU`) ouvre tout le catalogue sans passer par la caisse.

**L'offre comprend les packs à venir.** `packs/offres.json` déclare
`"packs": "tous"` : un pack ajouté plus tard est ouvert aux détenteurs de
l'offre à leur synchronisation suivante. C'est ce que « Tout le catalogue »
veut dire, et un acheteur qui verrait un pack neuf verrouillé après avoir payé
aurait raison de se sentir floué. Pour figer l'offre à son périmètre du jour,
remplacer `"tous"` par la liste des identifiants — une seule valeur à changer,
le reste du code ne bouge pas.

---

## Les captures d'écran

Huit captures sont prêtes dans `docs/captures-app-store/`, en 1290 × 2796
(grands iPhone). Elles sont prises dans une **vraie partie à quatre joueurs**,
rien n'est mis en scène.

| Fichier | Ce qu'elle montre | À garder ? |
|---|---|---|
| `1-accueil.png` | l'écran d'ouverture | remplaçable |
| `2-reglages.png` | le choix des thèmes et des réglages | oui |
| `3-salon.png` | le code à faire tourner autour de la table | **oui** |
| `4-jokers.png` | les jokers, à jouer avant de voir la question | **oui** |
| `5-question.png` | une question, le chrono en cours | **oui** |
| `6-revelation.png` | ce que toute la table a répondu, et l'explication | **oui** |
| `7-podium.png` | le podium | oui |
| `9-compte.png` | les statistiques du compte | remplaçable |

L'ordre conseillé, si l'on n'en garde que cinq : la question, la révélation, le
salon, les jokers, le podium. La première capture est celle que les gens
voient dans les résultats de recherche — c'est la question qui doit y être, pas
un écran de réglages.

Deux points à vérifier avant l'envoi :

- App Store Connect réclame aujourd'hui un jeu pour les **grands iPhone** et un
  pour l'**iPad** si l'application le déclare compatible. Si l'iPad n'est pas
  pris en charge, le décocher dans les capacités de la cible évite d'avoir à
  fournir des captures qu'on n'a pas.
- Rien dans ces images ne doit ressembler à un prix ou à une promesse : pas de
  mention « gratuit », pas de badge inventé.
