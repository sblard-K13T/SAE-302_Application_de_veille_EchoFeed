# Outil de veille EchoFeed

- `config.js`  : catégories, flux RSS, mots-clés, seuils d'importance (le seul fichier à modifier d'habitude)
- `scoring.js` : score d'un article -> niveau basse / moyen / important
- `fetcher.js` : lecture des flux RSS
- `articles.js`: accès aux articles de la base
- `service.js` : mise à jour toutes les 15 min, alertes temps réel, Daily News (8h), Top 10 (dimanche 18h)
- `routes.js`  : API /api/articles, /top10, /daily, /alertes
- `index.js`   : point d'entrée appelé par server.js (initVeille)
