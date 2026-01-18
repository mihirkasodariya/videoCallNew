# Random Video Chat

A random 1-to-1 video chat web application similar to Omegle, built with React, Node.js, Express, Socket.IO, and WebRTC.

## 🚀 Features

- **Random Matching**: Automatically pairs users from a waiting queue
- **WebRTC Video Calls**: Peer-to-peer video and audio communication
- **Real-time Signaling**: Socket.IO handles WebRTC signaling (SDP offers/answers, ICE candidates)
- **Matchmaking Queue**: In-memory queue system for pairing users
- **Auto Re-matching**: Automatically requeues users when their partner disconnects
- **Simple Controls**: Start, Next, and Stop buttons for easy navigation

## 🛠️ Tech Stack

### Frontend
- **React** (with Vite)
- **WebRTC** (getUserMedia, RTCPeerConnection)
- **socket.io-client**

### Backend
- **Node.js**
- **Express**
- **Socket.IO**

### Infrastructure
- **STUN**: Google public STUN server (`stun:stun.l.google.com:19302`)
- **TURN**: Placeholder config (see production notes below)

## 📁 Project Structure

```
random-video-chat/
├── client/
│   ├── src/
│   │   ├── App.jsx          # Main app component
│   │   ├── VideoChat.jsx    # Video chat component with WebRTC logic
│   │   ├── socket.js        # Socket.IO client setup
│   │   ├── main.jsx         # React entry point
│   │   ├── App.css          # App styles
│   │   ├── VideoChat.css    # Video chat styles
│   │   └── index.css        # Global styles
│   ├── index.html           # HTML entry point
│   ├── package.json         # Frontend dependencies
│   └── vite.config.js       # Vite configuration
├── server/
│   ├── index.js             # Express server setup
│   ├── socket.js            # Socket.IO event handlers
│   ├── matchmaking.js       # Matchmaking queue logic
│   └── package.json         # Backend dependencies
└── README.md                # This file
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

Or run in development mode with auto-reload:
```bash
npm run dev
```

The server will start on `http://localhost:3001` by default.

### Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm dev
```

The frontend will start on `http://localhost:5173` by default.

4. Open your browser and navigate to `http://localhost:5173`

## 📡 Socket Events

### Client → Server

| Event | Description | Payload |
|-------|-------------|---------|
| `join-queue` | User wants to start chat and join matchmaking queue | None |
| `signal` | Relay WebRTC signaling data (offer/answer/ICE candidate) | `{ targetId, signal }` |
| `next` | User wants to disconnect current partner and find new one | None |
| `leave` | User wants to leave queue and stop chat | None |

### Server → Client

| Event | Description | Payload |
|-------|-------------|---------|
| `matched` | User has been paired with a partner | `{ partnerId }` |
| `signal` | WebRTC signaling data from partner | `{ fromId, signal }` |
| `partner-left` | Current partner has disconnected | None |

## 🔄 Matchmaking Flow

1. **User clicks "Start"**:
   - Client emits `join-queue` event
   - Server adds user to `waitingUsers` array

2. **If another user is waiting**:
   - Server pairs both users
   - Creates bidirectional mapping in `activePairs` Map
   - Emits `matched` event to both users with their partner's ID

3. **WebRTC Connection**:
   - Matched users initialize RTCPeerConnection
   - Exchange SDP offers/answers via Socket.IO `signal` events
   - Exchange ICE candidates for NAT traversal
   - Video streams are established peer-to-peer

4. **User clicks "Next"**:
   - Client emits `next` event
   - Server disconnects current pair
   - Notifies partner with `partner-left`
   - Re-queues both users (if still connected)
   - User automatically matches with next available partner

5. **Disconnection Handling**:
   - On disconnect, server cleans up pair mapping
   - Notifies partner with `partner-left`
   - Re-queues remaining user automatically

## 🧠 WebRTC Flow Explained

### 1. Peer Connection Setup
```javascript
// Create RTCPeerConnection with STUN server
const pc = new RTCPeerConnection(pcConfig);
```

### 2. Offer/Answer Exchange
- **Initiator** (first to connect): Creates offer → sends to server → server relays to partner
- **Responder**: Receives offer → creates answer → sends back → server relays to initiator

### 3. ICE Candidate Exchange
- Both peers gather ICE candidates (network addresses)
- Each candidate is sent via Socket.IO to partner
- Candidates are added to peer connection for NAT traversal

### 4. Media Streams
- Local stream: `getUserMedia()` → `srcObject` of local video element
- Remote stream: `ontrack` event → `srcObject` of remote video element

## ⚙️ Configuration

### Server URL

By default, the client connects to `http://localhost:3001`. To change this:

1. Create a `.env` file in the `client` directory:
```
VITE_SERVER_URL=http://your-server-url:3001
```

2. Or modify `client/src/socket.js`:
```javascript
const SERVER_URL = 'http://your-server-url:3001';
```

### Server Port

Change the server port in `server/index.js`:
```javascript
const PORT = process.env.PORT || 3001;
```

## 🚨 Production Considerations

### TURN Server

The current configuration only uses a STUN server, which works for most connections but may fail when both users are behind symmetric NATs or restrictive firewalls.

**For production**, configure a TURN server:

1. Deploy a TURN server (e.g., [coturn](https://github.com/coturn/coturn))

2. Update `pcConfig` in `client/src/VideoChat.jsx`:
```javascript
const pcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'your-username',
      credential: 'your-password'
    }
  ]
};
```

### Security

- Add authentication/authorization
- Implement rate limiting
- Use HTTPS/WSS in production
- Validate and sanitize all inputs
- Consider using rooms/channels for better isolation

### Scalability

- Current implementation uses in-memory storage (not distributed)
- For horizontal scaling, consider:
  - Redis for shared state
  - Sticky sessions for Socket.IO
  - Database for user/room management

### Performance

- Monitor connection quality
- Implement connection quality indicators
- Add bandwidth adaptation
- Consider SFU (Selective Forwarding Unit) for better scalability

## 🐛 Troubleshooting

### Video/Audio Not Working

1. **Check browser permissions**: Ensure camera/microphone access is granted
2. **Check HTTPS**: Some browsers require HTTPS for `getUserMedia()` (except localhost)
3. **Check firewall**: Ensure UDP ports for WebRTC are open

### Connection Fails

1. **Check STUN/TURN**: Verify STUN server is accessible
2. **Check console**: Look for WebRTC error messages
3. **Check NAT type**: Symmetric NATs may require TURN server

### Socket Connection Issues

1. **Check server status**: Ensure backend is running
2. **Check CORS**: Verify CORS is properly configured
3. **Check network**: Ensure firewall allows Socket.IO connections

## 📝 Development Notes

- Uses `useRef` for media streams and peer connections (prevents re-initialization)
- Uses `useEffect` for socket lifecycle management
- Proper cleanup on unmount to prevent memory leaks
- Console logs for debugging WebRTC flow
- Comments explain key WebRTC concepts

## 📄 License

MIT

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

---

**Note**: This is a learning/development project. For production use, implement proper security, authentication, and error handling.

