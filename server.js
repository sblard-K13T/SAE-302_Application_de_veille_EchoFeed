require('dotenv').config();
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const CryptoJS = require('crypto-js');
const { initVeille } = require('./veille');
const { CATEGORIES } = require('./veille/config');
const { enrichir } = require('./veille/scoring');

const app = express();
const PORT = 8443;
const HTTP_PORT = 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'echofeed_secret_key_2024';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'echofeed_encryption_key_2024';

//############ Middleware
app.use(cors());
app.use(express.json());

//############ Headers de sécurité (appliqués à toutes les réponses)
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' ws: wss:; font-src 'self'");
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

//############ Base de données JSON
const DB_FILE = path.join(__dirname, 'data', 'db.json');

function loadDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
        const defaultDB = {
            users: [],
            articles: [],
            invitations: [],
            messages: [],
            preferences: []
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 4));
        return defaultDB;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 4));
}

//############ Chiffrement des messages
function encryptMessage(text) {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

function decryptMessage(ciphertext) {
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch {
        return ciphertext;
    }
}

//############ Compte root par défaut
function ensureRootUser() {
    const db = loadDB();
    const rootExists = db.users.find(u => u.username === 'root');
    if (!rootExists) {
        const rootPassword = process.env.ROOT_PASSWORD || 'root';
        if (!process.env.ROOT_PASSWORD) {
            console.warn("ATTENTION : compte root créé avec le mot de passe par défaut 'root'. Définissez ROOT_PASSWORD dans le .env.");
        }
        const hashedPassword = bcrypt.hashSync(rootPassword, 10);
        const rootUser = {
            id: uuidv4(),
            username: 'root',
            email: 'root@echofeed.local',
            password: hashedPassword,
            role: 'admin',
            createdAt: new Date().toISOString(),
            categories: ['technologie', 'sport', 'politique', 'sante', 'finance', 'nature'],
            alertFrequency: 'daily',
            invitationsRemaining: 999
        };
        db.users.push(rootUser);
        saveDB(db);
        console.log('Compte root créé avec succès');
    }
}

//############ API Routes

// Auth
app.post('/api/register', async (req, res) => {
    const { username, email, password, invitationCode } = req.body;
    const db = loadDB();

    if (db.users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'Email déjà utilisé' });
    }
    if (db.users.find(u => u.username === username)) {
        return res.status(400).json({ error: 'Nom d\'utilisateur déjà pris' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
        id: uuidv4(),
        username,
        email,
        password: hashedPassword,
        role: 'user',
        createdAt: new Date().toISOString(),
        categories: ['technologie'],
        alertFrequency: 'daily',
        invitationsRemaining: 5
    };

    db.users.push(user);
    saveDB(db);

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const db = loadDB();

    const user = db.users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'Identifiants invalides' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Identifiants invalides' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
});

// Admin - Tous les utilisateurs (réservé à root)
app.get('/api/admin/users', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Non autorisé' });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Accès refusé - droits administrateur requis' });
        }

        const db = loadDB();
        const users = db.users.map(u => ({
            id: u.id,
            username: u.username,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt,
            categories: u.categories,
            alertFrequency: u.alertFrequency,
            invitationsRemaining: u.invitationsRemaining
        }));

        res.json({ users, total: users.length });
    } catch (err) {
        res.status(401).json({ error: 'Token invalide' });
    }
});

// Admin - Tous les messages (réservé à root)
app.get('/api/admin/messages', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Non autorisé' });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Accès refusé - droits administrateur requis' });
        }

        const db = loadDB();
        const messages = db.messages.map(m => ({
            ...m,
            content: decryptMessage(m.content)
        }));

        res.json({ messages, total: messages.length });
    } catch (err) {
        res.status(401).json({ error: 'Token invalide' });
    }
});

// Admin - Export complet de la base de données (réservé à root)
app.get('/api/admin/db-dump', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Non autorisé' });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Accès refusé - droits administrateur requis' });
        }

        const db = loadDB();
        res.json(db);
    } catch (err) {
        res.status(401).json({ error: 'Token invalide' });
    }
});

// Admin - Supprimer un utilisateur (réservé à root)
app.delete('/api/admin/users/:id', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Non autorisé' });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Accès refusé - droits administrateur requis' });
        }

        const db = loadDB();
        const userIndex = db.users.findIndex(u => u.id === req.params.id);

        if (userIndex === -1) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        if (db.users[userIndex].role === 'admin') {
            return res.status(400).json({ error: 'Impossible de supprimer un administrateur' });
        }

        db.users.splice(userIndex, 1);
        saveDB(db);

        res.json({ success: true, message: 'Utilisateur supprimé' });
    } catch (err) {
        res.status(401).json({ error: 'Token invalide' });
    }
});

// Invitations
app.post('/api/invitations', async (req, res) => {
    const { email } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Non autorisé' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = loadDB();

    const user = db.users.find(u => u.id === decoded.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    if (user.invitationsRemaining <= 0) return res.status(400).json({ error: 'Plus d\'invitations disponibles' });

    const code = uuidv4().substring(0, 8).toUpperCase();
    const invitation = {
        id: uuidv4(),
        code,
        email,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        used: false
    };

    db.invitations.push(invitation);
    user.invitationsRemaining--;
    saveDB(db);

    // Envoyer l'email (simplifié - en production utiliser un vrai SMTP)
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    if (process.env.SMTP_USER) {
        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: email,
            subject: 'Invitation EchoFeed',
            text: `Vous avez été invité à rejoindre EchoFeed ! Code d'invitation: ${code}`
        });
    }

    res.json({ invitation });
});

