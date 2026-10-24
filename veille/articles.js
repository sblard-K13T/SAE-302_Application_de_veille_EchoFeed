// Accès aux articles stockés dans la base JSON
const { enrichir, comparerImportance } = require('./scoring');

function articlesDepuis(db, ms) {
    const limite = Date.now() - ms;
    return db.articles.filter(a => new Date(a.date_ajout).getTime() >= limite).map(enrichir);
}

function top10Categorie(db, cat) {
    return articlesDepuis(db, 7 * 24 * 3600 * 1000)
        .filter(a => a.categories[0] === cat)
        .sort(comparerImportance)
        .slice(0, 10);
}

function compterParCategorie(articles) {
    const counts = {};
    articles.forEach(a => { counts[a.categories[0]] = (counts[a.categories[0]] || 0) + 1; });
    return counts;
}

module.exports = { articlesDepuis, top10Categorie, compterParCategorie };
