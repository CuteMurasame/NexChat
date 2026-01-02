const socket = io({ autoConnect: false });

const md = window.markdownit({
    html: false, breaks: true, linkify: true,
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try { return '<pre class="hljs"><code>' + hljs.highlight(str, { language: lang, ignoreIllegals: true }).value + '</code></pre>'; } catch (__) {}
        }
        return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
    }
});

let currentUser = null;
let currentRole = null;
let contextTargetId = null;

// === 1. 初始化 & Session ===
window.addEventListener('load', checkSession);

async function checkSession() {
    try {
        const res = await fetch('/api/session');
        const data = await res.json();
        if (data.loggedIn) {
            currentUser = data.user.username;
            currentRole = data.user.role;
            updateAvatarUI(data.user.avatar);
            setupUI();
        }
    } catch (e) { console.error(e); }
}

async function login() {
    const userIn = document.getElementById('login-user');
    const passIn = document.getElementById('login-pass');
    if(!userIn.value || !passIn.value) return;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: userIn.value, password: passIn.value })
        });
        const data = await res.json();
        if (data.error) return alert(data.error);

        currentUser = data.username;
        currentRole = data.role;
        updateAvatarUI(data.avatar);
        setupUI();
    } catch(e) { alert("服务器连接失败"); }
}

async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    location.reload();
}

function setupUI() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('chat-screen').classList.remove('hidden');
    document.getElementById('current-user').innerText = currentUser;
    if (currentRole === 'admin') {
        document.getElementById('admin-panel').classList.remove('hidden');
        document.getElementById('role-badge').classList.remove('hidden');
    }
    socket.connect();
}

// === 2. 用户头像 & 管理 ===
function updateAvatarUI(url) {
    const img = document.getElementById('my-avatar-img');
    const ph = document.getElementById('my-avatar-placeholder');
    if (url) {
        img.src = url;
        img.classList.remove('hidden');
        ph.classList.add('hidden');
    } else {
        img.classList.add('hidden');
        ph.classList.remove('hidden');
        ph.innerText = currentUser ? currentUser.charAt(0).toUpperCase() : 'U';
    }
}

async function uploadAvatar() {
    const file = document.getElementById('avatar-upload').files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
        const res = await fetch('/api/upload_avatar', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.avatar) updateAvatarUI(data.avatar);
    } catch (e) { alert("头像上传失败"); }
}

async function createUser() {
    const newUser = document.getElementById('new-user').value;
    const newPass = document.getElementById('new-pass').value;
    if(!newUser || !newPass) return;
    const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUser, newPass })
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else { 
        alert('用户创建成功'); 
        document.getElementById('new-user').value = ''; 
        document.getElementById('new-pass').value = ''; 
    }
}

// === 3. 文件上传 & 拖拽 ===
const dragOverlay = document.getElementById('drag-overlay');
let dragCounter = 0;

document.addEventListener('dragenter', (e) => { e.preventDefault(); dragCounter++; dragOverlay.classList.remove('hidden'); });
document.addEventListener('dragleave', (e) => { e.preventDefault(); dragCounter--; if(dragCounter === 0) dragOverlay.classList.add('hidden'); });
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => {
    e.preventDefault(); dragCounter = 0; dragOverlay.classList.add('hidden');
    if (e.dataTransfer.files.length > 0) uploadFile(e.dataTransfer.files[0]);
});

function handleFileSelect(input) {
    if (input.files.length > 0) {
        uploadFile(input.files[0]);
        input.value = '';
    }
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch('/api/upload_file', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.filepath) {
            socket.emit('chat_message', { 
                username: currentUser, type: 'file',
                filename: data.filename, filesize: data.filesize, filepath: data.filepath
            });
        }
    } catch (e) { alert("文件上传失败"); }
}

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// === 4. 消息渲染 & 发送 ===
const msgInput = document.getElementById('msg-input');
const messagesDiv = document.getElementById('messages');

msgInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    if(this.value === '') this.style.height = 'auto';
});

msgInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); sendMessage(); }
});

function sendMessage() {
    const content = msgInput.value.trim();
    if (!content) return;
    socket.emit('chat_message', { username: currentUser, content, type: 'text' });
    msgInput.value = '';
    msgInput.style.height = 'auto';
    msgInput.focus();
}

function renderMessage(msg) {
    const isSelf = msg.username === currentUser;
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${isSelf ? 'self' : ''}`;
    wrapper.id = `msg-${msg.id}`;
    
    const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    // 无论谁，都生成头像HTML
    let avatarHtml = msg.avatar 
        ? `<img src="${msg.avatar}" class="msg-avatar">` 
        : `<div class="msg-avatar-placeholder">${msg.username.charAt(0).toUpperCase()}</div>`;

    // 内容渲染
    let contentHtml = '';
    if (msg.type === 'file') {
        const sizeStr = formatSize(msg.filesize);
        contentHtml = `
            <a href="${msg.filepath}" target="_blank" class="file-card" download="${msg.filename}">
                <div class="file-icon"><i class="ri-file-3-fill"></i></div>
                <div class="file-info">
                    <div class="file-name">${msg.filename}</div>
                    <div class="file-size">${sizeStr}</div>
                </div>
                <div class="file-download"><i class="ri-download-2-line"></i></div>
            </a>
        `;
    } else {
        contentHtml = `<div class="message-text">${md.render(msg.content || '')}</div>`;
    }

    wrapper.innerHTML = `
        ${avatarHtml}
        <div class="message-content">
            ${!isSelf ? `<div class="message-author">${msg.username}</div>` : ''}
            ${contentHtml}
            <span class="message-time">${timeStr}</span>
        </div>
    `;

    wrapper.querySelector('.message-content').addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, msg.id, msg.username, msg.type === 'file' ? '[文件]' : msg.content);
    });

    messagesDiv.appendChild(wrapper);
    if (msg.type !== 'file') renderMathInElement(wrapper, { delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}] });
    scrollToBottom();
}

function scrollToBottom() {
    requestAnimationFrame(() => messagesDiv.scrollTop = messagesDiv.scrollHeight);
}

// === 5. 右键菜单 & Socket ===
const contextMenu = document.getElementById('context-menu');
const recallBtn = document.getElementById('recall-btn');

function showContextMenu(e, msgId, author, rawContent) {
    contextTargetId = msgId;
    const isMine = author === currentUser;
    const isAdmin = currentRole === 'admin';
    if (isMine || isAdmin) recallBtn.classList.remove('hidden'); else recallBtn.classList.add('hidden');
    contextMenu.dataset.content = rawContent;
    let x = e.clientX, y = e.clientY;
    if (x + 160 > window.innerWidth) x -= 160;
    if (y + 100 > window.innerHeight) y -= 100;
    contextMenu.style.top = `${y}px`; contextMenu.style.left = `${x}px`;
    contextMenu.classList.remove('hidden');
}
document.addEventListener('click', () => contextMenu.classList.add('hidden'));
function copyMessage() { navigator.clipboard.writeText(contextMenu.dataset.content); }
function recallMessage() { socket.emit('recall_message', { id: contextTargetId, username: currentUser }); }

socket.on('history', (msgs) => { messagesDiv.innerHTML = ''; msgs.forEach(renderMessage); scrollToBottom(); });
socket.on('new_message', renderMessage);
socket.on('message_recalled', (id) => { const el = document.getElementById(`msg-${id}`); if(el) el.remove(); });
