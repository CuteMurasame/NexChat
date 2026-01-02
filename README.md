# NexChat

NexChat is a modern, real-time chat application built with Node.js and Socket.io. It provides a secure, feature-rich communication platform with support for Markdown, LaTeX rendering, file sharing, and user management.

## Features

- **Real-time Messaging** - Instant communication powered by Socket.io
- **User Authentication** - Secure login system with bcrypt password hashing
- **Role-based Access Control** - Admin and user roles with different permissions
- **Markdown Support** - Rich text formatting with markdown-it
- **LaTeX Rendering** - Mathematical equations with KaTeX
- **Code Syntax Highlighting** - Beautiful code blocks with highlight.js
- **File Sharing** - Upload and share files with other users
- **Avatar Support** - Custom user avatars
- **Message History** - Persistent message storage with SQLite
- **Message Recall** - Delete your own messages or any message as admin
- **Drag & Drop** - Easy file uploads with drag and drop
- **Responsive Design** - Works on desktop and mobile devices

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/CuteMurasame/NexChat.git
cd NexChat
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
node server.js
```

4. On first run, you'll be prompted to create an admin account:
```
[系统初始化] 未检测到管理员账号。
请输入管理员用户名: admin
请输入管理员密码: ********
管理员 admin 创建成功！
```

5. Access the application at `http://localhost:3000`

## Usage

### For Users

1. **Login** - Enter your username and password on the login screen
2. **Send Messages** - Type your message in the input area and press `Ctrl+Enter` to send
3. **Markdown Support** - Use markdown syntax for formatting:
   - `**bold**` for **bold** text
   - `*italic*` for *italic* text
   - `` `code` `` for inline code
   - ` ```language ` for code blocks
4. **LaTeX Math** - Use `$` for inline math or `$$` for block math
5. **Send Files** - Click the attachment icon or drag and drop files
6. **Upload Avatar** - Click on your avatar in the sidebar to upload a custom image
7. **Recall Messages** - Right-click on your message to recall/delete it

### For Admins

Administrators have additional privileges:

- **User Management** - Create new user accounts from the admin panel
- **Message Moderation** - Recall any user's messages
- **Full Access** - Access to all chat features and settings

## Configuration

### Session Secret

⚠️ **Important**: Change the session secret in production!

Edit `server.js` line 39:
```javascript
secret: 'nexchat-secret-key-change-me', // Change this in production!
```

### Port Configuration

The default port is 3000. To change it, modify the last line in `server.js`:
```javascript
server.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});
```

### File Upload Limits

File uploads are handled by Multer. To configure upload limits, modify the multer configuration in `server.js`.

## Project Structure

```
NexChat/
├── server.js           # Main server application
├── package.json        # Project dependencies
├── chat.db            # SQLite database (auto-created)
└── public/            # Client-side files
    ├── index.html     # Main HTML page
    ├── client.js      # Client-side JavaScript
    ├── style.css      # Styles
    └── uploads/       # User uploads (auto-created)
```

## Dependencies

### Server-side
- **express** - Web framework
- **socket.io** - Real-time bidirectional communication
- **sqlite3** - Database
- **bcrypt** - Password hashing
- **express-session** - Session management
- **multer** - File upload handling

### Client-side (CDN)
- **markdown-it** - Markdown parser
- **highlight.js** - Code syntax highlighting
- **KaTeX** - LaTeX math rendering
- **RemixIcon** - Icon library

## Database Schema

### Users Table
- `id` - Primary key
- `username` - Unique username
- `password` - Bcrypt hashed password
- `role` - User role (admin/user)
- `avatar` - Avatar image path

### Messages Table
- `id` - Primary key
- `username` - Message sender
- `content` - Message text content
- `timestamp` - Unix timestamp
- `avatar` - Sender's avatar
- `type` - Message type (text/file)
- `filename` - Original filename (for files)
- `filesize` - File size in bytes
- `filepath` - File storage path

## API Endpoints

- `GET /api/session` - Check current session
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `POST /api/users` - Create new user (admin only)
- `POST /api/upload_avatar` - Upload user avatar
- `POST /api/upload_file` - Upload file for sharing

## Socket.io Events

### Client → Server
- `chat_message` - Send a new message
- `recall_message` - Recall/delete a message

### Server → Client
- `history` - Initial message history
- `new_message` - Broadcast new message
- `message_recalled` - Notify message deletion

## Security Features

- Password hashing with bcrypt
- Session-based authentication
- Role-based access control
- SQL injection prevention with parameterized queries
- XSS prevention with HTML escaping in markdown renderer

## Development

To modify the application:

1. Server-side code is in `server.js`
2. Client-side code is in `public/client.js`
3. Styles are in `public/style.css`
4. HTML structure is in `public/index.html`

After making changes, restart the server:
```bash
node server.js
```

## Troubleshooting

### Database Issues
If you encounter database errors, delete `chat.db` and restart the server to recreate it.

### Port Already in Use
If port 3000 is already in use, either:
- Stop the process using port 3000
- Change the port number in `server.js`

### Upload Directory Errors
The upload directory is created automatically. If you encounter errors, ensure the application has write permissions.

## License

ISC

## Author

CuteMurasame

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
