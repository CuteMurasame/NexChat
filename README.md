# NexChat

NexChat is a modern, real-time chat application built with Node.js and Socket.io. It provides a secure, feature-rich communication platform with support for Markdown, LaTeX rendering, file sharing, and user management.

## Features

- **Real-time Messaging** - Instant communication powered by Socket.io
- **Role-based Access Control** - Admin and user roles with different permissions
- **Markdown Support & LaTeX Rendering** - Rich text formatting with markdown-it & Mathematical equations with KaTeX
- **Code Syntax Highlighting** - Beautiful code blocks with highlight.js
- **File Sharing With Drag & Drop** - Easily upload and share files with other users with drag and drop
- **Avatar Support** - Custom user avatars
- **Message History** - Persistent message storage with SQLite
- **Message Recall** - Delete your own messages or any message as admin
- **Responsive Design** - Works on desktop and mobile devices

## Pre-requisites

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
[System Initialization] No administrator account detected.

Admin username: admin
Admin password: ********
Admin admin created successfully!
```

Note that the password is displayed in plain text.

5. Access the application at `http://localhost:3000`

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

### Issues

If you encounter any errors, please submit a pull request.

### Port Already in Use

If port 3000 is already in use, either:

- Stop the process using port 3000
- Change the port number in `server.js`

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
