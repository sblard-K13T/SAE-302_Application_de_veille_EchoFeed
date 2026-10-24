// Lecture des flux RSS de chaque catégorie
const request = require('request');
const FeedParser = require('feedparser');
const { v4: uuidv4 } = require('uuid');
const { CATEGORIES } = require('./config');
const { nettoyerDescription, calculerScore, niveauArticle } = require('./scoring');

function lireFlux(url, cat) {
    return new Promise((resolve) => {
        const articles = [];
        request({ url, timeout: 10000, encoding: null, headers: { 'User-Agent': 'EchoFeed/1.0' } }, (err, res, body) => {
            if (err || !res || res.statusCode !== 200) return resolve(articles);

            const feedparser = new FeedParser();
            feedparser.on('error', () => resolve(articles));
            feedparser.on('end', () => resolve(articles));
            feedparser.on('readable', function () {
                let item;
                while ((item = this.read())) {
                    const titre = item.title || 'Sans titre';
                    const description = nettoyerDescription(item.description || item.summary || '');
                    const score = calculerScore(titre, description, CATEGORIES[cat].mots);

                    articles.push({
                        id: String(item.guid || item.link || uuidv4()),
                        titre,
                        description,
                        lien: item.link || '',
                        score,
                        niveau: niveauArticle(score, cat),
                        categories: [cat],
                        date_publication: item.pubdate ? item.pubdate.toUTCString() : 'Date non disponible',
                        auteur: item.author || 'Auteur non disponible',
                        date_ajout: new Date().toISOString()
                    });
                }
            });
            feedparser.end(body);
        });
    });
}

// Récupère tous les flux de toutes les catégories en parallèle
async function recupererArticlesRSS() {
    const taches = [];
    for (const [cat, cfg] of Object.entries(CATEGORIES)) {
        cfg.feeds.forEach(url => taches.push(lireFlux(url, cat)));
    }
    return (await Promise.all(taches)).flat();
}

module.exports = { recupererArticlesRSS };
