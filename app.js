let currentUser = null;
let currentChat = null;
let chats = [];
let activeChatUser = null;

const authPage = document.getElementById('auth-page');
const chatsPage = document.getElementById('chats-page');
const chatPage = document.getElementById('chat-page');
const usernameInput = document.getElementById('username');
const charCount = document.querySelector('.char-count');
const startChatBtn = document.getElementById('start-chat-btn');
const currentUserSpan = document.getElementById('current-user');
const logoutBtn = document.getElementById('logout-btn');
const chatsList = document.getElementById('chats-list');
const emptyState = document.getElementById('empty-state');
const activeChatDiv = document.getElementById('active-chat');
const activeChatUsername = document.getElementById('active-chat-username');
const activeChatMessage = document.getElementById('active-chat-message');
const goToActiveChatBtn = document.getElementById('go-to-active-chat');
const newChatBtn = document.getElementById('new-chat-btn');
const backToChatsBtn = document.getElementById('back-to-chats');
const chatUsername = document.getElementById('chat-username');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendMessageBtn = document.getElementById('send-message-btn');
const usersBtn = document.getElementById('users-btn');
const usersPage = document.getElementById('users-page');
const backFromUsersBtn = document.getElementById('back-from-users');
const usersSearch = document.getElementById('users-search');
const usersList = document.getElementById('users-list');
const emptyUsersState = document.getElementById('empty-users-state');
const loadingUsers = document.getElementById('loading-users');

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    const savedUser = localStorage.getItem('anonymousUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showPage(chatsPage);
        loadChats();
        updateUserInfo();
    } else {
        showPage(authPage);
    }
}

function setupEventListeners() {
    usernameInput.addEventListener('input', (e) => {
        const count = e.target.value.length;
        charCount.textContent = `${count}/20`;
    });

    startChatBtn.addEventListener('click', startChat);

    logoutBtn.addEventListener('click', logout);

    newChatBtn.addEventListener('click', showNewChatModal);

    goToActiveChatBtn.addEventListener('click', () => {
        if (activeChatUser) {
            openChat(activeChatUser);
        }
    });

    backToChatsBtn.addEventListener('click', () => {
        showPage(chatsPage);
        currentChat = null;
    });

    sendMessageBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    usersBtn.addEventListener('click', showUsersPage);

    backFromUsersBtn.addEventListener('click', () => {
        showPage(chatsPage);
    });

    usersSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim().toLowerCase();
        filterUsers(searchTerm);
    });
}

function startChat() {
    const username = usernameInput.value.trim();
    
    if (!username) {
        showNotification('Введите имя пользователя', 'error');
        return;
    }

    if (username.length < 2) {
        showNotification('Имя должно содержать минимум 2 символа', 'error');
        return;
    }

    currentUser = {
        id: generateUserId(),
        username: username,
        createdAt: new Date().toISOString()
    };

    localStorage.setItem('anonymousUser', JSON.stringify(currentUser));

    createUserInFirebase(currentUser);

    showPage(chatsPage);
    updateUserInfo();
    loadChats();
}

async function createUserInFirebase(user) {
    try {
        await db.ref(`users/${user.id}`).set({
            username: user.username,
            createdAt: user.createdAt,
            isOnline: true,
            lastSeen: new Date().toISOString()
        });
    } catch (error) {
        console.error('Ошибка создания пользователя:', error);
    }
}

function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function logout() {
    if (currentUser) {
        db.ref(`users/${currentUser.id}`).update({
            isOnline: false,
            lastSeen: new Date().toISOString()
        });
    }
    
    localStorage.removeItem('anonymousUser');
    currentUser = null;
    currentChat = null;
    chats = [];
    activeChatUser = null;
    
    showPage(authPage);
    usernameInput.value = '';
    charCount.textContent = '0/20';
}

