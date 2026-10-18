<p align="center"><img src="replab/icon-192.png" width="96" alt="Rep Lab icon"></p>

# Rep Lab

A personal trainer in your pocket: ready-made, goal-tuned workouts, smart progression, structured programs, calisthenics skill paths and **Kai**, a friendly AI wellness coach. Built to be **free to run**: no paid AI, no subscriptions.

---

## Features

| | |
|---|---|
| **Today** | One "Up next" workout from your plan or program, quick actions, this week's progress |
| **Onboarding & coach plan** | Goal (lean & toned, lose fat, build muscle, strength, athletic), body stats, experience and days/week, giving calorie, protein and macro targets and a weekly split |
| **Workouts** | 58 hand-built workouts across 11 categories, plus a **generator** (coach-style movement templates × equipment × 6 formats: classic, supersets, circuit, 5×5, pump, pyramid) |
| **Goal-tuned programming** | Sets, reps and rest re-prescribed for your goal; time trimming (30/45/60 min) |
| **Logging** | Hevy-style set logging, previous numbers, double-progression suggestions, rest timer, PRs |
| **Swaps that keep the benefit** | Curated "same benefit" equivalents for every machine/cable exercise, ranked by muscles worked, with equipment filters and search |
| **Programs** | 7 multi-week programs (4–12 weeks) with Base → Build → Push → Deload phases |
| **Skill paths** | 9 calisthenics progressions from zero (handstand, muscle-up, front lever, planche…) |
| **Coach check-ins** | Every 2 weeks: weight trend vs. goal → calorie adjustments, deload weeks, schedule changes |
| **Kai, AI coach** | Conversational wellness coach (Motivational Interviewing, SDT, GROW, tiny habits, autoregulation, safety). Remembers lasting facts. See [`coach-prompt.md`](coach-prompt.md) |
| **Body tracking** | Weigh-ins and gym body-scan results (body fat, muscle mass, waist) |
| **Account & sync** | Email login, cloud backup and restore on any device |
| **Offline** | Works offline in the gym (service worker, bundled exercise photos) |

## How it's built

- **Vanilla JavaScript PWA.** No framework, no build step. Everything is in [`replab/`](replab).
- **No AI cost.** Kai runs on Google Gemini's free tier through a Cloudflare Worker, with Cloudflare Workers AI as backup. Everything else (generator, progression, check-ins, swaps) is rule-based and runs on the device.
- **iPhone app** via [Capacitor](https://capacitorjs.com), wrapping the same web files ([`ios/`](ios)).

```
replab/            the app (served by GitHub Pages)
  index.html       layout + styles
  app.js           screens, navigation, logging, swaps, search
  data.js          exercise library, workouts, skills
  gen.js           workout generator, formats, equivalent-exercise swaps
  coach.js         onboarding, goals, nutrition targets, coach plan
  program.js       multi-week programs and two-weekly check-ins
  chat.js          Kai, the chat coach (AI + offline rule-based fallback)
  cloud.js         login + cloud sync (Supabase REST)
  demos.js, img/   exercise photos and instructions
  sw.js            offline cache (bump VERSION on every change)
coach-helper-worker.js   Cloudflare Worker that runs Kai (Gemini → Workers AI)
coach-prompt.md          coaching methods behind Kai
ios/                     Capacitor iOS project
```

## Services (all on free tiers)

| Service | Used for | Setup |
|---|---|---|
| **GitHub Pages** | Hosting the web app | Settings → Pages → `main` / root |
| **Supabase** | Login + cloud backup | Table `replab_data` (one JSON row per user, row-level security). URL and publishable key are in `replab/cloud.js` |
| **Cloudflare Workers** | Kai's helper | Paste `coach-helper-worker.js`; add secret `GEMINI_KEY` and the Workers AI binding `AI` |
| **Google AI Studio** | Gemini API key (free tier) | aistudio.google.com → Get API key |

> The Supabase key in the code is the *publishable* key, which is designed to be public. Data is protected per user by row-level security. Never commit the Supabase `service_role` key or the Gemini key.

## Development

```bash
# run locally
python3 -m http.server 8766 --directory replab
```

Workflow for every change:
1. Edit files in `replab/`.
2. Bump `VERSION` in `replab/sw.js` so installed apps pick up the update.
3. Commit and push. GitHub Pages updates the web app in about a minute.
4. Update the iPhone app (below).

## iPhone app

Requires Xcode, Node.js and an Apple ID signed in to Xcode.

```bash
npm install
npm run ios:install    # sync web files, build, sign, install on a connected or Wi-Fi-paired iPhone
```

With a free Apple ID the app must be reinstalled every 7 days (run the command again). The iPhone needs Developer Mode on, and the developer trusted under *Settings → General → VPN & Device Management*. The paid Apple Developer Program removes this limit and allows TestFlight and the App Store.

## Credits

- Exercise photos and instructions: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain / Unlicense).
- Workouts, programs, coaching rules and Kai's prompt: written for Rep Lab.

*General fitness guidance, not medical advice.*
