# Identité visuelle — Quiz entre amis

Brief à donner à une IA générative d'images. Les prompts sont en anglais : tous
les modèles le comprennent mieux, et surtout ils suivent bien plus fidèlement
les codes hexadécimaux. Ce qui est entre crochets est à remplacer.

La palette n'est pas un choix à faire ici : elle est déjà dans
`web/quiz/styles.css`. Si elle change là-bas, ce document a tort.

| Rôle | Hex |
|---|---|
| Fond | `#0f1116` |
| Surface | `#171a22` |
| Indigo (accent) | `#6366f1` |
| Or | `#f5c518` |
| Menthe | `#34d399` |
| Corail | `#f87171` |

## Ce qui est déjà fixé

L'icône présente dans `web/icons/icon.svg` n'est **pas** celle du quiz : c'est
celle du compteur de points, héritée telle quelle au montage de l'application.
Elle est à remplacer entièrement.

| Visuel | Taille | Contrainte |
|---|---|---|
| Icône de l'app | 1024 × 1024 | Aucune transparence, coins carrés (iOS applique son masque), aucun texte |
| Écran de lancement | 2732 × 2732 | Motif au centre : tout le reste est rogné selon le téléphone |
| Icônes web | 192 · 512 · 180 | Déduites du 1024, plus une version « maskable » resserrée |
| Vignette d'un pack | 1024 × 1024 | Lisible à 96 px, sa taille réelle dans la boutique |
| Fond de capture | 1290 × 2796 | Vide au centre : la capture et le titre viennent par-dessus |

## Trois directions pour l'icône

Une seule sera retenue, et elle décide de tout le reste. Générer les trois, les
regarder **réduites à 60 px** — la taille réelle sur un écran d'accueil — et
garder celle qui se reconnaît encore.

### A · Le buzzer (recommandée)

Le geste central du jeu : le doigt qui s'abat sur le pupitre. La plus lisible en
tout petit, parce qu'elle tient dans un cercle et une couleur.

```
Square app icon, 1024x1024, flat vector illustration, centred composition.
A single glossy round game-show buzzer button seen from a slight
three-quarter angle: deep indigo dome (#6366f1) with a thin warm gold rim
(#f5c518), resting on a near-black ground (#0f1116). A soft indigo glow
spreads from underneath the button, and two faint concentric rings suggest
the sound travelling outward. Minimal, geometric, high contrast, crisp
edges, no gradient other than the dome's own sheen. Bold shapes that stay
readable when the image is shrunk to 60 pixels.
No text, no letters, no numbers, no hands, no people.
Full bleed to the edges, square corners, fully opaque background,
no drop shadow outside the square.
```

### B · Les pupitres

Ce que le jeu est réellement : quatre téléphones autour d'une table. Plus
narrative, plus dure à lire en petit — à ne garder que si la version réduite
tient.

```
Square app icon, 1024x1024, flat vector illustration, top-down view.
Four rounded rectangles laid out like four phones around an invisible round
table, evenly spaced, each slightly rotated toward the centre. Each screen
glows a different flat colour: indigo #6366f1, gold #f5c518, mint #34d399,
coral #f87171. The ground is near-black #0f1116. A single small gold dot
sits at the exact centre with a faint halo around it. Minimal, geometric,
generous empty space, strong silhouette.
No text, no letters, no numbers, no hands, no people, no interface details
on the screens.
Full bleed to the edges, square corners, fully opaque background.
```

### C · La question

Une bulle de dialogue dont la queue devient un point d'interrogation. La plus
sage, et la plus proche de ce que font les autres applications de quiz.

```
Square app icon, 1024x1024, flat vector illustration, centred.
A rounded speech bubble in deep indigo (#6366f1) whose tail curls downward
and becomes the hook of a question mark; the dot of the question mark is a
warm gold circle (#f5c518). Near-black ground (#0f1116) with a soft indigo
glow behind the bubble. Thick simple forms, very few details, designed to
stay readable at 60 pixels.
No text, no letters, no numbers.
Full bleed to the edges, square corners, fully opaque background.
```

## Les autres visuels

Remplacer `[LE MOTIF RETENU]` par la description de l'icône gagnante — « the
indigo buzzer button », « the four phones seen from above », « the indigo
question-mark bubble ». C'est ce qui fait tenir la famille ensemble.

### Écran de lancement — 2732 × 2732

```
Square image, 2732x2732, launch screen. Near-black ground (#0f1116),
almost entirely empty. [LE MOTIF RETENU] sits exactly at the centre and
occupies about 22% of the width, with a very soft indigo glow (#6366f1)
behind it and a barely visible vignette darkening the corners.
Nothing whatsoever in the outer third of the image, on any side.
No text, no logo, no wordmark, no objects near the edges.
Flat, calm, fully opaque.
```

### Vignette du pack Spécial Noël — 1024 × 1024