async function loadChats() {
    try {
        const chatsSnapshot = await db.ref('chats').orderByChild('lastMessageTime').once('value');
        const chatsData = chatsSnapshot.val() || {};
        
        chats = [];
        activeChatUser = null;

        for (const chatId in chatsData) {
            const chatData = chatsData[chatId];
            if (chatData.participants && chatData.participants.includes(currentUser.id)) {
                const otherUserId = chatData.participants.find(id => id !== currentUser.id);
                
                const otherUserSnapshot = await db.ref(`users/${otherUserId}`).once('value');
                const otherUserData = otherUserSnapshot.val();
                
                if (otherUserData) {
                    const chat = {
                        id: chatId,
                        otherUser: {
                            id: otherUserId,
                            username: otherUserData.username
                        },
                        lastMessage: chatData.lastMessage || '',
                        lastMessageTime: chatData.lastMessageTime,
                        unreadCount: chatData.unreadCount || 0
                    };
                    
                    chats.push(chat);
                    
                    if (chat.unreadCount > 0) {
                        activeChatUser = chat.otherUser;
                    }
                }
            }
        }

        chats.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

        renderChats();
        updateActiveChat();
    } catch (error) {
        console.error('Ошибка загрузки чатов:', error);
    }
}

function renderChats() {
    if (chats.length === 0) {
        chatsList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    
    // Создаем новый HTML для чатов
    const newChatsHTML = chats.map(chat => {
        const timeAgo = formatTimeAgo(chat.lastMessageTime);
        return `
            <div class="chat-item" onclick="openChat(${JSON.stringify(chat.otherUser).replace(/"/g, '&quot;')})">
                <div class="user-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="user-details">
                    <span class="username">${chat.otherUser.username}</span>
                    <span class="last-message">${chat.lastMessage || 'Нет сообщений'}</span>
                </div>
                <div class="chat-info">
                    <span class="time">${timeAgo}</span>
                    ${chat.unreadCount > 0 ? `<span class="unread-count">${chat.unreadCount}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Обновляем только если содержимое изменилось
    if (chatsList.innerHTML !== newChatsHTML) {
        chatsList.innerHTML = newChatsHTML;
    }
}

function createChatElement(chat) {
    const chatDiv = document.createElement('div');
    chatDiv.className = 'chat-item';
    chatDiv.onclick = () => openChat(chat.otherUser);

    const timeAgo = formatTimeAgo(chat.lastMessageTime);
    
    chatDiv.innerHTML = `
        <div class="user-avatar">
            <i class="fas fa-user"></i>
        </div>
        <div class="user-details">
            <span class="username">${chat.otherUser.username}</span>
            <span class="last-message">${chat.lastMessage || 'Нет сообщений'}</span>
        </div>
        <div class="chat-info">
            <span class="time">${timeAgo}</span>
            ${chat.unreadCount > 0 ? `<span class="unread-count">${chat.unreadCount}</span>` : ''}
        </div>
    `;

    return chatDiv;
}

function updateActiveChat() {
    if (activeChatUser) {
        activeChatDiv.style.display = 'block';
        activeChatUsername.textContent = activeChatUser.username;
        activeChatMessage.textContent = 'Новое сообщение';
    } else {
        activeChatDiv.style.display = 'none';
    }
}

// Делаем функцию глобальной для работы из onclick
window.openChat = async function(otherUser) {
    currentChat = otherUser;
    chatUsername.textContent = otherUser.username;
    
    const chatId = await getOrCreateChat(otherUser.id);
    
    loadMessages(chatId);
    
    markMessagesAsRead(chatId);
    
    showPage(chatPage);
}

async function getOrCreateChat(otherUserId) {
    const participants = [currentUser.id, otherUserId].sort();
    const participantsKey = participants.join('_');
    
    const existingChatSnapshot = await db.ref('chats').orderByChild('participantsKey').equalTo(participantsKey).once('value');
    
    if (existingChatSnapshot.exists()) {
        const chatData = existingChatSnapshot.val();
        return Object.keys(chatData)[0];
    }

    const newChatRef = db.ref('chats').push();
    await newChatRef.set({
        participants: participants,
        participantsKey: participantsKey,
        createdAt: new Date().toISOString(),
        lastMessageTime: new Date().toISOString()
    });

    return newChatRef.key;
}

async function loadMessages(chatId) {
    try {
        const messagesSnapshot = await db.ref(`chats/${chatId}/messages`).orderByChild('timestamp').once('value');
        const messagesData = messagesSnapshot.val() || {};

        const wasAtBottom = messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - 10;

        messagesContainer.innerHTML = '';

        const messages = Object.entries(messagesData).map(([id, data]) => ({
            id,
            ...data
        })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        messages.forEach(messageData => {
            const messageElement = createMessageElement(messageData);
            messagesContainer.appendChild(messageElement);
        });

        if (wasAtBottom || messages.length > 0) {
            scrollToBottom();
        }
    } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
    }
}

function createMessageElement(messageData) {
    const messageDiv = document.createElement('div');
    const isSent = messageData.senderId === currentUser.id;
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;

    const time = formatTime(messageData.timestamp);
    
    messageDiv.innerHTML = `
        <div class="message-content">${messageData.text}</div>
        <div class="message-time">${time}</div>
    `;

    return messageDiv;
}

async function sendMessage() {
    const text = messageInput.value.trim();
    
    if (!text || !currentChat) return;

    try {
        const participants = [currentUser.id, currentChat.id].sort();
        const participantsKey = participants.join('_');
        
        const chatSnapshot = await db.ref('chats').orderByChild('participantsKey').equalTo(participantsKey).once('value');
        
        if (!chatSnapshot.exists()) {
            showNotification('Ошибка: чат не найден', 'error');
            return;
        }

        const chatId = Object.keys(chatSnapshot.val())[0];
        const messageData = {
            text: text,
            senderId: currentUser.id,
            timestamp: new Date().toISOString()
        };

        const newMessageRef = db.ref(`chats/${chatId}/messages`).push();
        await newMessageRef.set(messageData);

        await db.ref(`chats/${chatId}`).update({
            lastMessage: text,
            lastMessageTime: new Date().toISOString(),
            unreadCount: (chatSnapshot.val()[chatId].unreadCount || 0) + 1
        });

        messageInput.value = '';
        
        const messageElement = createMessageElement({
            text: text,
            senderId: currentUser.id,
            timestamp: new Date().toISOString()
        });
        messagesContainer.appendChild(messageElement);
        scrollToBottom();
        
        loadChats();
        
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
        showNotification('Ошибка отправки сообщения', 'error');
    }
}

async function markMessagesAsRead(chatId) {
    try {
        await db.ref(`chats/${chatId}`).update({
            unreadCount: 0
        });
    } catch (error) {
        console.error('Ошибка отметки сообщений как прочитанных:', error);
    }
}

function showNewChatModal() {
    const username = prompt('Введите имя пользователя для начала чата:');
    if (username && username.trim()) {
        findUserAndStartChat(username.trim());
    }
}

async function findUserAndStartChat(username) {
    try {
        const usersSnapshot = await db.ref('users').orderByChild('username').equalTo(username).once('value');
        
        if (!usersSnapshot.exists()) {
            showNotification('Пользователь не найден', 'error');
            return;
        }

        const userData = usersSnapshot.val();
        const userId = Object.keys(userData)[0];
        const userInfo = userData[userId];

        if (userId === currentUser.id) {
            showNotification('Нельзя начать чат с самим собой', 'error');
            return;
        }

        const otherUser = {
            id: userId,
            username: userInfo.username
        };

        openChat(otherUser);
    } catch (error) {
        console.error('Ошибка поиска пользователя:', error);
        showNotification('Ошибка поиска пользователя', 'error');
    }
}

function updateUserInfo() {
    if (currentUser) {
        currentUserSpan.textContent = currentUser.username;
    }
}

function showPage(page) {
    authPage.classList.remove('active');
    chatsPage.classList.remove('active');
    chatPage.classList.remove('active');
    usersPage.classList.remove('active');
    
    page.classList.add('active');
}

function showUsersPage() {
    showPage(usersPage);
    loadAllUsers();
}

async function loadAllUsers() {
    try {
        loadingUsers.style.display = 'flex';
        emptyUsersState.style.display = 'none';
        usersList.innerHTML = '';

        const usersSnapshot = await db.ref('users').once('value');
        const usersData = usersSnapshot.val() || {};

        const users = Object.entries(usersData)
            .filter(([userId, userData]) => userId !== currentUser.id)
            .map(([userId, userData]) => ({
                id: userId,
                username: userData.username,
                isOnline: userData.isOnline || false,
                lastSeen: userData.lastSeen
            }))
            .sort((a, b) => {
                if (a.isOnline && !b.isOnline) return -1;
                if (!a.isOnline && b.isOnline) return 1;
                return a.username.localeCompare(b.username);
            });

        renderUsers(users);
        loadingUsers.style.display = 'none';
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
        loadingUsers.style.display = 'none';
        showNotification('Ошибка загрузки пользователей', 'error');
    }
}

function renderUsers(users) {
    if (users.length === 0) {
        emptyUsersState.style.display = 'block';
        return;
    }

    emptyUsersState.style.display = 'none';
    usersList.innerHTML = '';

    users.forEach(user => {
        const userElement = createUserElement(user);
        usersList.appendChild(userElement);
    });
}

function createUserElement(user) {
    const userDiv = document.createElement('div');
    userDiv.className = 'user-item';

    const statusClass = user.isOnline ? '' : 'offline';
    const statusText = user.isOnline ? 'онлайн' : 'оффлайн';
    
    userDiv.innerHTML = `
        <div class="user-avatar">
            <i class="fas fa-user"></i>
        </div>
        <div class="user-details">
            <span class="username">${user.username}</span>
            <span class="user-status ${statusClass}">${statusText}</span>
        </div>
        <button class="btn-message" onclick="startChatWithUser('${user.id}', '${user.username}')">
            <i class="fas fa-comment"></i>
        </button>
    `;

    return userDiv;
}

function startChatWithUser(userId, username) {
    const otherUser = {
        id: userId,
        username: username
    };
    
    openChat(otherUser);
}

function filterUsers(searchTerm) {
    const userItems = usersList.querySelectorAll('.user-item');
    
    userItems.forEach(item => {
        const username = item.querySelector('.username').textContent.toLowerCase();
        if (username.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });

    const visibleUsers = usersList.querySelectorAll('.user-item[style="display: flex"]');
    if (visibleUsers.length === 0 && searchTerm) {
        emptyUsersState.style.display = 'block';
        emptyUsersState.querySelector('h3').textContent = 'Пользователи не найдены';
        emptyUsersState.querySelector('p').textContent = `По запросу "${searchTerm}" ничего не найдено`;
    } else {
        emptyUsersState.style.display = 'none';
    }
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function formatTimeAgo(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'сейчас';
    if (diffInMinutes < 60) return `${diffInMinutes} мин`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ч`;
    return `${Math.floor(diffInMinutes / 1440)} дн`;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ff6b6b' : '#4facfe'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function setupMessageListener() {
    if (!currentUser) return;
    
    db.ref('chats').orderByChild('lastMessageTime').on('value', (snapshot) => {
        if (currentUser && chatsPage.classList.contains('active')) {
            loadChats();
        }
    });
}

function startActiveUpdates() {
    setInterval(() => {
        if (currentUser) {
            if (chatsPage.classList.contains('active')) {
                loadChats();
            }
            
            if (chatPage.classList.contains('active') && currentChat) {
                const participants = [currentUser.id, currentChat.id].sort();
                const participantsKey = participants.join('_');
                
                db.ref('chats').orderByChild('participantsKey').equalTo(participantsKey).once('value')
                    .then(snapshot => {
                        if (snapshot.exists()) {
                            const chatId = Object.keys(snapshot.val())[0];
                            loadMessages(chatId);
                        }
                    });
            }
        }
    }, 3000);
}



setupMessageListener();
startActiveUpdates();

window.addEventListener('focus', () => {
    if (currentUser) {
        db.ref(`users/${currentUser.id}`).update({
            isOnline: true,
            lastSeen: new Date().toISOString()
        });
    }
});

window.addEventListener('blur', () => {
    if (currentUser) {
        db.ref(`users/${currentUser.id}`).update({
            isOnline: false,
            lastSeen: new Date().toISOString()
        });
    }
}); 