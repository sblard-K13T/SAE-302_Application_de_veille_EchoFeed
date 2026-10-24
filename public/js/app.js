//############ Variables globales
let socket;
let currentUser = null;
let currentRoom = 'general';
let token = localStorage.getItem('echofeed_token');

//############ Initialisation
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initAuth();
    initChat();
    initQuackBot();
    initCookieBanner();
    initInteractiveGuide();
    checkAuth();
});

//############ Navigation
function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            showPage(page);
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageId}`).classList.add('active');

    if (pageId === 'news') { clearNotif('news'); loadNews(); }
    if (pageId === 'top10') { clearNotif('top10'); loadTop10(); }
    if (pageId === 'chat') {
        clearNotif('chat');
        loadChat();
    }
    if (pageId === 'profile') loadProfile();
    if (pageId === 'admin') loadAdmin();
}

//############ Auth
function initAuth() {
    document.getElementById('login-btn').addEventListener('click', () => showModal('auth-modal'));
    document.getElementById('register-btn').addEventListener('click', () => showModal('auth-modal'));
    document.getElementById('close-modal').addEventListener('click', () => hideModal('auth-modal'));
    document.getElementById('logout-btn').addEventListener('click', logout);

    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}-form`).classList.add('active');
        });
    });

    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (res.ok) {
            token = data.token;
            currentUser = data.user;
            localStorage.setItem('echofeed_token', token);
            updateUIForAuth();
            hideModal('auth-modal');
        } else {
            alert(data.error || 'Erreur de connexion');
        }
    } catch (err) {
        alert('Erreur de connexion');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const invitationCode = document.getElementById('register-invitation').value;

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, invitationCode })
        });

        const data = await res.json();
        if (res.ok) {
            token = data.token;
            currentUser = data.user;
            localStorage.setItem('echofeed_token', token);
            updateUIForAuth();
            hideModal('auth-modal');
        } else {
            alert(data.error || 'Erreur d\'inscription');
        }
    } catch (err) {
        alert('Erreur d\'inscription');
    }
}

function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('echofeed_token');
    updateUIForAuth();
}

function checkAuth() {
    if (token) {
        try {
            const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(atob(b64));
            if (payload.exp && payload.exp * 1000 < Date.now()) throw new Error('expired');
            currentUser = { id: payload.id, username: payload.username, role: payload.role };
            updateUIForAuth();
        } catch {
            logout();
        }
    }
}

function updateUIForAuth() {
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');

    if (currentUser) {
        authButtons.style.display = 'none';
        userInfo.style.display = 'flex';
        document.getElementById('username-display').textContent = currentUser.username;
    } else {
        authButtons.style.display = 'flex';
        userInfo.style.display = 'none';
    }

    if (currentUser) {
        if (!userPrefs) loadUserPrefs();
    } else {
        userPrefs = null;
        resetAllNotifs();
        renderRooms();
    }
    syncSocketAuth();

    const adminBtn = document.getElementById('admin-nav-btn');
    const isAdmin = currentUser && currentUser.role === 'admin';
    adminBtn.style.display = isAdmin ? '' : 'none';

    // Si on n'est plus admin alors que la page Admin est ouverte, retour à l'accueil
    if (!isAdmin && document.getElementById('page-admin').classList.contains('active')) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === 'home'));
        showPage('home');
    }
}

//############ News
async function loadNews() {
    const category = document.getElementById('category-filter').value;
    const url = category ? `/api/articles?category=${encodeURIComponent(category)}` : '/api/articles';

    try {
        const res = await fetch(url, { headers: authHeaders() });
        displayArticles(await res.json());
    } catch (err) {
        console.error('Erreur chargement articles:', err);
    }
}

