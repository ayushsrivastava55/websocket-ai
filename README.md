# AI Phone Call — Real-Time Chat Application

A real-time AI chat application that simulates a textual version of an AI phone call. Features streaming AI responses with deliberate pacing, user interruptions mid-stream, idle detection, and full conversation context management over WebSockets.

## Features

| Feature | Implementation |
|---------|---------------|
| Real-time chat | Socket.io over WebSockets |
| AI first message | Auto-greeting on chat creation |
| Slow streaming | Configurable token pacing (80ms default) |
| User interruption | Abort in-flight stream, mark partial response, generate context-aware reply |
| Interruption tracking | `InterruptionMeta` with `cutoffIndex` and `partialText` |
| Conversation history | Full message history sent to OpenAI on each request |
| Idle detection | Configurable timer (30s default), contextual follow-up, no infinite loops |
| Multiple chat tabs | Independent conversations, panels stay mounted |
| Dark mode | `next-themes` with system preference detection |
| Typing indicator | Animated dots during AI response |
| Message timestamps | On every message bubble |
| Scrollable history | Auto-scroll with manual scroll-up detection |
| Connection status | Live connected/disconnected indicator |

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui
- **Backend**: Custom Node.js server, Socket.io v4
- **AI**: OpenAI GPT (gpt-5-nano) with streaming
- **State**: In-memory `Map<sessionId:chatId, ChatState>` (no database)

## Project Structure

```
├── server.ts                       # Custom Next.js + Socket.io server
├── server/
│   ├── socket-handler.ts           # Socket.io event handlers
│   ├── chat-manager.ts             # Per-chat state management
│   ├── ai-stream.ts                # OpenAI streaming with pacing + abort
│   └── prompts.ts                  # System/greeting/idle prompt templates
├── src/
│   ├── app/
│   │   ├── layout.tsx              # ThemeProvider, fonts
│   │   ├── page.tsx                # Renders ChatShell
│   │   └── globals.css             # Tailwind v4 styles
│   ├── components/
│   │   ├── providers/
│   │   │   └── theme-provider.tsx  # Dark mode provider
│   │   ├── chat/
│   │   │   ├── chat-shell.tsx      # Tab management + header
│   │   │   ├── chat-tab-bar.tsx    # Tab navigation
│   │   │   ├── chat-panel.tsx      # Messages + input for one chat
│   │   │   ├── message-list.tsx    # Scrollable message container
│   │   │   ├── message-bubble.tsx  # User/AI bubbles + interruption badge
│   │   │   ├── chat-input.tsx      # Input with send button
│   │   │   └── typing-indicator.tsx
│   │   └── ui/                     # shadcn components
│   ├── hooks/
│   │   ├── use-socket.ts           # Singleton Socket.io connection
│   │   └── use-chat.ts             # Per-chat state + event handling
│   ├── lib/
│   │   ├── utils.ts                # cn() utility
│   │   ├── socket.ts               # Socket.io client factory + session auth
│   │   └── constants.ts            # Timeout/delay config
│   └── types/
│       ├── message.ts              # Message + InterruptionMeta types
│       └── events.ts               # Socket event names + payload types
└── .env.local                      # Environment variables
```

## Setup

### Prerequisites

- Node.js 20+
- npm
- OpenAI API key

### Installation

```bash
# Clone the repo
git clone <your-repo-url>
cd <repo-name>

# Install dependencies
npm install

# Configure environment variables
cp .env.local.example .env.local
# Edit .env.local and add your OpenAI API key
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
OPENAI_API_KEY=sk-proj-your-key-here
IDLE_TIMEOUT_MS=30000
TOKEN_DELAY_MS=80
```

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | Your OpenAI API key (required) |
| `IDLE_TIMEOUT_MS` | `30000` | Milliseconds before idle prompt is sent |
| `TOKEN_DELAY_MS` | `80` | Milliseconds between each streamed token |

### Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

The app runs on `http://localhost:3000`.

### Deploy on a VPS

```bash
# On your VPS
git clone <your-repo-url>
cd <repo-name>
npm install
npm run build

# Set environment variables
echo "OPENAI_API_KEY=sk-proj-..." > .env.local
echo "IDLE_TIMEOUT_MS=30000" >> .env.local
echo "TOKEN_DELAY_MS=80" >> .env.local

# Run with a process manager
npm install -g pm2
pm2 start npm --name "ai-phone-call" -- start
pm2 save
pm2 startup
```

Optionally put nginx in front for HTTPS:

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Usage

1. Open the app — an AI greeting appears automatically
2. Type a message and send — AI streams a response token by token
3. Send a message while the AI is still responding — the old response is marked **interrupted** and a new context-aware response begins
4. Wait 30 seconds after the AI finishes — an idle prompt ("are you still there?") appears
5. Click **+** to open multiple independent chat tabs
6. Toggle the sun/moon icon for dark mode
