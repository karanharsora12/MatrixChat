# MatrixChat — A Real-Time Messaging Web Application

MatrixChat is a modern, production-grade WhatsApp-inspired messaging application built using React.js, Node.js, Express, TypeScript, PostgreSQL 18, Drizzle ORM, and Socket.IO.

---

## 1. Features

- **Mobile-Number-Only Authentication**:
  - Support for international calling codes (US, UK, India, Canada, Australia, Germany, Japan, UAE, etc.).
  - E.164 phone number normalization and native regex validation.
  - Zero external validation libraries (strictly native TypeScript / JavaScript type guards).
  - Pluggable SMS Provider Adapter (`ISmsProvider`) with a Dev-Only Mock provider and Twilio SMS adapter.
  - Short-lived, single-use, cryptographically hashed OTPs (HMAC-SHA256) with 60-second resend cooldowns and attempt limits.
  - Secure, HTTP-only session cookies with `SameSite=Lax` and configurable `Secure` flags.
- **WhatsApp-Inspired Chat Interface**:
  - MatrixChat identity with sleek Matrix green (`#00a884`) accents.
  - Light and Dark mode toggle.
  - Desktop two-column layout and responsive mobile view with back-to-list navigation.
  - Chat list with last-message preview, timestamps, unread message count badges, pin and mute icons.
  - Incoming and outgoing message bubbles with timestamps, read receipts (single grey tick, double grey ticks, double blue ticks).
  - Reply-to messages banner.
  - Soft deletion ("This message was deleted") with permission checks.
  - Real-time typing indicators and live online/offline presence tracking.
- **File & Media Attachments**:
  - Secure multipart uploads with MIME validation, file size limits (10MB), and sanitized UUID filenames.
  - Inline image previews with full-size viewing and document download cards.
- **Contacts & Privacy**:
  - Safe mobile-number contact discovery (prevents whole-directory scraping).
  - Idempotent 1-to-1 direct conversation creation.
  - Contact blocking and unblocking.
  - Customizable privacy settings: Last Seen, Online Status, Profile Photo visibility, and Read Receipts toggling.

---

## 2. Technology Stack

### Frontend (`apps/web`)
- React 18 with TypeScript & Vite
- Tailwind CSS (with Matrix & WhatsApp custom color palette)
- Lucide React icons
- Socket.IO Client (with cookie-based authentication)
- TanStack Query

### Backend (`apps/api`)
- Node.js & Express with TypeScript
- Socket.IO for real-time messaging, presence, and typing indicators
- Drizzle ORM with `node-postgres` driver
- PostgreSQL 18 (with relational UUID schemas, indexes, and cascades)
- Native request validation & crypto primitives

---

## 3. Project Structure

```
MatrixChat/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── db/
│   │   │   │   ├── index.ts        # PG Pool & Drizzle DB instance
│   │   │   │   ├── schema.ts       # 11 relational database tables
│   │   │   │   └── seed.ts         # Fictional Matrix test users seed script
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts         # Session cookie authentication middleware
│   │   │   │   └── rateLimiter.ts  # Native sliding-window rate limiter
│   │   │   ├── modules/
│   │   │   │   ├── auth/           # Mobile OTP auth, SMS adapter (mock/Twilio)
│   │   │   │   ├── contacts/       # Contact search, save, block
│   │   │   │   ├── conversations/  # 1-to-1 conversations, pin, mute
│   │   │   │   ├── messages/       # Messages, pagination, soft delete, receipts
│   │   │   │   ├── uploads/        # Safe file upload handling
│   │   │   │   └── users/          # User profile & privacy settings
│   │   │   ├── sockets/            # Socket.IO handshake auth & room events
│   │   │   └── utils/
│   │   │       ├── crypto.ts       # PRNG OTP, HMAC hashing, session tokens
│   │   │       └── validation.ts   # Native E.164 normalizer & type guards
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/
│       ├── src/
│       │   ├── features/
│       │   │   ├── auth/           # Login & OTP verification screens
│       │   │   ├── chats/          # ChatList, ChatHeader, Bubbles, Composer
│       │   │   ├── contacts/       # New chat modal & contact lookup
│       │   │   └── profile/        # Profile & privacy settings drawer
│       │   ├── hooks/              # useAuth, useTheme
│       │   ├── services/           # REST api client & socket client
│       │   ├── types/              # Domain interfaces
│       │   ├── utils/              # Country codes, formatters, cn
│       │   ├── App.tsx
│       │   ├── index.css
│       │   └── main.tsx
│       ├── tailwind.config.js
│       ├── vite.config.ts
│       └── package.json
└── package.json
```

---

## 4. Setup & Running Locally

### Prerequisites
- Node.js v20+ / v22+
- PostgreSQL 18+ running on `localhost:5432`

### 1. Configure Backend Environment
Edit `apps/api/.env` if your PostgreSQL credentials differ:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/matrix_chat
SESSION_SECRET=m4tr1x_ch4t_s3cur3_s3ss10n_s3cr3t_k3y_9876543210_!@#$
CLIENT_URL=http://localhost:5173
SMS_PROVIDER=mock
UPLOAD_DIR=./uploads
```

### 2. Push Schema & Seed Test Data
```bash
# Push Drizzle schema to PostgreSQL
npm --prefix apps/api run db:push

# Seed fictional test users (Neo, Trinity, Morpheus, Cypher)
npm --prefix apps/api run db:seed
```

### 3. Start Both Backend & Frontend with One Command
```bash
# Concurrently starts both API (Port 5000) and Web App (Port 5173)
npm run dev
```

Or run them individually if preferred:
```bash
npm run dev:api    # Backend API (Port 5000)
npm run dev:web    # Frontend Web App (Port 5173)
```

Open `http://localhost:5173` in your browser.

---

## 5. Seed Test Accounts & OTP Verification

You can log in as any of the seeded fictional users or enter any new phone number:

| Character | Country Code | National Number | Full E.164 Phone |
|---|---|---|---|
| Neo (Thomas Anderson) | +1 (US) | 415-555-0101 | `+14155550101` |
| Trinity | +1 (US) | 415-555-0102 | `+14155550102` |
| Morpheus | +1 (US) | 415-555-0103 | `+14155550103` |
| Cypher | +44 (UK) | 20-7946-0199 | `+442079460199` |

### How OTPs Work in Development Mock Mode:
When you click **Continue**, the backend `DevMockSmsProvider` prints a clear ASCII banner to the terminal running the API server:
```
================================================================
📱 [MATRIXCHAT SMS DISPATCH - DEV MOCK]
To:   +14155550101
Code: 179867
Note: Valid for 5 minutes. Enter this code in MatrixChat UI.
================================================================
```
Simply type the 6-digit code shown in the terminal into the verification box to log in immediately.

---

## 6. Real-Time Socket.IO Events

| Event Name | Direction | Purpose |
|---|---|---|
| `join_conversation` | Client ➔ Server | Verifies participant authorization and joins conversation room |
| `leave_conversation` | Client ➔ Server | Leaves conversation room |
| `send_message` | Client ➔ Server | Persists message to DB & broadcasts to room |
| `message_received` | Server ➔ Client | Delivers incoming message in real time |
| `typing_start` / `typing_stop` | Client ➔ Server ➔ Client | Broadcasts live typing indicators |
| `mark_read` | Client ➔ Server | Updates receipts in DB and emits `messages_read` |
| `messages_read` | Server ➔ Client | Real-time double blue tick synchronization |
| `presence_changed` | Server ➔ Client | Live online/offline status updates |
| `conversation_updated` | Server ➔ Client | Updates sidebar last-message preview & unread count |
