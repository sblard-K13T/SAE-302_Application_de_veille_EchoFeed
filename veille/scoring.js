// Calcul du score d'un article et conversion en niveau d'importance (basse / moyen / important)
const { CATEGORIES, RANG_NIVEAU } = require('./config');

function nettoyerDescription(description) {
    if (!description) return '';
    return description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function echapperRegex(texte) {
    return texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Somme (nombre d'occurrences x poids) de chaque mot-clé trouvé dans le titre + la description
function calculerScore(titre, description, mots) {
    const texte = `${titre} ${description}`.toLowerCase();
    let score = 0;
    for (const [mot, poids] of Object.entries(mots)) {
        const trouves = texte.match(new RegExp(echapperRegex(mot.toLowerCase()), 'g'));
        if (trouves) score += trouves.length * poids;
    }
    return score;
}

function niveauArticle(score, cat) {
    const seuils = (CATEGORIES[cat] || CATEGORIES.technologie).seuils;
    if (score >= seuils.important) return 'important';
    if (score >= seuils.moyen) return 'moyen';
    return 'basse';
}

// Complète les articles anciens (sans catégorie ni niveau)
function enrichir(a) {
    const cat = (a.categories && a.categories[0]) || 'technologie';
    return { ...a, categories: [cat], niveau: niveauArticle(a.score, cat) };
}

// Tri : niveau d'importance d'abord, puis score
function comparerImportance(a, b) {
    return (RANG_NIVEAU[b.niveau] - RANG_NIVEAU[a.niveau]) || (b.score - a.score);
}

module.exports = { nettoyerDescription, calculerScore, niveauArticle, enrichir, comparerImportance };