// Préférences
app.get('/api/preferences', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Non autorisé' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = loadDB();

    const user = db.users.find(u => u.id === decoded.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const { password, ...userSansMdp } = user;
    res.json({ user: userSansMdp });
});

app.put('/api/preferences', async (req, res) => {
    const { categories, alertFrequency } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Non autorisé' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = loadDB();

    const user = db.users.find(u => u.id === decoded.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    if (Array.isArray(categories)) user.categories = categories.filter(c => CATEGORIES[c]);
    user.alertFrequency = alertFrequency || user.alertFrequency;
    saveDB(db);

    const { password, ...userSansMdp } = user;
    res.json({ success: true, user: userSansMdp });
});

// Chat messages
app.get('/api/messages/:room', (req, res) => {
    const room = req.params.room;
    if (room !== 'general') {
        const user = utilisateurDepuisToken((req.headers.authorization || '').split(' ')[1]);
        if (!user || !salonsAutorises(user).includes(room)) {
            return res.status(403).json({ error: 'Salon non disponible avec vos préférences de veille' });
        }
    }
    const db = loadDB();
    const messages = db.messages.filter(m => m.room === room);
    const decryptedMessages = messages.map(m => ({
        ...m,
        content: decryptMessage(m.content)
    }));
    res.json(decryptedMessages.slice(-100));
});

//############ Démarrage
ensureRootUser();

// Serveur HTTPS
const KEY_FILE = path.join(__dirname, 'key.pem');
const CERT_FILE = path.join(__dirname, 'cert.pem');
if (!fs.existsSync(KEY_FILE) || !fs.existsSync(CERT_FILE)) {
    console.error('Certificats HTTPS manquants (key.pem / cert.pem). Lancez : npm run cert');
    process.exit(1);
}
if (!process.env.JWT_SECRET || !process.env.ENCRYPTION_KEY) {
    console.warn('ATTENTION : JWT_SECRET / ENCRYPTION_KEY absents du .env, des valeurs par défaut publiques sont utilisées.');
}

const httpsOptions = {
    key: fs.readFileSync(KEY_FILE),
    cert: fs.readFileSync(CERT_FILE)
};

const server = https.createServer(httpsOptions, app);

//############ Salons du chat : "général" + un salon par catégorie choisie dans les préférences de veille
function salonsAutorises(user) {
    return ['general', ...((user && user.categories) || []).filter(c => CATEGORIES[c])];
}

function utilisateurDepuisToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return loadDB().users.find(u => u.id === decoded.id) || null;
    } catch {
        return null;
    }
}

//############ Socket.io - Chat en temps réel
const io = socketIo(server, { cors: { origin: '*' } });

//############ Outil de veille (flux RSS, niveaux d'importance, Daily News, Top 10, alertes)
initVeille({ app, io, loadDB, saveDB, jwt, JWT_SECRET });

// Le client envoie son token JWT : le serveur sait qui parle (visiteur = lecture de #general seulement)
io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    socket.userId = token ? (utilisateurDepuisToken(token) || {}).id || null : null;
    next();
});

io.on('connection', (socket) => {
    const utilisateur = () => socket.userId ? loadDB().users.find(u => u.id === socket.userId) : null;
    console.log('Nouvelle connexion:', socket.id, utilisateur() ? utilisateur().username : '(visiteur)');

    socket.on('join-room', (room) => {
        if (typeof room !== 'string' || !salonsAutorises(utilisateur()).includes(room)) return;
        socket.join(room);
        socket.to(room).emit('user-joined', { userId: socket.id });
    });

    socket.on('send-message', (data) => {
        if (!data || typeof data.room !== 'string') return;
        const db = loadDB();
        const user = db.users.find(u => u.id === socket.userId);
        if (!user || !salonsAutorises(user).includes(data.room)) return;

        const content = String(data.content || '').trim().slice(0, 500);

        // Article partagé : relu dans la base, jamais pris tel quel depuis le navigateur
        let article = null;
        if (data.article && data.article.id) {
            const source = db.articles.find(a => a.id === String(data.article.id));
            if (source) {
                const a = enrichir(source);
                article = {
                    id: a.id,
                    titre: a.titre,
                    lien: /^https?:\/\//i.test(a.lien) ? a.lien : '',
                    niveau: a.niveau,
                    categorie: a.categories[0]
                };
            }
        }
        if (!content && !article) return;

        const message = {
            id: uuidv4(),
            room: data.room,
            userId: user.id,
            username: user.username,
            content: encryptMessage(content),
            ...(article && { article }),
            timestamp: new Date().toISOString()
        };

        db.messages.push(message);
        saveDB(db);

        io.to(data.room).emit('new-message', { ...message, content });
    });

    socket.on('disconnect', () => {
        console.log('Déconnexion:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Serveur EchoFeed HTTPS démarré sur le port ${PORT}`);
});

// Redirection HTTP vers HTTPS
const httpApp = express();
httpApp.get('*', (req, res) => {
    res.redirect(`https://${req.headers.host}${req.url}`);
});
http.createServer(httpApp).listen(HTTP_PORT, () => {
    console.log(`Redirection HTTP vers HTTPS sur le port ${HTTP_PORT}`);
});
