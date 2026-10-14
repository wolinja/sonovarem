# Sonovarem: frontend

React, Vite and TypeScript, with TanStack Router and Query, Tailwind CSS and shadcn/ui primitives. This is the farmer PWA (T-006 onwards). Setup is in [../development.md](../development.md).

| Command (from the repository root) | What it does |
|---|---|
| `bun install` | Install dependencies |
| `bun run dev` | Vite dev server at <http://localhost:5173> |
| `bun run lint` | Biome check and fix |
| `bun run test:unit` | Vitest: turn state machine, mock adapter, helpers |
| `bun run test` | Playwright journeys (desktop and mobile viewports, fake microphone) |
| `bash scripts/generate-client.sh` | Regenerate `src/client/` from the backend OpenAPI schema |

`bun run build` (from `frontend/`) writes the production build to `backend/app/frontend/`, where FastAPI serves it. Set `VITE_API_URL` in `frontend/.env` to point the dev server at another API.

## Farmer journeys

Every farmer journey in P1-04 (`docs/nexus/phase-1/ux-architecture.md`) works end to end **without the backend**, against a mock API:

| Route | Screen | Mockup |
|---|---|---|
| `/` | S01 Start (audio unlock) | `mockups/J1` |
| `/mode` | S02 Mode picker | `mockups/J1` |
| `/consent`, `/under-18` | S03 Age + consent, S03x exit | `mockups/J1`, `J5` |
| `/microphone` | S04 Microphone explainer, S04d blocked | `mockups/J1`, `J5` |
| `/ask` | S05 voice loop: idle, listening, echo-back, thinking, answer, rating | `mockups/J2` |
| `/ask` | S05 text mode, S05f offline | `mockups/J3` |
| `/ask` | S05b clarify, S05c fallback menu, S05e memory recap, S05g mode switcher, S05h language offer | `mockups/J4` |
| `/sign-in`, `/sign-in/code` | S06 phone and consent, S07 code | `mockups/J3` |
| `/settings`, `/settings/delete` | S08 settings, S09 delete | `mockups/J3`, `J5` |

Error states other than offline (nothing heard, timeout, rate limited, server) have no mockup yet and follow P1-04 §3.3. The team views in `mockups/J6` (S10 rater scoring, S11 operator review) are not built.

## How it is built

```
src/
  api/          contract.ts (REST types, P1-05 §4.2) · events.ts (SSE union, P1-05 §4.3) · port.ts (SonovaremApi)
                mock/ (in-memory adapter, scenarios as data, fixtures) · http/ (stub for the real backend)
  session/      onboarding and consent state (localStorage) and route guards
  audio/        prompt registry (P1-04 §4.3), earcons E0–E5, player, recorder, IndexedDB retry buffer
  features/     onboarding · conversation (machine/ + components/) · auth · settings · shell · dev
  config/       content slots (consent, crops), timers, dev flags
  routes/       thin TanStack Router files
```

Three rules keep it maintainable:

1. **UI code only talks to `SonovaremApi` and the `TurnEvent` union.** Components use `useApi()`; nothing outside `src/api/` imports the mock.
2. **One state machine for S05.** `features/conversation/machine/turnMachine.ts` is a pure reducer of P1-04 §3.1 with unit tests. Its only side effects are in `useTurnDriver.ts`: recording, upload, events, audio, and timers.
3. **Copy and content are data.** Fixed prompts live in `audio/prompts.ts`, keyed by prompt ID, so the Twi recordings slot in later. Consent slots and crop scope live in `config/content.ts`.

## Mock mode

`VITE_API_MODE` is `mock` (the default) or `http`. In mock mode, a **Mock** badge (bottom right) picks the scenario for the next turn. Each scenario is a scripted SSE sequence in `src/api/mock/scenarios.ts`: happy path, explicit confirm, dose answer, clarifying question, I don't know, language mismatch, nothing heard, offline then back, slow, timeout, audio failure, rate limited, and server error. You can also set the scenario in the URL:

```
http://localhost:5173/?scenario=idk&timescale=0.1&audio=off
```

- `timescale` speeds up every timer and mock delay. At 0.05, the 45 s timeout takes about 2 s.
- `audio=off` replaces speech with timed silence.
- No SMS is sent. The code is `123456`, and phone numbers ending in `0000` belong to a returning user with a memory to recap.
- Audio comes from the browser's `speechSynthesis` until the native-speaker recordings exist. Each stand-in is logged as `[audio stand-in]`. A build that still uses stand-ins for fixed prompts is not field-ready (P1-04 §11.4).

## Connecting the real API

1. When the `/v1` routes exist, run `bash scripts/generate-client.sh`, and re-export the generated types from `src/api/contract.ts`.
2. Implement `src/api/http/adapter.ts`. Use the generated SDK for REST, and EventSource on `events_url` for `turns.events`, parsing each frame into a `TurnEvent` and resuming with `Last-Event-ID`.
3. Set `VITE_API_MODE=http`. Screens do not change. The mock scenarios are the expected event sequences, so they double as contract test data for the backend.

## Differences from P1-04 §5 (to fold into P2-06)

- **Visuals follow the J1–J5 mockups**, which are newer than P1-04 §5: Hanken Grotesk + Geist, Material Symbols, green `#0d6840` / `#004e2e` with lime `#a7d649`, and 2rem cards. Tokens are in `src/index.css`.
- **Twi glyphs (OQ-U6):** Hanken Grotesk and Geist lack Ɛ ɛ Ɔ ɔ. Text marked `lang="tw"` uses Noto Sans, which has them.
- **Red is replaced by burnt orange** (the `problem` tokens) everywhere the mockups use `#ffdad6` / `#93000a` / `#ba1a1a`: the "It did not" face, the offline icon, the blocked microphone, and the delete screen and row. This follows P1-04 §5.2 and OQ-U11 (red reads as mourning). It is one token pair in `src/index.css` if the owner decides otherwise.
- **Voice yes/no** (consent and echo-back) needs ASR. For now, the farmer taps. The screens still speak each step. For the same reason the S05e recap leaves out "Say 'tell me more'".
- **Proposed contract additions** (fold into P1-05 §4.2–4.3 before the backend is built): `Citation.page`, `clarify.reason_en`, `FallbackItem.icon` and `MemoryItem.kind`. All are optional, so a backend without them still works.
- **S06 asks for the number and both consent layers on one screen** (mockups/J3), without the separate read-back step in P1-04 §3.4. Each digit is still spoken as it is typed. Memory stays opt-in: no answer counts as no. Recordings "Yes" is disabled until IRB approval (`RECORDINGS_CONSENT_AVAILABLE`).
- **S09 keeps the second confirmation** that the mockup promises ("I will ask you once more"): "Yes, delete everything" leads to "Are you sure?" and "Delete for good".
- **S08 listening switches** are stored on the device (`sv-session.prefs`): "Always wait for me to tap stop" turns off the silence stop, "Always ask me to confirm" turns off the implicit yes, and "Don't play prompts by themselves" silences automatic prompts (taps on Hear this still play). They should move to `PATCH /v1/me` once it exists.
- **Icon font size:** the Material Symbols font is 3.8 MB. Subset it to the icons in use before field builds.
