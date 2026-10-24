// Point d'entrée de l'outil de veille : monte les routes API et lance le service
const { creerRoutes } = require('./routes');
const { demarrerService } = require('./service');

function initVeille({ app, io, loadDB, saveDB, jwt, JWT_SECRET }) {
    app.use('/api/articles', creerRoutes({ loadDB, jwt, JWT_SECRET }));
    return demarrerService({ io, loadDB, saveDB });
}

module.exports = { initVeille };
