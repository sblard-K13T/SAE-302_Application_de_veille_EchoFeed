// Routes API de la veille : /api/articles, /top10, /daily, /alertes
// Les résultats sont filtrés selon ?category=... ou les préférences de veille du compte connecté.
const express = require('express');
const cfg = require('./config');
const { enrichir, comparerImportance } = require('./scoring');
const { articlesDepuis, top10Categorie } = require('./articles');

function creerRoutes({ loadDB, jwt, JWT_SECRET }) {
    const router = express.Router();

    // ?category=... > catégories choisies dans le profil > toutes les catégories
    function categoriesDemandees(req) {
        if (req.query.category && cfg.CATEGORIES[req.query.category]) return [req.query.category];
        const header = req.headers.authorization;
        if (header) {
            try {
                const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
                const user = loadDB().users.find(u => u.id === decoded.id);
                const choisies = ((user && user.categories) || []).filter(c => cfg.CATEGORIES[c]);
                if (choisies.length) return choisies;
            } catch { /* token invalide : toutes les catégories */ }
        }
        return cfg.CATEGORIES_IDS;
    }

    const JOUR = 24 * 3600 * 1000;

    // Actualités
    router.get('/', (req, res) => {
        const cats = categoriesDemandees(req);
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const articles = loadDB().articles.map(enrichir)
            .filter(a => cats.includes(a.categories[0]))
            .sort((a, b) => new Date(b.date_ajout) - new Date(a.date_ajout) || comparerImportance(a, b));
        res.json(articles.slice(offset, offset + limit));
    });

    // Top 10 : instantané publié le dimanche soir, ou calcul en direct tant qu'il n'y en a pas
    router.get('/top10', (req, res) => {
        const db = loadDB();
        const liste = categoriesDemandees(req)
            .flatMap(c => db.top10 ? (db.top10.parCategorie[c] || []) : top10Categorie(db, c));
        res.json(liste.map(enrichir).sort(comparerImportance).slice(0, 10));
    });

    // Daily News : dernières 24 h
    router.get('/daily', (req, res) => {
        const cats = categoriesDemandees(req);
        res.json(articlesDepuis(loadDB(), JOUR).filter(a => cats.includes(a.categories[0])).sort(comparerImportance));
    });

    // Alertes : les plus importants des dernières 24 h
    router.get('/alertes', (req, res) => {
        const cats = categoriesDemandees(req);
        res.json(articlesDepuis(loadDB(), JOUR).filter(a => cats.includes(a.categories[0])).sort(comparerImportance).slice(0, 10));
    });

    return router;
}

module.exports = { creerRoutes };
