# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Principal : un joueur de League of Legends qui suit sa propre progression. Il ouvre Riot Stats après une session de jeu, tape son `pseudo#tag` et veut voir d'un coup d'œil son rang, son winrate, son KDA, ses champions et ses dernières parties. Il ouvre parfois le détail d'un match et clique sur le profil d'un coéquipier ou d'un adversaire, mais c'est secondaire.

Secondaire (implicite, parce que c'est un projet vitrine) : une personne qui évalue le projet à partir du README et de la démo déployée.

## Product Purpose

Riot Stats est un tableau de bord League of Legends construit à partir d'un simple Riot ID. Il sert à suivre ses performances récentes sans passer par le client du jeu. On parle de réussite quand un joueur trouve son profil en une recherche et comprend son état de forme sans avoir à chercher dans la page.

## Positioning

C'est un projet personnel vitrine, pas un concurrent d'op.gg, u.gg ou League of Graphs. Sa raison d'être est de montrer une architecture propre et économe : cache PostgreSQL des joueurs et des matchs, téléchargement des seuls matchs nouveaux (1 appel Riot au lieu de 17 pour un profil connu), JSON complet des matchs stocké en JSONB pour que le détail d'un match ne rappelle jamais Riot, résilience (timeouts, retry sur 429), sécurité (clé côté serveur, plateforme en liste blanche, limiteur par IP) et tests sans réseau.

## Operating Context

- Parcours : accueil avec recherche par Riot ID (autocomplétion sur les joueurs déjà consultés), filtre par mode de jeu, puis tableau de bord du joueur ; bouton « Actualiser » et mention « Mis à jour … ».
- Données : sync avec Riot seulement si les données ont plus de 10 min ; région `europe` codée en dur, plateformes (`euw1`, `na1`…) en liste blanche.
- Icônes de champions, sorts, runes et items via Data Dragon.
- Déploiement : API (Docker) et PostgreSQL sur Render, front sur Vercel. La clé Riot de développement expire toutes les 24 h, donc la démo peut tomber en erreur 401/403.

## Capabilities and Constraints

- Fonctionnalités : rang Solo/Duo et Flex avec emblèmes ; winrate, KDA moyen et champion favori sur les 15 dernières parties, filtrables par mode ; historique (champion, KDA, CS/min, gold) ; stats par champion calculées en SQL sur toutes les parties en base ; détail d'un match (10 joueurs, items, sorts, runes, dégâts, vision, objectifs), où un clic sur un pseudo ouvre son profil.
- Terminologie : CS = sbires + monstres neutres ; « Riot ID » = `pseudo#tag`.
- Toute l'interface est en français. Le code, les identifiants et les commits aussi.
- Le site doit être pleinement utilisable sur téléphone, pas seulement sur desktop.
- Quota Riot : 100 requêtes / 2 min. Toute nouvelle fonctionnalité doit préserver l'économie d'appels.
- Front React 19 + Vite, sans routeur ni store (l'état vit dans `App.jsx`). Recharts est disponible.

## Brand Commitments

- Nom : **Riot Stats** (logo texte « Riot**Stats** » avec un écusson étoilé en SVG).
- Identité visuelle Hextech inspirée du client League of Legends, à conserver (engagement confirmé ; le système précis est à documenter dans DESIGN.md, pas ici).
- Mention légale obligatoire, sur chaque page : Riot Stats n'est pas affilié à Riot Games ; League of Legends et Riot Games sont des marques déposées de Riot Games, Inc. Les règles d'usage de l'API Riot doivent être respectées.
- Ton : français direct, tutoiement (« Renseigne un pseudo et un tag… »).

## Evidence on Hand

- README avec fonctionnalités, schéma d'architecture et choix techniques chiffrés (`README.md`).
- Suite de tests pytest et CI GitHub Actions.
- Pas encore d'URL de démo publique ni de capture d'écran (`docs/apercu.png` prévu mais absent). Aucun utilisateur, témoignage ou chiffre d'usage : ne pas en inventer.

## Product Principles

1. **L'essentiel en un coup d'œil.** Le joueur doit comprendre sa forme récente sans avoir à fouiller la page.
2. **Chaque appel Riot compte.** Aucune fonctionnalité ne doit casser le cache ni multiplier les appels.
3. **La qualité technique fait partie du produit.** C'est un projet vitrine : la robustesse, les états d'erreur et les états de chargement sont montrés, pas cachés.
4. **Fidèle à l'univers League, jamais confondu avec Riot.** L'identité Hextech est assumée, et la non-affiliation reste explicite.

## Accessibility & Inclusion

Aucune exigence spécifique n'a été établie au-delà d'une utilisation complète sur mobile.
