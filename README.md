# GeoGebra Voice Tutor 🎙️📐

Click any object in an embedded GeoGebra board and hear it explained in natural
Vietnamese — like a private math tutor.

> Click point **A** → _"Đây là điểm A có tọa độ (2, 3)."_
> Click a circle → _"Đây là đường tròn tâm O bán kính 3."_
> Click an intersection → _"Đây là giao điểm P của hai đường, có tọa độ (1, 4)."_

Built with **Next.js 15 · TypeScript · TailwindCSS · GeoGebra · Google Cloud TTS**.

---

## Design principles

1. **Local-first, low latency.** Most objects (point, line, segment, circle,
   polygon, vector, angle, simple function) are explained by **deterministic
   Vietnamese templates** — zero AI calls, instant text.
2. **AI only where it teaches.** Concepts that benefit from a teaching-style
   explanation (vertex, focus, parabola, ellipse, hyperbola, tangent,
   asymptote, intersection, midpoint, complex functions) are routed to the AI
   in Phase 2.
3. **One roundtrip.** A single `POST /api/geogebra/speak` returns both the
   explanation text and the MP3 audio.
4. **Cache everything.** Identical objects never re-hit AI or TTS.
5. **Graceful degradation.** No TTS key → text only. No AI key → local
   templates. The app always works.

---

## Project structure

```
src/
├─ app/
│  ├─ page.tsx                       # mounts the tutor
│  ├─ layout.tsx · globals.css
│  └─ api/geogebra/speak/route.ts    # merged explain + TTS endpoint
├─ components/
│  ├─ geogebra/
│  │  ├─ GeoGebraApplet.tsx          # deployggb.js loader + click listener
│  │  ├─ GeoGebraTutor.tsx           # UI: board + speaking panel
│  │  └─ useTutorSpeech.ts           # click -> /speak -> play (instant interrupt)
│  └─ audio/AudioManager.ts          # single-voice playback controller
├─ services/
│  ├─ geogebra/
│  │  ├─ classify.ts                 # type + definition + command -> category
│  │  ├─ format.ts                   # speech/coordinate/circle formatting
│  │  ├─ extractObject.ts            # GeoGebra API -> ObjectInfo
│  │  ├─ seedConstruction.ts         # sample construction (evalCommand)
│  │  └─ explainObject.ts            # classify -> cache -> local|AI
│  ├─ ai/
│  │  ├─ localTemplates.ts           # deterministic Vietnamese explanations
│  │  ├─ openrouter.ts               # AI client (dormant until key set)
│  │  └─ prompt.ts                   # system prompt + user message
│  ├─ tts/googleTts.ts               # Google TTS REST (edge-portable)
│  └─ cache/
│     ├─ keys.ts                     # sha256 cache keys
│     ├─ memoryCache.ts              # LRU
│     └─ store.ts                    # process-wide cache singletons
├─ lib/  (config.ts · logger.ts)
└─ types/ (geogebra.ts · api.ts · ggb.ts)
```

---

## Installation

Use **Node 22 LTS** (the repository includes `.nvmrc`) and **pnpm 11.8.0**
(pinned in `package.json`). Node 20–24 is accepted.

```powershell
corepack enable
pnpm install
Copy-Item .env.example .env.local
```

Add a Turso database URL and database auth token to `.env.local`, then bootstrap
a new database and start the app:

```powershell
pnpm setup
pnpm dev
```

Open `http://localhost:3000` for Geometry AI Studio, `/geo-v1` for the legacy
GeoGebra tutor, or `/admin` for content management. All environment variables
are server-side only; do not prefix them with `NEXT_PUBLIC_`.

| Variable | Purpose | Without it |
|----------|---------|------------|
| `GOOGLE_TTS_API_KEY` | Vietnamese speech (vi-VN-Neural2-A) | Text-only, no audio |
| `OPENROUTER_API_KEY` | AI parsing, tutoring, and generated content | Local fallback where available |
| `OPENROUTER_MODEL` | Model id (default `google/gemini-2.0-flash`) | — |
| `OPENROUTER_BASE_URL` | API base url | Defaults to OpenRouter |
| `TTS_VOICE` / `TTS_LANGUAGE` | Voice overrides | Defaults to vi-VN-Neural2-A |
| `DEEPSEEK_API_KEY` | Offline content-maintenance scripts | Runtime unaffected |
| `TURSO_URL` / `TURSO_AUTH_TOKEN` | Shape library, examples, admin data, persistent cache | Main library is unavailable |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | HTTP Basic Auth for `/admin` panel | Admin panel inaccessible |

### Getting a Google TTS API key

1. Enable **Cloud Text-to-Speech API** in Google Cloud Console.
2. Create an **API key** under _Credentials_.
3. **Restrict it** to the Text-to-Speech API (and by HTTP referrer/IP in prod).
4. Put it in `.env.local` as `GOOGLE_TTS_API_KEY`.

---

## Scripts

```bash
pnpm dev              # development server
pnpm setup            # validate env + migrate + seed a new database
pnpm db:migrate       # apply migrations through the Turso HTTP driver
pnpm db:seed          # import 34 shapes and 58 examples
pnpm db:seed-showcase # tune the showcase models
pnpm typecheck        # TypeScript validation
pnpm test             # unit tests
pnpm build            # production build
pnpm check            # typecheck + test + build
pnpm start            # run the production build
```

---

## API

### `POST /api/geogebra/speak`

Request (the click payload; XML is intentionally **not** sent to AI):

```json
{ "name": "A", "type": "point", "value": "(2, 3)", "definition": "Point" }
```

Optional fields: `command`, `level` (`primary` | `secondary` | `highschool`),
`voice`.

Response:

```json
{
  "text": "Đây là điểm A có tọa độ (2, 3).",
  "audioContent": "<base64 mp3, '' if TTS disabled>",
  "category": "point",
  "source": "local"
}
```

`source` is `local`, `ai`, or `cache`.

---

## How classification works

GeoGebra's raw type ("point", "conic", "line") is not enough — an object's
*role* lives in its definition/command. The classifier combines all three:

| Signal | Example | Category | AI? |
|--------|---------|----------|-----|
| command | `Intersect(c, d)` | intersection | ✅ |
| command | `Midpoint(A, B)` | midpoint | ✅ |
| command | `Circle(O, 3)` | circle | ❌ local |
| equation | `x²/9 + y²/4 = 1` | ellipse | ✅ |
| equation | `x² + y² = 25` | circle | ❌ local |
| type | `point` / `line` / `segment` | as-is | ❌ local |
| function | `sin(x)`, `x²-4` | complexFunction | ✅ |
| function | `2x + 1` | simpleFunction | ❌ local |
| _anything unrecognized_ | — | unknown | ✅ (AI-safe) |

---

## Roadmap

- **Phase 1 (done):** GeoGebra embed, click listener, local explanations,
  Google TTS, audio playback with instant interrupt, in-memory LRU cache.
- **Phase 2:** AI explanations via OpenRouter, smart classification routing,
  grade-aware explanation style (`level`).
- **Phase 3:** Cloudflare KV (text) + R2 (audio) durable cache, multi-language,
  hover/drag narration, highlight-while-speaking, quiz/lesson modes.
