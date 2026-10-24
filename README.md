<p align="center"><img src="docs/images/logo_EchoFeed.jpg" alt="EchoFeed" width="360"></p>

# EchoFeed — Veille technologique en temps réel

EchoFeed est une application web de veille technologique et thématique. Elle agrège des flux RSS, classe les articles par niveau d'importance, et permet d'en discuter en direct avec d'autres utilisateurs.

![Prototype](docs/images/prototype_EchoFeed.jpg)

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Installation](#installation)
- [Utilisation](#utilisation)
- [Déploiement en ligne (Render)](#déploiement-en-ligne-render)
- [Problèmes fréquents](#problèmes-fréquents)
- [Architecture](#architecture)
- [Structure du dépôt](#structure-du-dépôt)
- [API de veille](#api-de-veille)
- [Auteurs](#auteurs)

## Fonctionnalités

- **Veille par catégories** : Technologie, Sport, Politique, Santé, Finance, Nature. Chaque utilisateur choisit ses catégories dans son profil.
- **Niveaux d'importance** : chaque article est classé *basse*, *moyenne* ou *importante* (score à base de mots-clés pondérés), avec un son d'alerte par niveau.
- **Top 10 de la semaine** (publié le dimanche à 18 h), **Daily News** (chaque matin à 8 h) et **alertes** en temps réel.
- **Chat en temps réel** (Socket.io) : un salon « Général » et un salon par catégorie choisie, avec partage d'articles dans la conversation.
- **QuackBot** : assistant virtuel (Daily News, Alertes, Top 10, guide interactif, sons).
- **Comptes** : inscription / connexion, système d'invitation, espace administrateur.
- **RGPD** : bandeau de consentement aux cookies.

## Installation

Ces étapes permettent de faire tourner EchoFeed **sur votre propre machine** (Windows, Linux ou macOS).

### 1. Installer les prérequis

| Outil | Version | Pourquoi | Téléchargement |
|---|---|---|---|
| **Node.js** (avec npm) | 18 ou plus (version LTS conseillée) | exécuter le serveur | https://nodejs.org |
| **OpenSSL** | toute version récente | créer le certificat HTTPS local | voir ci-dessous |
| **Git** (facultatif) | — | télécharger le projet avec `git clone` | https://git-scm.com |

Pour vérifier que Node.js est bien installé :

```bash
node -v    # doit afficher v18 ou plus
npm -v
```

OpenSSL selon votre système :

- **Linux** : généralement déjà présent. Sinon `sudo apt install openssl` (Debian / Ubuntu).
- **macOS** : déjà présent. En cas de problème, `brew install openssl`.
- **Windows** : installez [Git pour Windows](https://git-scm.com/download/win), qui fournit **Git Bash** et OpenSSL. Lancez ensuite **toutes les commandes ci-dessous depuis Git Bash** (clic droit dans le dossier du projet, « Open Git Bash here »), et non depuis l'invite de commandes classique.

### 2. Télécharger le projet

**Option A : sans Git**

1. Sur la page GitHub du projet, cliquez sur le bouton vert **Code**, puis **Download ZIP**.
2. Décompressez l'archive. Vous obtenez un dossier `SAE-302_Application_de_veille_EchoFeed-main`.

**Option B : avec Git**

```bash
git clone https://github.com/sblard-K13T/SAE-302_Application_de_veille_EchoFeed.git
cd SAE-302_Application_de_veille_EchoFeed
```

### 3. Ouvrir un terminal dans le dossier du projet

Toutes les commandes suivantes se lancent **dans le dossier qui contient `package.json` et `server.js`**.

```bash
cd chemin/vers/SAE-302_Application_de_veille_EchoFeed-main
ls        # vous devez voir package.json, server.js, public, veille...
```

### 4. Installer les dépendances

```bash
npm install
```

Un dossier `node_modules` est créé. Des messages « vulnerabilities » ou « deprecated » peuvent s'afficher : ils n'empêchent pas le fonctionnement.

### 5. Créer le certificat HTTPS local

Le serveur fonctionne en HTTPS. Cette commande génère `key.pem` et `cert.pem`, valables un an :

```bash
npm run cert
```

### 6. Créer le fichier de configuration `.env`

Copiez le modèle fourni :

```bash
cp .env.example .env
```

*(Sous Git Bash et Linux/macOS `cp` fonctionne. Dans l'invite de commandes Windows : `copy .env.example .env`.)*

Ouvrez ensuite `.env` avec un éditeur de texte et remplacez les valeurs :

| Variable | Rôle |
|---|---|
| `JWT_SECRET` | clé qui signe les connexions : une longue valeur aléatoire |
| `ENCRYPTION_KEY` | clé qui chiffre les messages du chat : une autre longue valeur aléatoire |
| `ROOT_PASSWORD` | mot de passe du compte administrateur `root` |
| `SMTP_*` | *(facultatif)* envoi des invitations par e-mail |

Pour générer une valeur aléatoire :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **Important :** renseignez `ROOT_PASSWORD` **avant le premier démarrage**. Le compte `root` est créé une seule fois, au premier lancement. Sans cette variable, son mot de passe est `root`.
>
> Sans `SMTP_*`, tout fonctionne quand même : le code d'invitation est simplement affiché à l'écran au lieu d'être envoyé par e-mail.

### 7. Démarrer le serveur

```bash
npm start
```

Vous devez voir notamment :

```
Compte root créé avec succès
Serveur EchoFeed HTTPS démarré sur le port 8443
Mise à jour de la veille (RSS)...
```

### 8. Ouvrir l'application

Dans votre navigateur : **https://localhost:8443**

Comme le certificat est auto-signé, le navigateur affiche un avertissement de sécurité. Ce comportement est normal en local : cliquez sur **Paramètres avancés**, puis **Continuer vers localhost** (le libellé varie selon le navigateur).

Pour arrêter le serveur : `Ctrl + C` dans le terminal.

## Utilisation

1. **Connexion administrateur** : le formulaire demande un e-mail. Saisissez `root@echofeed.local` et le mot de passe défini dans `ROOT_PASSWORD`. Le compte (nom d'utilisateur `root`) donne accès à la section « Admin ».
2. **Créer un compte** : bouton « Inscription » (le code d'invitation est facultatif).
3. **Choisir ses catégories** : page *Profil*, section « Préférences de veille ». Elles déterminent les actualités, les alertes, le Top 10 et les salons de chat disponibles.
4. **Lire la veille** : page *Actualités*. Les premiers articles apparaissent quelques secondes après le démarrage, puis la veille se met à jour toutes les 15 minutes. **Une connexion Internet est nécessaire** pour récupérer les flux RSS.
5. **En discuter** : le bouton « En discuter » d'un article l'ouvre dans le chat, dans le salon de sa catégorie.
6. **Sons** : activés après le premier clic sur la page (les navigateurs bloquent les sons avant toute interaction).

Le Top 10 de la semaine est publié le dimanche à 18 h, et le Daily News est notifié chaque jour à partir de 8 h, tant que le serveur est lancé. Avant le premier dimanche, le Top 10 est calculé en direct.

### Tester à plusieurs

Pour essayer le chat à plusieurs, ouvrez deux navigateurs (ou une fenêtre de navigation privée) et connectez-vous avec deux comptes différents. Pour qu'une autre personne du même réseau local y accède, elle ouvre `https://ADRESSE_IP_DE_VOTRE_MACHINE:8443`.

### Mettre à jour le projet

```bash
git pull          # si vous avez utilisé git clone
npm install
npm start
```

### Réinitialiser les données

Arrêtez le serveur, supprimez `data/db.json`, puis relancez : une base vide est recréée, ainsi que le compte `root`.

## Déploiement en ligne (Render)

EchoFeed a besoin d'un **serveur Node.js qui tourne en permanence** (chat en temps réel, veille RSS planifiée) : il ne peut pas être hébergé sur GitHub Pages. [Render](https://render.com) convient, avec un **Web Service**.

### Étapes

1. Créez un compte sur https://render.com (connexion possible avec GitHub).
2. Cliquez sur **New +**, puis **Web Service**.
3. Choisissez ce dépôt : liez votre compte GitHub, ou collez l'adresse du dépôt dans « Public Git Repository ».
4. Renseignez le formulaire :

| Champ | Valeur |
|---|---|
| Name | `echofeed` (donne l'adresse `echofeed.onrender.com`) |
| Language | `Node` |
| Branch | `main` |
| Region | `Frankfurt (EU Central)` |
| Root Directory | *(laisser vide)* |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | `Free` pour un essai |

5. Dans **Environment Variables**, ajoutez **obligatoirement** :

| Variable | Valeur |
|---|---|
| `JWT_SECRET` | une longue valeur aléatoire |
| `ENCRYPTION_KEY` | une autre longue valeur aléatoire |
| `ROOT_PASSWORD` | le mot de passe du compte `root` |

   *(facultatif : les variables `SMTP_*` pour l'envoi d'e-mails d'invitation)*

6. Cliquez sur **Deploy Web Service**. Au bout de quelques minutes, l'application est disponible sur `https://echofeed.onrender.com` (adresse affichée en haut de la page du service).
7. Connectez-vous avec `root@echofeed.local` et le mot de passe défini dans `ROOT_PASSWORD`.

Sur Render, l'application détecte automatiquement l'hébergeur : le HTTPS et le port sont fournis par Render, aucun certificat n'est nécessaire. Le serveur **refuse de démarrer** si `JWT_SECRET`, `ENCRYPTION_KEY` ou `ROOT_PASSWORD` manquent, pour éviter de publier des secrets par défaut. Tout nouveau commit sur `main` redéploie l'application automatiquement.

### Limites de l'offre gratuite

- **Mise en veille** : sans visite pendant environ 15 minutes, le service s'endort. La première visite suivante prend une à deux minutes, et pendant ce temps la veille RSS, le chat et les alertes ne tournent pas.
- **Données non conservées** : le disque est éphémère. Les comptes, messages et articles sont effacés à chaque redéploiement ou redémarrage (le compte `root` est recréé automatiquement, les articles sont récupérés de nouveau). Pour les conserver, il faut un **Persistent Disk** (offre payante) monté par exemple sur `/var/data`, avec la variable `DATA_DIR=/var/data`.

Pour une démonstration ou une soutenance, il est conseillé d'ouvrir l'adresse quelques minutes avant, afin que le service soit réveillé.

## Problèmes fréquents

| Message ou symptôme | Cause et solution |
|---|---|
| `npm: command not found` | Node.js n'est pas installé, ou le terminal doit être rouvert après l'installation. |
| `Could not read package.json` / `ENOENT` | Le terminal n'est pas dans le bon dossier : placez-vous dans celui qui contient `package.json`. |
| `Certificats HTTPS manquants (key.pem / cert.pem)` | Lancez `npm run cert`. |
| `OpenSSL est introuvable` | Installez OpenSSL (voir étape 1). Sous Windows, utilisez Git Bash. |
| `Cannot find module 'express'` (ou autre module) | Les dépendances ne sont pas installées : lancez `npm install`. Si l'erreur persiste : supprimez le dossier `node_modules` puis relancez `npm install`. |
| `EADDRINUSE` (port déjà utilisé) | Un autre programme, ou une ancienne instance du serveur, occupe le port 8443 ou 8080. Fermez-le, ou arrêtez l'ancien serveur avec `Ctrl + C`. |
| `ERR_CONNECTION_REFUSED` dans le navigateur | Le serveur n'est pas démarré, ou il a planté : regardez le terminal. Vérifiez aussi que l'adresse commence par **https://** et se termine par **:8443**. |
| Avertissement « connexion non privée » | Normal en local (certificat auto-signé) : poursuivez vers localhost. |
| `ATTENTION : JWT_SECRET / ENCRYPTION_KEY absents du .env` | Le fichier `.env` n'existe pas ou est incomplet : reprenez l'étape 6. |
| Aucun article dans « Actualités » | Attendez quelques secondes après le démarrage, vérifiez votre connexion Internet et que des catégories sont cochées dans le profil. Le terminal affiche `N nouveaux articles ajoutés` à chaque mise à jour. |
| Pas de son | Cliquez d'abord sur la page. Vérifiez que les fichiers `.m4a` sont présents dans `public/sound/`. |
| Le `root` n'accepte pas mon mot de passe | Le compte a été créé avec une autre valeur de `ROOT_PASSWORD`. Supprimez `data/db.json` (arrêt du serveur d'abord) et relancez. |

## Architecture

| Couche | Technologies |
|---|---|
| Front-end | HTML5, CSS3, JavaScript natif |
| Back-end | Node.js, Express |
| Temps réel | Socket.io (WebSocket) |
| Veille | `feedparser`, `request` |
| Persistance | Fichier JSON (`data/db.json`) |
| Sécurité | HTTPS, bcrypt, JWT, messages chiffrés (AES) |

## Structure du dépôt

```
.
├── server.js              # Serveur Express + Socket.io (comptes, chat, administration)
├── package.json
├── .env.example           # Modèle de configuration (à copier en .env)
├── veille/                # Outil de veille (flux RSS, scoring, alertes, Top 10)
│   ├── config.js          #   catégories, flux, mots-clés, seuils : le fichier à modifier
│   └── ...                #   voir veille/README.md
├── public/                # Interface web servie par le serveur
│   ├── index.html
│   ├── css/style.css
│   ├── js/app.js
│   ├── images/guide/      #   illustrations du guide interactif
│   └── sound/             #   sons de QuackBot, du chat et des alertes (.m4a)
├── data/                  # Base JSON créée au premier lancement (non versionnée)
├── scripts/
│   └── generate-cert.sh   # Génère le certificat HTTPS auto-signé
└── docs/images/           # Logo et prototype
```

Les fichiers `.env`, `key.pem`, `cert.pem` et `data/db.json` sont propres à chaque machine : ils sont exclus du dépôt par `.gitignore` et ne doivent jamais être publiés.

## API de veille

Les résultats suivent les catégories choisies dans le profil de l'utilisateur connecté (ou `?category=`).

| Route | Description |
|---|---|
| `GET /api/articles` | Actualités |
| `GET /api/articles/top10` | Top 10 de la semaine |
| `GET /api/articles/daily` | Daily News (dernières 24 h) |
| `GET /api/articles/alertes` | Alertes (les plus importants des dernières 24 h) |

## Auteurs

- BLARD Samuel — Gestionnaire BDD / Back-End
- DOUCE Lucas — Gestionnaire Front-End / UI
