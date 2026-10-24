// Configuration de l'outil de veille : catégories, flux RSS, mots-clés et seuils d'importance.
// C'est LE fichier à modifier pour ajouter un flux, un mot-clé ou ajuster les niveaux.

// Mots-clés de la catégorie Technologie / cybersécurité (adapté du bot Discord) : mot -> poids
const MOTS_CLES = {
    "cybersécurité": 5, "ransomware": 4, "faille": 3, "piratage": 3,
    "hacking": 4, "malware": 5, "phishing": 5, "exploitation": 4,
    "vulnérabilité": 4, "attaque": 4, "exploit": 6, "sécurité informatique": 3,
    "cryptage": 2, "fraude informatique": 5, "botnet": 6, "zero-day": 6,
    "attaque DDoS": 5, "ingénierie sociale": 5, "trojan": 5, "cheval de Troie": 5,
    "maliciel": 5, "cryptomining": 4, "ransomware-as-a-service": 6, "zéro-day": 6,
    "DNS hijacking": 5, "cryptojacking": 5, "virus informatique": 5,
    "attaque par force brute": 4, "escalade de privilèges": 5,
    "attaque par injection SQL": 5, "XSS": 5, "attaque par phishing": 5,
    "exploit kit": 6, "attaque sur le cloud": 5, "data breach": 6,
    "exfiltration de données": 5, "vol de données": 5, "fuite de données": 5,
    "sécurisation": 4, "authentification multi-facteurs": 4, "MFA": 4,
    "clés API": 3, "securisation des réseaux": 4, "firewall": 3,
    "VPN": 3, "chiffrement": 4, "certificat SSL": 3,
    "protection antivirus": 3, "mise à jour logicielle": 4, "patching": 4,
    "brute force": 5, "social engineering": 5, "attacks on endpoints": 5,
    "rootkit": 6, "backdoor": 5, "APT": 6, "spear phishing": 5,
    "worm": 5, "spoofing": 5, "DDoS": 5, "web shell": 6,
    "man-in-the-middle": 5, "bypass de sécurité": 5,
    "téléchargement de logiciels malveillants": 5, "propagation de malware": 5,
    "coupure de service": 5, "attaque de type MITM": 5,
    "falsification de requêtes": 4, "téléchargement automatique": 5,
    "surveillance réseau": 4, "hygiène numérique": 4,
    "sécurisation des données": 5, "protection des données personnelles": 5,
    "respect de la vie privée": 5, "encryption": 4,
    "exploitation des failles": 6, "attaque par injection de commande": 6,
    "récupération de mots de passe": 4, "les attaques Wi-Fi": 5,
    "cyberattaque": 5, "privilèges d'administration": 4,
    "intrusion réseau": 5, "vol d'identifiants": 5,
    "compromission de compte": 5, "cybercriminalité": 5,
    "cyberespionnage": 6, "surveillance en ligne": 3, "hameçonnage": 5,
    "ransomware locker": 6, "sécurisation des applications": 4,
    "cryptographie symétrique": 4, "cryptographie asymétrique": 4,
    "attachement malveillant": 5, "rooter": 6, "malware-as-a-service": 5,
    "menace interne": 5, "sécurité mobile": 4,
    "système d'authentification": 4, "protection contre les ransomwares": 5,
    "détection d'intrusion": 4, "logs de sécurité": 4,
    "sensibilisation à la sécurité": 3, "VPN pour sécurité": 4,
    "analyse de la vulnérabilité": 4, "protection anti-malware": 4,
    "mises à jour de sécurité": 4, "réponse aux incidents de sécurité": 5,
    "services de renseignement sur les menaces": 4,
    "sécurité des applications web": 5, "authentification forte": 4,
    "protection contre les attaques DDoS": 5, "cyber-assurance": 4,
    "techniques de piratage": 5, "identité numérique": 4
};

// Flux RSS de la catégorie Technologie / cybersécurité (adapté du bot Discord)
const URLS_RSS = [
    "https://www.undernews.fr/feed",
    "https://krebsonsecurity.com/feed/",
    "https://cert.ssi.gouv.fr/feed/",
    "https://www.exploitone.com/feed/",
    "https://heimdalsecurity.com/blog/feed/",
    "https://www.grahamcluley.com/feed/",
    "https://hackercombat.com/feed/",
    "https://securelist.com/feed/",
    "https://www.tripwire.com/state-of-security/feed/",
    "https://www.zataz.com/feed/"
];

