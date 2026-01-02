const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const readline = require('readline');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const db = new sqlite3.Database('chat.db');

// 配置 Multer (文件/头像上传)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => {
        // 防止中文文件名乱码，使用时间戳+随机数
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.static('public'));

// 配置 Session
app.use(session({
    secret: 'nexchat-secret-key-change-me', // 生产环境请修改此密钥
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7天
}));

// 初始化数据库
db.serialize(() => {
    // 用户表
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT,
        avatar TEXT DEFAULT ''
    )`);
    // 补丁：尝试添加 avatar 字段 (兼容旧库)
    db.run("ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT ''", () => {});

    // 消息表
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        content TEXT,
        timestamp INTEGER,
        avatar TEXT,
        type TEXT DEFAULT 'text',
        filename TEXT,
        filesize INTEGER,
        filepath TEXT
    )`);
    // 补丁：添加所有新字段 (兼容旧库)
    const newCols = ['avatar TEXT', 'type TEXT DEFAULT "text"', 'filename TEXT', 'filesize INTEGER', 'filepath TEXT'];
    newCols.forEach(col => {
        db.run(`ALTER TABLE messages ADD COLUMN ${col}`, () => {});
    });
});

// CLI 初始化管理员
function checkAdmin() {
    return new Promise((resolve) => {
        db.get("SELECT count(*) as count FROM users WHERE role = 'admin'", async (err, row) => {
            if (row && row.count === 0) {
                console.log("\n[系统初始化] 未检测到管理员账号。");
                const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                const ask = (q) => new Promise(r => rl.question(q, r));
                const username = await ask('请输入管理员用户名: ');
                const password = await ask('请输入管理员密码: ');
                rl.close();
                const hash = await bcrypt.hash(password, 10);
                db.run("INSERT INTO users (username, password, role) VALUES (?, ?, 'admin')", [username, hash], () => {
                    console.log(`管理员 ${username} 创建成功！\n`);
                    resolve();
                });
            } else {
                resolve();
            }
        });
    });
}

// === API 接口 ===

// 检查 Session
app.get('/api/session', (req, res) => {
    if (req.session.user) {
        db.get("SELECT avatar FROM users WHERE username = ?", [req.session.user.username], (err, row) => {
            if(row) req.session.user.avatar = row.avatar;
            res.json({ loggedIn: true, user: req.session.user });
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// 登录
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        const userData = { username: user.username, role: user.role, avatar: user.avatar };
        req.session.user = userData;
        res.json(userData);
    });
});

// 登出
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// 创建用户 (管理员)
app.post('/api/users', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ error: '权限不足' });
    const { newUser, newPass } = req.body;
    const hash = await bcrypt.hash(newPass, 10);
    db.run("INSERT INTO users (username, password, role) VALUES (?, ?, 'user')", [newUser, hash], (err) => {
        if (err) return res.status(400).json({ error: '用户已存在' });
        res.json({ success: true });
    });
});

// 上传头像
app.post('/api/upload_avatar', upload.single('avatar'), (req, res) => {
    if (!req.session.user || !req.file) return res.status(400).json({ error: '上传失败' });
    const avatarPath = '/uploads/' + req.file.filename;
    db.run("UPDATE users SET avatar = ? WHERE username = ?", [avatarPath, req.session.user.username], (err) => {
        if (err) return res.status(500).json({ error: '数据库错误' });
        req.session.user.avatar = avatarPath;
        res.json({ avatar: avatarPath });
        // 更新历史消息头像(可选)
        db.run("UPDATE messages SET avatar = ? WHERE username = ?", [avatarPath, req.session.user.username]);
    });
});

// 上传文件
app.post('/api/upload_file', upload.single('file'), (req, res) => {
    if (!req.session.user || !req.file) return res.status(400).json({ error: '上传失败' });
    res.json({
        filename: Buffer.from(req.file.originalname, 'latin1').toString('utf8'), // 简单修复中文名乱码(视环境而定)
        filepath: '/uploads/' + req.file.filename,
        filesize: req.file.size
    });
});

// === Socket.io 逻辑 ===
io.on('connection', (socket) => {
    // 发送历史消息
    db.all("SELECT * FROM messages ORDER BY timestamp ASC LIMIT 100", (err, rows) => {
        if (!err) socket.emit('history', rows);
    });

    // 接收消息
    socket.on('chat_message', (msgData) => {
        const { username, content, type = 'text', filename, filesize, filepath } = msgData;
        
        db.get("SELECT avatar FROM users WHERE username = ?", [username], (err, user) => {
            const avatar = user ? user.avatar : '';
            const timestamp = Date.now();
            
            db.run(
                "INSERT INTO messages (username, content, timestamp, avatar, type, filename, filesize, filepath) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 
                [username, content || '', timestamp, avatar, type, filename, filesize, filepath], 
                function(err) {
                    if (!err) {
                        io.emit('new_message', { 
                            id: this.lastID, username, content, timestamp, avatar, 
                            type, filename, filesize, filepath 
                        });
                    }
                }
            );
        });
    });

    // 撤回消息
    socket.on('recall_message', ({ id, username }) => {
        db.get("SELECT * FROM messages WHERE id = ?", [id], (err, msg) => {
            if (!msg) return;
            db.get("SELECT role FROM users WHERE username = ?", [username], (err, user) => {
                const isAdmin = user && user.role === 'admin';
                if (msg.username === username || isAdmin) {
                    db.run("DELETE FROM messages WHERE id = ?", [id], () => {
                        io.emit('message_recalled', id);
                    });
                }
            });
        });
    });
});

checkAdmin().then(() => {
    server.listen(3000, () => {
        console.log('Server running at http://localhost:3000');
    });
});
