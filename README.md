# Barricade

2-player digital adaptation of the classic Barricade board game. Built with React Native (Expo) and a Node.js/Socket.IO backend.

## Prerequisites

- Node.js 20+
- npm 10+
- Expo CLI (`npm install -g expo-cli`) for running on a device/simulator

---

## Client (React Native / Expo)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in EXPO_PUBLIC_FIREBASE_API_KEY, EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
# and EXPO_PUBLIC_FIREBASE_PROJECT_ID with your Firebase project values.

# 3. Start Metro bundler
npm start          # then press i (iOS), a (Android), or w (web)
```

### Client scripts

| Command | Description |
|---|---|
| `npm start` | Start Expo / Metro bundler |
| `npm run ios` | Open in iOS simulator |
| `npm run android` | Open in Android emulator |
| `npm run web` | Open in browser |
| `npm run type-check` | TypeScript type check |
| `npm run lint` | ESLint (zero warnings) |
| `npm run lint:fix` | ESLint with auto-fix |

---

## Server (Node.js / Socket.IO)

```bash
# 1. Install dependencies
cd server
npm install

# 2. Configure environment
cp .env.example .env
# Set DATABASE_URL to your PostgreSQL connection string
# Set JWT_SECRET to a long random string

# 3. Start dev server (hot-reload)
npm run dev        # http://localhost:3001
```

### Server scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (hot-reload) |
| `npm run build` | Compile TypeScript to dist/ |
| `npm start` | Run compiled output |
| `npm test` | Run Jest test suite |
| `npm run type-check` | TypeScript type check |
| `npm run lint` | ESLint (zero warnings) |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run format` | Prettier write |

---

## Environment variables

### Client — `/.env`

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SERVER_URL` | Backend base URL (default `http://localhost:3001`) |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase project API key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |

### Server — `/server/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `PORT` | HTTP port (default `3001`) |