// Chaque catégorie : label, flux RSS, mots-clés pondérés et seuils
//   seuils.min       : score minimum pour qu'un article soit conservé
//   seuils.moyen     : score à partir duquel l'importance est "moyen"      (son alerte-moyen)
//   seuils.important : score à partir duquel l'importance est "important"  (son alerte-important)
//   en dessous de "moyen" l'importance est "basse"                         (son alerte-basse)
const CATEGORIES = {
    technologie: {
        label: 'Technologie',
        feeds: [...URLS_RSS, "https://www.lemonde.fr/pixels/rss_full.xml"],
        mots: {
            ...MOTS_CLES,
            "intelligence artificielle": 5, "ia générative": 5, "openai": 4, "chatgpt": 4,
            "semi-conducteurs": 4, "ordinateur quantique": 5, "cloud": 3, "smartphone": 3,
            "robotique": 3, "open source": 3
        },
        seuils: { min: 11, moyen: 25, important: 45 }
    },
    sport: {
        label: 'Sport',
        feeds: ["https://www.lemonde.fr/sport/rss_full.xml", "https://www.francetvinfo.fr/sports.rss"],
        mots: {
            "coupe du monde": 6, "jeux olympiques": 6, "ligue des champions": 5, "finale": 4, "championnat": 4,
            "médaille": 4, "record": 4, "transfert": 4, "tournoi": 4, "grand chelem": 5, "tour de france": 5,
            "victoire": 3, "défaite": 3, "qualification": 3, "blessure": 3, "entraîneur": 3, "sélection": 3,
            "football": 3, "rugby": 3, "tennis": 3, "basket": 3, "formule 1": 4, "champion": 4, "match": 3
        },
        seuils: { min: 6, moyen: 12, important: 20 }
    },
    politique: {
        label: 'Politique',
        feeds: ["https://www.lemonde.fr/politique/rss_full.xml", "https://www.francetvinfo.fr/politique.rss"],
        mots: {
            "motion de censure": 6, "dissolution": 6, "présidentielle": 6, "législatives": 5, "élections": 5,
            "scrutin": 5, "assemblée nationale": 5, "premier ministre": 5, "projet de loi": 5, "sénat": 4,
            "gouvernement": 4, "réforme": 4, "parlement": 4, "union européenne": 4, "sanctions": 4, "coalition": 4,
            "président": 3, "ministre": 3, "budget": 3, "grève": 3, "manifestation": 3, "diplomatie": 3, "sommet": 3
        },
        seuils: { min: 6, moyen: 12, important: 20 }
    },
    sante: {
        label: 'Santé',
        feeds: ["https://www.lemonde.fr/sante/rss_full.xml", "https://www.francetvinfo.fr/sante.rss"],
        mots: {
            "alerte sanitaire": 6, "pandémie": 6, "épidémie": 6, "vaccin": 5, "rappel de produit": 5, "santé publique": 5,
            "essai clinique": 5, "cancer": 4, "virus": 4, "grippe": 4, "covid": 4, "médicament": 4, "santé mentale": 4,
            "dépistage": 4, "antibiotique": 4, "recherche médicale": 4, "hôpital": 3, "urgences": 3, "traitement": 3,
            "maladie": 3, "diabète": 3, "chirurgie": 3, "obésité": 3
        },
        seuils: { min: 6, moyen: 12, important: 20 }
    },
    finance: {
        label: 'Finance',
        feeds: ["https://www.lemonde.fr/economie/rss_full.xml", "https://www.francetvinfo.fr/economie.rss"],
        mots: {
            "récession": 6, "krach": 6, "inflation": 5, "taux d'intérêt": 5, "banque centrale": 5, "cac 40": 5,
            "faillite": 5, "fusion-acquisition": 5, "bourse": 4, "dette": 4, "déficit": 4, "chômage": 4, "bitcoin": 4,
            "cryptomonnaie": 4, "marchés financiers": 4, "wall street": 4, "pouvoir d'achat": 4, "croissance": 3,
            "investissement": 3, "fiscalité": 3, "impôts": 3, "dividende": 3, "pétrole": 3, "rachat": 3
        },
        seuils: { min: 6, moyen: 12, important: 20 }
    },
    nature: {
        label: 'Nature',
        feeds: ["https://www.lemonde.fr/planete/rss_full.xml", "https://reporterre.net/spip.php?page=backend"],
        mots: {
            "changement climatique": 6, "réchauffement": 5, "biodiversité": 5, "espèce menacée": 5, "déforestation": 5,
            "incendie de forêt": 5, "canicule": 5, "extinction": 5, "émissions de co2": 5, "sécheresse": 4, "inondation": 4,
            "pollution": 4, "glacier": 4, "écosystème": 4, "ouragan": 4, "empreinte carbone": 4, "énergies renouvelables": 4,
            "transition écologique": 4, "environnement": 3, "océan": 3, "tempête": 3, "séisme": 3, "faune": 3, "recyclage": 3
        },
        seuils: { min: 6, moyen: 12, important: 20 }
    }
};

const CATEGORIES_IDS = Object.keys(CATEGORIES);
const RANG_NIVEAU = { basse: 0, moyen: 1, important: 2 };

module.exports = {
    CATEGORIES,
    CATEGORIES_IDS,
    RANG_NIVEAU,
    INTERVALLE_RSS_MS: 15 * 60 * 1000,   // fréquence de mise à jour des flux
    MAX_ALERTES_PAR_CYCLE: 3,            // alertes sonores max par mise à jour
    RETENTION_JOURS: 30,                 // durée de conservation des articles
    HEURE_DAILY: 8,                      // Daily News : à partir de 8h
    HEURE_TOP10: 18                      // Top 10 : le dimanche à partir de 18h
};