```
Square cover art for a Christmas quiz pack, 1024x1024, flat vector
illustration. A stylised pine tree built from three simple triangles in deep
pine green, outlined in warm gold (#f5c518), with a single gold star at the
top, standing on a near-black ground (#0f1116). A soft indigo glow (#6366f1)
behind the tree, and a scatter of tiny gold dots like distant lights.
Minimal, geometric, festive but restrained — closer to a winter night sky
than to wrapping paper.
No text, no letters, no Santa Claus, no branded characters, no snow globes.
```

### Vignette du pack Années 80-90 — 1024 × 1024

Même cadre, même fond, un objet à la place de l'autre : c'est ce qui fera que
les deux vignettes se ressemblent en rayon.

```
Square cover art for a 1980s-90s nostalgia quiz pack, 1024x1024, flat
vector illustration. A front view of an audio cassette, geometric and
simplified: body in deep indigo (#6366f1), the two reels picked out in warm
gold (#f5c518), on a near-black ground (#0f1116). Behind it, a faint
perspective grid receding toward a low horizon, drawn in thin indigo lines —
retro, but restrained, no neon overload, no sunset.
Minimal, high contrast, generous margins.
No text, no letters, no brand logos, no characters.
```

### Fond des captures App Store — 1290 × 2796

L'image ne sert que de fond : la vraie capture d'écran du jeu et sa légende se
posent dessus.

```
Vertical background image, 1290x2796, for App Store screenshots.
Near-black (#0f1116) with a wide, very soft indigo glow (#6366f1) in the
upper third, fading to plain near-black at the bottom. Two or three enormous
and very faint concentric rings centred on the glow. A subtle fine film
grain over the whole image.
Nothing else at all: no objects, no devices, no phones, no text — a phone
screenshot and a caption will be placed on top later.
```

### Image de partage — 1200 × 630

```
Horizontal image, 1200x630. Near-black ground (#0f1116). Three simplified
phones seen at a slight angle, fanned out from the lower left corner, each
screen a flat block of colour with no interface detail (indigo #6366f1, gold
#f5c518, mint #34d399). Wide empty space across the right half, where a
title will be typeset later. Soft indigo glow behind the phones, subtle
film grain.
No text, no letters, no hands, no people.
```

## Ce que le modèle voudra faire quand même

Ces consignes sont déjà dans les prompts, mais les modèles les perdent au bout
de quelques allers-retours. Si une image revient fautive, recoller la ligne.

- **Pas de texte, jamais.** Les modèles écrivent du faux français, et Apple
  déconseille de toute façon le nom dans l'icône.
- **Pas de coins arrondis** sur l'icône : iOS applique son propre masque, un
  arrondi dessiné donnerait un double bord.
- **Pas de transparence.** Un canal alpha fait échouer l'envoi sur l'App Store.
- **Pas de personnages sous droits** — ni Mickey, ni Mario, ni Pokémon. Le jeu
  *pose des questions* sur ces univers, il ne les montre pas.
- **Pas de mains, pas de visages** : c'est ce que les modèles ratent le plus, et
  une icône n'en a pas besoin.
- **Pas de pastiche** d'un jeu de société existant, boîte et logo compris.
- **Une seule idée par image.** Ce qui se lit à 60 px, c'est une forme et deux
  couleurs, pas trois objets bien dessinés.

## Que faire des fichiers reçus

1. **Vérifier en petit avant tout le reste.** Réduire l'icône à 60 px et la
   regarder à un bras de distance. Si l'on hésite sur ce que c'est, aucune
   retouche ne la sauvera : redemander quatre variantes avec « bolder shapes,
   fewer details ».

2. **Aplatir l'icône** — supprime la transparence, force le PNG et le format
   exact, sans quoi l'envoi sur l'App Store est rejeté :

   ```sh
   magick icone-recue.png -background '#0f1116' -alpha remove -alpha off \
     -resize 1024x1024^ -gravity center -extent 1024x1024 assets/icon.png
   ```

3. **Fabriquer toutes les tailles.** Placer l'écran de lancement en
   `assets/splash.png` (2732 × 2732) et le copier en `assets/splash-dark.png` :

   ```sh
   npx @capacitor/assets generate --ios \
     --iconBackgroundColor '#0f1116' \
     --splashBackgroundColor '#0f1116'
   ```

4. **Remplacer les icônes du site.** La version *maskable* est la seule qui
   demande un dessin à part : Android en rogne les bords, le motif doit tenir
   dans le cercle central. La demander avec « the motif smaller, occupying only
   the central 70% of the square, plain background elsewhere ».

   ```sh
   magick assets/icon.png -resize 192x192 web/icons/icon-192.png
   magick assets/icon.png -resize 512x512 web/icons/icon-512.png
   magick assets/icon.png -resize 180x180 web/icons/apple-touch-icon.png
   magick maskable-recue.png -resize 512x512 web/icons/icon-maskable-512.png
   ```

Reste `web/icons/icon.svg`, l'icône vectorielle du site : une fois la direction
choisie, la redessiner à la main en quelques formes. Un SVG de trente lignes
reste net à toutes les tailles, là où un PNG agrandi bave.