function displayArticles(articles) {
    const container = document.getElementById('articles-list');
    if (!articles.length) {
        container.innerHTML = '<p class="empty-state">Aucun article pour le moment pour ces catégories. La veille est actualisée toutes les 15 minutes.</p>';
        return;
    }
    articles.forEach(a => { articleCache[a.id] = a; });
    container.innerHTML = articles.map(article => `
        <div class="article-card">
            <div class="article-header">
                <h3><a href="${safeUrl(article.lien)}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.titre)}</a></h3>
                ${niveauBadge(article.niveau)}
            </div>
            <p class="article-description">${escapeHtml((article.description || '').substring(0, 200))}...</p>
            <div class="article-footer">
                <span class="article-author"><span class="article-cat">${escapeHtml(categoryLabel(article.categories))}</span> ${escapeHtml(article.auteur)}</span>
                <span class="article-date">${formatDate(article.date_publication)}</span>
            </div>
            <div class="article-actions">${shareButton(article)}</div>
        </div>
    `).join('');
}

//############ Top 10
async function loadTop10() {
    try {
        const res = await fetch('/api/articles/top10', { headers: authHeaders() });
        displayTop10(await res.json());
    } catch (err) {
        console.error('Erreur chargement top 10:', err);
    }
}

function displayTop10(articles) {
    const container = document.getElementById('top10-list');
    if (!articles.length) {
        container.innerHTML = '<p class="empty-state">Pas encore de Top 10 : il est publié chaque dimanche soir.</p>';
        return;
    }
    articles.forEach(a => { articleCache[a.id] = a; });
    const medals = ['🥇', '🥈', '🥉'];

    container.innerHTML = articles.map((article, index) => `
        <div class="top10-item ${index < 3 ? 'top3' : ''}">
            <div class="top10-rank">${medals[index] || `#${index + 1}`}</div>
            <div class="top10-content">
                <h3><a href="${safeUrl(article.lien)}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.titre)}</a></h3>
                <p>${escapeHtml((article.description || '').substring(0, 150))}...</p>
                <div class="top10-meta">
                    ${niveauBadge(article.niveau)}
                    <span>${escapeHtml(categoryLabel(article.categories))}</span>
                    <span>${formatDate(article.date_publication)}</span>
                    ${shareButton(article)}
                </div>
            </div>
        </div>
    `).join('');
}

//############ Chat
function initChat() {
    socket = io({ auth: { token } });

    // Rejoindre tous les salons pour être notifié de n'importe quel message
    // (à refaire à chaque (re)connexion, le serveur oublie les salons)
    socket.on('connect', joinAllRooms);

    socket.on('veille-alert', handleVeilleAlert);

    socket.on('veille-update', ({ counts }) => {
        if (!currentUser) return;
        if (document.getElementById('page-news').classList.contains('active')) loadNews();
        else addNotif('news', sumCounts(counts));
    });

    socket.on('daily-news', ({ counts }) => {
        if (currentUser) setNotif('daily', sumCounts(counts));
    });

    socket.on('top10-ready', () => {
        if (!currentUser) return;
        if (document.getElementById('page-top10').classList.contains('active')) loadTop10();
        else addNotif('top10');
    });

    document.getElementById('room-list').addEventListener('click', (e) => {
        const btn = e.target.closest('.room-btn');
        if (btn) selectRoom(btn.dataset.room);
    });

    // Titre du salon (coloré) au-dessus des messages
    const title = document.createElement('div');
    title.id = 'chat-room-title';
    title.className = 'chat-room-title';
    document.querySelector('.chat-main').prepend(title);

    // Bandeau "article joint" au-dessus de la zone de saisie
    const inputRow = document.querySelector('.chat-input');
    const strip = document.createElement('div');
    strip.id = 'chat-attachment';
    strip.className = 'chat-attachment';
    inputRow.parentNode.insertBefore(strip, inputRow);

    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    socket.on('new-message', (message) => {
        if (!availableRooms().includes(message.room)) return;
        // Son de notification pour les messages des autres, dans tous les salons
        if (!currentUser || message.userId !== currentUser.id) {
            playNotif('notif-lucas-message');
            const chatOuvert = document.getElementById('page-chat').classList.contains('active');
            if (!chatOuvert || message.room !== currentRoom) {
                roomUnread[message.room] = (roomUnread[message.room] || 0) + 1;
                renderRooms();
            }
            if (!document.getElementById('page-chat').classList.contains('active')) {
                addNotif('chat');
            }
        }
        if (message.room === currentRoom) {
            appendMessage(message);
        }
    });
}

//############ Salons : "Général" + un salon par catégorie choisie dans le profil
const ROOM_META = {
    general:     { label: 'Général',     icon: '💬', color: '#94a3b8' },
    technologie: { label: 'Technologie', icon: '💻', color: '#3b82f6' },
    sport:       { label: 'Sport',       icon: '⚽', color: '#22c55e' },
    politique:   { label: 'Politique',   icon: '🏛️', color: '#a855f7' },
    sante:       { label: 'Santé',       icon: '🩺', color: '#ec4899' },
    finance:     { label: 'Finance',     icon: '💰', color: '#eab308' },
    nature:      { label: 'Nature',      icon: '🌿', color: '#14b8a6' }
};
const roomUnread = {};   // messages non lus par salon

function roomColor(room) {
    return (ROOM_META[room] || ROOM_META.general).color;
}

function availableRooms() {
    const cats = (currentUser && userPrefs && userPrefs.categories) || [];
    return ['general', ...cats.filter(c => c !== 'general' && ROOM_META[c])];
}

function renderRooms() {
    const rooms = availableRooms();
    const changed = !rooms.includes(currentRoom);
    if (changed) currentRoom = 'general';

    document.getElementById('room-list').innerHTML = rooms.map(r => `
        <button class="room-btn${r === currentRoom ? ' active' : ''}" data-room="${r}" style="--room: ${ROOM_META[r].color}">
            <span class="room-icon">${ROOM_META[r].icon}</span>
            <span class="room-label">${ROOM_META[r].label}</span>
            ${roomUnread[r] ? `<span class="room-unread">${roomUnread[r] > 99 ? '99+' : roomUnread[r]}</span>` : ''}
        </button>
    `).join('');

    document.getElementById('room-list-dynamic').innerHTML = rooms.length === 1
        ? '<p class="room-hint">Choisissez vos catégories dans « Profil » pour débloquer d\'autres salons.</p>'
        : '';

    const title = document.getElementById('chat-room-title');
    if (title) {
        title.style.setProperty('--room', roomColor(currentRoom));
        title.innerHTML = `<span>${ROOM_META[currentRoom].icon}</span> ${ROOM_META[currentRoom].label}`;
    }

    joinAllRooms();
    if (changed && document.getElementById('page-chat').classList.contains('active')) loadMessages();
}

function joinAllRooms() {
    if (socket && socket.connected) availableRooms().forEach(r => socket.emit('join-room', r));
}

function selectRoom(room) {
    if (!availableRooms().includes(room)) room = 'general';
    currentRoom = room;
    delete roomUnread[room];
    renderRooms();
    loadMessages();
    if (socket && socket.connected) socket.emit('join-room', room);
}

async function loadChat() {
    delete roomUnread[currentRoom];
    renderRooms();
    if (!userPrefs && token) await loadUserPrefs();   // loadUserPrefs() rafraîchit aussi les salons
    await loadMessages();
}

async function loadMessages() {
    const room = currentRoom;
    try {
        const res = await fetch(`/api/messages/${room}`, { headers: authHeaders() });
        const messages = res.ok ? await res.json() : [];
        if (room !== currentRoom) return;   // l'utilisateur a changé de salon entre-temps
        const container = document.getElementById('chat-messages');
        container.innerHTML = messages.map(m => `
            <div class="${messageClass(m)}" style="--room: ${roomColor(m.room)}">${messageInnerHtml(m)}</div>
        `).join('');
        container.scrollTop = container.scrollHeight;
    } catch (err) {
        console.error('Erreur chargement messages:', err);
    }
}

function sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    if ((!content && !pendingArticle) || !currentUser) return;

    socket.emit('send-message', {
        room: currentRoom,
        content,
        article: pendingArticle ? { id: pendingArticle.id } : undefined
    });

    input.value = '';
    pendingArticle = null;
    renderPendingArticle();
}

function appendMessage(message) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = messageClass(message);
    div.style.setProperty('--room', roomColor(message.room));
    div.innerHTML = messageInnerHtml(message);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

//############ Profile
let profileListenersReady = false;

async function loadProfile() {
    if (!currentUser) return;
    document.getElementById('profile-username').value = currentUser.username;

    if (!profileListenersReady) {
        document.getElementById('save-preferences').addEventListener('click', savePreferences);
        document.getElementById('send-invitation').addEventListener('click', sendInvitation);
        profileListenersReady = true;
    }
    await loadUserPrefs();
}

async function loadUserPrefs() {
    if (!token) return;
    try {
        const res = await fetch('/api/preferences', { headers: authHeaders() });
        if (!res.ok) return;
        const { user } = await res.json();
        userPrefs = {
            categories: user.categories || [],
            alertFrequency: user.alertFrequency || 'daily',
            email: user.email || '',
            invitationsRemaining: user.invitationsRemaining
        };
        applyPrefsToForm();
        renderRooms();
    } catch (err) {
        console.error('Erreur chargement préférences:', err);
    }
}

function applyPrefsToForm() {
    if (!userPrefs) return;
    document.getElementById('profile-email').value = userPrefs.email;
    document.getElementById('alert-frequency').value = userPrefs.alertFrequency;
    document.querySelectorAll('#categories-group input').forEach(cb => {
        cb.checked = userPrefs.categories.includes(cb.value);
    });
    const count = document.getElementById('invitations-count');
    if (count && userPrefs.invitationsRemaining !== undefined) count.textContent = userPrefs.invitationsRemaining;
}

async function savePreferences() {
    const categories = Array.from(document.querySelectorAll('#categories-group input:checked')).map(cb => cb.value);
    const alertFrequency = document.getElementById('alert-frequency').value;

    try {
        const res = await fetch('/api/preferences', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ categories, alertFrequency })
        });

        if (res.ok) {
            userPrefs = { ...(userPrefs || {}), categories, alertFrequency };
            renderRooms();
            alert('Préférences sauvegardées ! Vos actualités, alertes et Top 10 sont mis à jour.');
        }
    } catch (err) {
        alert('Erreur lors de la sauvegarde');
    }
}

async function sendInvitation() {
    const email = document.getElementById('invite-email').value;
    if (!email) return;

    try {
        const res = await fetch('/api/invitations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ email })
        });

        const data = await res.json();
        if (res.ok) {
            alert(`Invitation envoyée ! Code: ${data.invitation.code}`);
            document.getElementById('invite-email').value = '';
        } else {
            alert(data.error || 'Erreur');
        }
    } catch (err) {
        alert('Erreur lors de l\'envoi');
    }
}

//############ QuackBot
function initQuackBot() {
    document.getElementById('quackbot-toggle').addEventListener('click', () => {
        document.getElementById('quackbot-panel').classList.toggle('open');
        handleQuackBotClick();
    });

    document.getElementById('close-quackbot').addEventListener('click', () => {
        document.getElementById('quackbot-panel').classList.remove('open');
    });

    document.getElementById('daily-news-btn').addEventListener('click', () => {
        quackBotAction('daily');
    });

    document.getElementById('alerts-btn').addEventListener('click', () => {
        quackBotAction('alerts');
    });

    document.getElementById('top10-btn').addEventListener('click', () => {
        quackBotAction('top10');
    });
}

async function quackBotAction(action) {
    const urls = { daily: '/api/articles/daily', alerts: '/api/articles/alertes', top10: '/api/articles/top10' };
    const titres = { daily: '📰 Daily News', alerts: '🚨 Alertes', top10: '🏆 Top 10 de la semaine' };

    clearNotif(action);
    addQuackBotMessage('🦆 Quack! Je travaille dessus...');

    try {
        const res = await fetch(urls[action], { headers: authHeaders() });
        const articles = await res.json();
        const lignes = articles.slice(0, action === 'top10' ? 10 : 5).map((a, i) =>
            `${i + 1}. ${(NIVEAUX[a.niveau] || NIVEAUX.basse).emoji} ${a.titre}`
        ).join('\n');

        addQuackBotMessage(`🦆 ${titres[action]} :\n${lignes || 'Aucun article pour vos catégories.'}`);
    } catch (err) {
        addQuackBotMessage('🦆 Erreur de chargement!');
    }
}

function addQuackBotMessage(text, silent = false) {
    const container = document.getElementById('quackbot-messages');
    const div = document.createElement('div');
    div.className = 'quackbot-message';
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    if (!silent) playRandomQuack();
}

//############ Cookie Banner
function initCookieBanner() {
    if (!localStorage.getItem('echofeed_cookies')) {
        document.getElementById('cookie-banner').style.display = 'flex';
    }

    document.getElementById('accept-cookies').addEventListener('click', () => {
        localStorage.setItem('echofeed_cookies', 'accepted');
        document.getElementById('cookie-banner').style.display = 'none';
    });
}

//############ Interactive Guide
function initInteractiveGuide() {
    const overlay = document.getElementById('guide-overlay');
    const spotlight = document.getElementById('guide-spotlight');
    const mascot = document.getElementById('guide-mascot');
    const bubble = document.getElementById('guide-bubble');
    const bubbleText = document.getElementById('bubble-text');
    const bubbleStep = document.getElementById('bubble-step');
    const nextBtn = document.getElementById('guide-next');
    const skipBtn = document.getElementById('guide-skip');

    const steps = [
        { page: 'home', target: '#nav-menu', text: 'Voici le menu de navigation. Cliquez sur les boutons pour accéder aux différentes sections du site.' },
        { page: 'news', target: '#page-news .page-header', text: 'Dans la section Actualités, vous pouvez consulter les dernières nouvelles et filtrer par catégorie.' },
        { page: 'top10', target: '#page-top10 .page-header', text: 'Le Top 10 affiche les articles les plus pertinents de la semaine, classés par score.' },
        { page: 'chat', target: '#page-chat .chat-container', text: 'Le chat vous permet de discuter en temps réel avec d\'autres utilisateurs dans des salons thématiques.' },
        { page: 'profile', target: '#page-profile .profile-container', text: 'Dans votre profil, vous pouvez personnaliser vos préférences de veille et inviter vos amis.' },
        { page: 'home', target: '#quackbot', text: 'Enfin, QuackBot est votre assistant virtuel. Cliquez sur les boutons pour obtenir des synthèses d\'informations !' }
    ];

    let currentStep = 0;

    function goToPage(page) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
        showPage(page);
    }

    function positionElement(targetSelector) {
        const target = document.querySelector(targetSelector);
        if (!target) return;

        target.scrollIntoView({ block: 'center' });
        const rect = target.getBoundingClientRect();
        const padding = 8;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        spotlight.style.left = (rect.left - padding) + 'px';
        spotlight.style.top = (rect.top - padding) + 'px';
        spotlight.style.width = (rect.width + padding * 2) + 'px';
        spotlight.style.height = (rect.height + padding * 2) + 'px';

        // La bulle reste toujours entièrement dans la fenêtre
        const margin = 12;
        const mascotSize = 62;
        const bw = Math.min(320, vw - margin * 2);
        bubble.style.width = bw + 'px';
        const bh = bubble.offsetHeight;

        const spaceBelow = vh - rect.bottom - padding;
        const spaceAbove = rect.top - padding;
        const needed = bh + mascotSize + margin;

        let y;
        if (spaceBelow >= needed) {
            y = rect.bottom + padding + mascotSize;          // sous l'élément
        } else if (spaceAbove >= needed) {
            y = rect.top - padding - bh - margin;            // au-dessus de l'élément
        } else {
            y = vh - bh - margin;                            // élément très grand : bas de l'écran
        }
        y = Math.max(mascotSize + margin, Math.min(y, vh - bh - margin));

        const x = Math.max(margin, Math.min(rect.left + rect.width / 2 - bw / 2, vw - bw - margin));

        bubble.style.left = x + 'px';
        bubble.style.top = y + 'px';
        mascot.style.left = (x + 10) + 'px';
        mascot.style.top = (y - mascotSize) + 'px';
    }

    function showStep(index) {
        if (index >= steps.length) {
            endGuide();
            return;
        }

        currentStep = index;
        const step = steps[index];
        bubbleText.textContent = step.text;
        bubbleStep.textContent = `${index + 1}/${steps.length}`;
        nextBtn.textContent = index === steps.length - 1 ? 'Terminer' : 'Suivant';
        playRandomQuack();

        goToPage(step.page);
        positionElement(step.target);
    }

    function startGuide() {
        overlay.classList.add('active');
        showStep(0);
    }

    function endGuide() {
        overlay.classList.remove('active');
        goToPage('home');
        localStorage.setItem('echofeed_guide_completed', 'true');
    }

    window.addEventListener('resize', () => {
        if (overlay.classList.contains('active')) positionElement(steps[currentStep].target);
    });

    nextBtn.addEventListener('click', () => showStep(currentStep + 1));
    skipBtn.addEventListener('click', endGuide);

    document.getElementById('hero-start').addEventListener('click', startGuide);
    document.getElementById('hero-guide').addEventListener('click', () => {
        showModal('guide-modal');
    });

    document.getElementById('close-guide').addEventListener('click', () => {
        hideModal('guide-modal');
    });

    if (!localStorage.getItem('echofeed_guide_completed')) {
        setTimeout(startGuide, 1000);
    }
}

//############ Utilities
function showModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function hideModal(id) {
    document.getElementById(id).style.display = 'none';
}

function formatDate(dateStr) {
    if (!dateStr || dateStr === 'Date non disponible') return 'Date non disponible';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateStr;
    }
}


//############ Admin
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function adminFetch(url, options = {}) {
    const res = await fetch(url, {
        ...options,
        headers: { ...(options.headers || {}), 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur');
    return data;
}

async function loadAdmin() {
    if (!currentUser || currentUser.role !== 'admin') return;

    try {
        const { users, total } = await adminFetch('/api/admin/users');
        document.getElementById('admin-stats').textContent = `${total} utilisateur(s) inscrit(s)`;
        document.getElementById('admin-users-list').innerHTML = users.map(u => `
            <tr>
                <td>${escapeHtml(u.username)}</td>
                <td>${escapeHtml(u.email)}</td>
                <td><span class="role-badge ${u.role === 'admin' ? 'admin' : 'user'}">${escapeHtml(u.role || 'user')}</span></td>
                <td>${formatDate(u.createdAt)}</td>
                <td>${u.role === 'admin' ? '' : `<button class="btn btn-small btn-danger" data-delete-user="${escapeHtml(u.id)}">Supprimer</button>`}</td>
            </tr>
        `).join('');
    } catch (err) {
        document.getElementById('admin-stats').textContent = err.message;
    }

    try {
        const { messages, total } = await adminFetch('/api/admin/messages');
        document.getElementById('admin-messages-stats').textContent = `${total} message(s)`;
        document.getElementById('admin-messages-list').innerHTML = messages.slice(-100).reverse().map(m => `
            <tr>
                <td>${escapeHtml(m.username)}</td>
                <td>${escapeHtml(m.room)}</td>
                <td>${escapeHtml(m.content)}</td>
                <td>${new Date(m.timestamp).toLocaleString('fr-FR')}</td>
            </tr>
        `).join('');
    } catch (err) {
        document.getElementById('admin-messages-stats').textContent = err.message;
    }
}

document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-delete-user]');
    if (!btn || !confirm('Supprimer cet utilisateur ?')) return;
    try {
        await adminFetch(`/api/admin/users/${btn.dataset.deleteUser}`, { method: 'DELETE' });
        loadAdmin();
    } catch (err) {
        alert(err.message);
    }
});


//############ Sons QuackBot (fichiers dans public/sound/)
const QUACK_SOUNDS = ['quak-samuel-grave', 'quak-samuel-aigue', 'quak-lucas-grave', 'quak-lucas-aigue'];
const soundCache = {};
let currentSound = null;
let quackClicks = 0;
let angryTimer = null;

function playSound(name) {
    if (currentSound) {
        currentSound.pause();
        currentSound.currentTime = 0;
    }
    if (!soundCache[name]) soundCache[name] = new Audio(`/sound/${name}.m4a`);
    currentSound = soundCache[name];
    currentSound.currentTime = 0;
    currentSound.play().catch(() => {}); // ignoré si le navigateur bloque la lecture auto
}

function playRandomQuack() {
    playSound(QUACK_SOUNDS[Math.floor(Math.random() * QUACK_SOUNDS.length)]);
}

// Clics sur le logo QuackBot : quack aléatoire, puis mécontent au 10e clic,
// puis "finit mécontent" après 15 s sans nouveau clic
function handleQuackBotClick() {
    clearTimeout(angryTimer);
    quackClicks++;

    if (quackClicks >= 10) {
        quackClicks = 0;
        playSound('quak-mecontant');
        angryTimer = setTimeout(() => playSound('quak-finit-mecontant'), 15000);
    } else {
        playRandomQuack();
    }
}


//############ Notifications sonores (canal séparé des quacks)
const notifCache = {};

function playNotif(name) {
    if (!notifCache[name]) notifCache[name] = new Audio(`/sound/${name}.m4a`);
    const audio = notifCache[name];
    audio.currentTime = 0;
    audio.play().catch(() => {});
}

// Alerte de veille reçue en temps réel : son selon le niveau d'importance
function handleVeilleAlert(alerte) {
    if (!currentUser || !concerne(alerte.categorie)) return;
    const sons = { basse: 'alerte-basse', moyen: 'alerte-moyen', important: 'alerte-important' };
    playNotif(sons[alerte.niveau] || sons.basse);
    addNotif('alerts');
    addQuackBotMessage(`🚨 Alerte ${(NIVEAUX[alerte.niveau] || NIVEAUX.basse).label.toLowerCase()} : ${alerte.titre}`, true);
}

//############ Messages du chat : rendu et badge "non lus"
function messageClass(m) {
    return m.username === 'root' ? 'chat-message is-root' : 'chat-message';
}

function messageInnerHtml(m) {
    const a = m.article;
    const carte = a ? `
        <a class="chat-article" href="${safeUrl(a.lien)}" target="_blank" rel="noopener noreferrer">
            <span class="chat-article-meta">📰 ${niveauBadge(a.niveau)} <span class="article-cat">${escapeHtml(CATEGORY_LABELS[a.categorie] || a.categorie)}</span></span>
            <strong>${escapeHtml(a.titre)}</strong>
        </a>` : '';
    return `
        <div class="message-header">
            <strong>${escapeHtml(m.username)}</strong>
            <span>${new Date(m.timestamp).toLocaleTimeString()}</span>
        </div>
        ${carte}
        ${m.content ? `<p>${escapeHtml(m.content)}</p>` : ''}
    `;
}

//############ Veille : niveaux, catégories, préférences
const NIVEAUX = {
    basse:     { label: 'Basse',      emoji: '🟢' },
    moyen:     { label: 'Moyenne',    emoji: '🟠' },
    important: { label: 'Importante', emoji: '🔴' }
};
const CATEGORY_LABELS = {
    technologie: 'Technologie', sport: 'Sport', politique: 'Politique',
    sante: 'Santé', finance: 'Finance', nature: 'Nature'
};
let userPrefs = null;

function categoryLabel(categories) {
    const c = (categories && categories[0]) || 'technologie';
    return CATEGORY_LABELS[c] || c;
}

function niveauBadge(niveau) {
    const n = NIVEAUX[niveau] ? niveau : 'basse';
    return `<span class="article-score niveau niveau-${n}">${NIVEAUX[n].label}</span>`;
}

function safeUrl(url) {
    return /^https?:\/\//i.test(url || '') ? escapeHtml(url) : '#';
}

function authHeaders() {
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Une catégorie concerne l'utilisateur si elle est dans ses préférences (ou s'il n'en a pas choisi)
function concerne(cat) {
    const c = userPrefs && userPrefs.categories;
    return !c || !c.length || c.includes(cat);
}

function sumCounts(counts) {
    return Object.entries(counts || {}).filter(([cat]) => concerne(cat)).reduce((t, [, n]) => t + n, 0);
}

//############ Pastilles de notification (une couleur par section)
const NOTIFS = {
    chat:   { count: 0, color: '#dc2626', targets: ['.nav-btn[data-page="chat"]'] },
    news:   { count: 0, color: '#2563eb', targets: ['.nav-btn[data-page="news"]'] },
    top10:  { count: 0, color: '#b45309', targets: ['.nav-btn[data-page="top10"]', '#top10-btn'] },
    daily:  { count: 0, color: '#0d9488', targets: ['#daily-news-btn'] },
    alerts: { count: 0, color: '#7c3aed', targets: ['#alerts-btn'] }
};
const BOT_NOTIFS = ['daily', 'alerts', 'top10'];

function drawBadge(el, count, color) {
    if (!el) return;
    let badge = el.querySelector('.nav-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'nav-badge';
        el.appendChild(badge);
    }
    badge.style.setProperty('--badge', color);
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
}

function renderNotif(key) {
    const n = NOTIFS[key];
    n.targets.forEach(sel => drawBadge(document.querySelector(sel), n.count, n.color));
    // Pastille globale sur le logo QuackBot (somme de ses 3 sections)
    drawBadge(document.getElementById('quackbot-toggle'), BOT_NOTIFS.reduce((t, k) => t + NOTIFS[k].count, 0), '#16a34a');
}

function addNotif(key, amount = 1) {
    if (amount <= 0) return;
    NOTIFS[key].count += amount;
    renderNotif(key);
}
function setNotif(key, n) { NOTIFS[key].count = n; renderNotif(key); }
function clearNotif(key) { setNotif(key, 0); }
function resetAllNotifs() { Object.keys(NOTIFS).forEach(clearNotif); }

document.addEventListener('DOMContentLoaded', () => {
    Object.keys(NOTIFS).forEach(renderNotif);
    document.getElementById('refresh-news').addEventListener('click', loadNews);
    document.getElementById('category-filter').addEventListener('change', loadNews);
    document.getElementById('refresh-top10').addEventListener('click', loadTop10);
});


//############ Chat : identification du socket et partage d'articles
// Le serveur identifie l'utilisateur grâce au token : on reconnecte le socket quand il change
function syncSocketAuth() {
    if (!socket) return;
    const courant = (socket.auth && socket.auth.token) || null;
    if (courant === (token || null)) return;
    socket.auth = { token };
    socket.disconnect().connect();
}

const articleCache = {};
let pendingArticle = null;

function shareButton(article) {
    return `<button class="btn btn-small btn-secondary article-share" data-share="${escapeHtml(article.id)}">💬 En discuter</button>`;
}

function openPage(page) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
    showPage(page);
}

function renderPendingArticle() {
    const strip = document.getElementById('chat-attachment');
    if (!strip) return;
    if (!pendingArticle) {
        strip.style.display = 'none';
        strip.innerHTML = '';
        return;
    }
    strip.style.display = 'flex';
    strip.innerHTML = `
        <span>📎 Article joint :</span>
        ${niveauBadge(pendingArticle.niveau)}
        <strong>${escapeHtml(pendingArticle.titre)}</strong>
        <button class="chat-attachment-remove" id="chat-attachment-remove" title="Retirer l'article">&times;</button>
    `;
}

document.addEventListener('click', (e) => {
    if (e.target.closest('#chat-attachment-remove')) {
        pendingArticle = null;
        renderPendingArticle();
        return;
    }

    const btn = e.target.closest('[data-share]');
    if (!btn) return;
    const article = articleCache[btn.dataset.share];
    if (!article) return;

    if (!currentUser) {
        alert('Connectez-vous pour discuter d\'un article dans le chat.');
        showModal('auth-modal');
        return;
    }

    // On ouvre le chat dans le salon de la catégorie de l'article (sinon Général), article joint prêt à envoyer
    pendingArticle = article;
    openPage('chat');
    const cat = article.categories && article.categories[0];
    selectRoom(availableRooms().includes(cat) ? cat : 'general');
    renderPendingArticle();
    document.getElementById('message-input').focus();
});
