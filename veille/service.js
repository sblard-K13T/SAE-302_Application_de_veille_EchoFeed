// Service de veille : mise à jour des flux, alertes temps réel, Daily News (8h) et Top 10 (dimanche 18h)
const cfg = require('./config');
const { recupererArticlesRSS } = require('./fetcher');
const { comparerImportance } = require('./scoring');
const { articlesDepuis, top10Categorie, compterParCategorie } = require('./articles');

function cleJour(d = new Date()) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function demarrerService({ io, loadDB, saveDB }) {

    function notifierNouveauxArticles(ajoutes) {
        if (!ajoutes.length) return;

        // Nouveaux articles -> pastille "Actualités" côté client
        io.emit('veille-update', { counts: compterParCategorie(ajoutes) });

        // Alertes sonores : seulement les plus importantes (évite la rafale au démarrage)
        [...ajoutes].sort(comparerImportance).slice(0, cfg.MAX_ALERTES_PAR_CYCLE).forEach(a => {
            io.emit('veille-alert', {
                id: a.id,
                titre: a.titre,
                lien: a.lien,
                niveau: a.niveau,
                categorie: a.categories[0]
            });
        });
    }

    async function actualiserVeille() {
        console.log('Mise à jour de la veille (RSS)...');
        try {
            const recus = await recupererArticlesRSS();
            const db = loadDB();
            const connus = new Set(db.articles.map(a => a.id));
            const ajoutes = [];

            for (const a of recus) {
                if (a.score >= cfg.CATEGORIES[a.categories[0]].seuils.min && !connus.has(a.id)) {
                    connus.add(a.id);
                    db.articles.push(a);
                    ajoutes.push(a);
                }
            }

            const limite = Date.now() - cfg.RETENTION_JOURS * 24 * 3600 * 1000;
            db.articles = db.articles.filter(a => new Date(a.date_ajout).getTime() >= limite);
            saveDB(db);
            console.log(`${ajoutes.length} nouveaux articles ajoutés`);

            notifierNouveauxArticles(ajoutes);
            return ajoutes;
        } catch (err) {
            console.error('Erreur mise à jour veille:', err.message);
            return [];
        }
    }

    function verifierPlanning() {
        const now = new Date();
        const jour = cleJour(now);
        const db = loadDB();
        db.meta = db.meta || {};
        let modifie = false;

        // Daily News : une fois par jour, à partir de 8h
        if (now.getHours() >= cfg.HEURE_DAILY && db.meta.lastDaily !== jour) {
            db.meta.lastDaily = jour;
            modifie = true;
            io.emit('daily-news', { counts: compterParCategorie(articlesDepuis(db, 24 * 3600 * 1000)) });
        }

        // Top 10 de la semaine : le dimanche, à partir de 18h
        if (now.getDay() === 0 && now.getHours() >= cfg.HEURE_TOP10 && db.meta.lastTop10 !== jour) {
            db.meta.lastTop10 = jour;
            modifie = true;
            const parCategorie = {};
            cfg.CATEGORIES_IDS.forEach(c => { parCategorie[c] = top10Categorie(db, c); });
            db.top10 = { semaine: jour, genereLe: now.toISOString(), parCategorie };
            io.emit('top10-ready', { semaine: jour });
            console.log('Top 10 de la semaine publié');
        }

        if (modifie) saveDB(db);
    }

    setTimeout(actualiserVeille, 1000);
    setInterval(actualiserVeille, cfg.INTERVALLE_RSS_MS);
    setInterval(verifierPlanning, 60 * 1000);

    return { actualiserVeille, verifierPlanning };
}

module.exports = { demarrerService };
