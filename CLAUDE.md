# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Barricade – Mobile Game (React Native / Expo)

A 2-player digital Barricade board game. Red vs Blue. Each player moves one piece across a 9×9 grid toward the opponent's starting row, spending turns placing wall segments to block movement. Supports local (hot seat), VS computer (easy/medium/hard AI), and online real-time multiplayer with a configurable per-turn chess clock.

## Common Commands

```bash
# Run game logic unit tests (run from repo root)
cd server && npx jest

# Run a single test file
cd server && npx jest src/game/__tests__/applyMove.test.ts

# Start dev server (backend)
cd server && npm run dev

# Start Expo dev client (frontend)
npx expo start

# Build APK for testing
eas build --profile production --platform android

# Build AAB for Play Store
eas build --profile store --platform android

# TypeScript check (frontend)
npx tsc --noEmit

# TypeScript check (backend)
cd server && npx tsc --noEmit
```

## Key Architectural Notes

- **Game logic lives in two places**: `shared/game/` (used by client for local preview) and `server/src/game/` (authoritative, used by server). These are **separate copies** — after changing `shared/game/`, always `cp` the changed file to `server/src/game/` to keep them in sync.
- **Client is display-only**: The client never applies moves authoritatively — it emits socket events and re-renders from the server's `game_state` broadcast. Local game logic in `shared/game/` is used only for UI preview (wall validity, move highlights).
- **AI entry point**: `shared/game/getComputerMove.ts` — easy uses BFS path-following; medium uses minimax (depth 4, 700ms budget) comparing walls against the committed path move; hard uses deeper full-root minimax (depth 5, 1500ms budget) scoring every root action uniformly.
- **Timer is server-enforced**: `setTimeout` in `server/src/socket/handlers.ts`; client shows countdown only.
- **Zod validation on every socket payload**: handlers reject and emit `error` on schema failure — never trust client-reported state.

@.claude/rules/game-rules.md
@.claude/rules/architecture.md
@.claude/rules/ui.md
@.claude/rules/code-style.md

## When Compacting
Preserve: current task, files changed, failing tests + error messages, unresolved edge cases.
