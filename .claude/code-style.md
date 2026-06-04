# Code Style & Standards

## TypeScript
- `strict: true` — no `any`, narrow `unknown` explicitly
- Functional components + hooks only
- File names: `kebab-case.tsx` for components, `camelCase.ts` for utilities
- Named exports everywhere; default export only for Expo Router screens
- `const` over `let`; never `var`
- Zod for all runtime validation

## Do
- Validate every action server-side before applying
- Broadcast full `GameState` after every action (no diffs)
- Enforce timer with server-side `setTimeout`; clear on every turn change
- Run `pathExists` for BOTH players after every wall placement attempt
- Normalize all edges before storing or comparing
- Write unit tests for every function in `server/game/`
- Keep `server/src/game/` in sync with `shared/game/` after any logic change

## Don't
- Never trust client-reported game state
- Never put game logic in components or Zustand actions
- Never skip the path-existence check on wall placement
- Never allow diagonal movement
- Never allow a wall on a non-adjacent edge pair
- Never allow intersection of two walls

## Testing
- All game logic: Jest unit tests in `server/game/__tests__/`
- Run: `cd server && npx jest`
- Every rule and edge case must have a corresponding test
- A function is not done until its tests pass

## Environment Variables
```
# Client (eas.json env per profile)
EXPO_PUBLIC_SERVER_URL=https://barricade-production.up.railway.app
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
EXPO_PUBLIC_SENTRY_DSN=...

# Server (Railway Variables)
DATABASE_URL=postgresql://... (Neon)
NODE_ENV=production
PORT=3001
SENTRY_DSN=...
```
