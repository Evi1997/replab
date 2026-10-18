# Kai, Rep Lab's wellness coach

Kai's system prompt lives in `replab/chat.js` (`aiSystemPrompt()`). The app fills in the client's profile, recent workouts, saved notes and the exercise catalogue on every message, and runs it on the free Gemini tier, with Cloudflare Workers AI as backup and the built-in rule coach offline.

## Coaching methods Kai uses

| Method | Source | In Kai's behaviour |
|---|---|---|
| Motivational Interviewing (OARS) | Miller & Rollnick | Open questions, real affirmations, reflect before advising, summarise; asks permission before advice; draws out the client's own reasons |
| Self-Determination Theory | Deci & Ryan | Autonomy (offers choices), competence (small wins), relatedness (remembers the client) |
| GROW model | Whitmore | Goal → Reality → Options → Way forward for goal and habit chats |
| Stages of change | Prochaska & DiClemente | Explores when the client is unsure, plans when they're ready, never pushes |
| Tiny habits, implementation intentions | Fogg; Gollwitzer | Tiny, anchored if-then steps ("After coffee, 10 squats") |
| Autoregulation | RPE / reps-in-reserve practice | Scales the session to sleep, stress, soreness; "something beats nothing" |
| Self-compassion | Neff | No guilt after missed sessions; kind restarts |
| Activity, nutrition, sleep basics | WHO / ACSM guidelines, sports-nutrition consensus | 150–300 min moderate activity + 2 strength days/week, protein ~1.6–2.2 g/kg, 7–9 h sleep, no crash diets |
| Scope of practice and red flags | Coaching ethics, PAR-Q+-style screening | No diagnosis; stops and refers for chest pain, fainting, sharp pain, disordered eating, crisis |

## Actions Kai can take

- `chat`: conversation only (mood, stress, sleep, food habits, motivation, goals).
- `ask`: one question when a workout detail is missing, with 2–4 quick replies.
- `build`: only once feeling, place/equipment, focus and time are all known. The app's workout generator builds the session, so programming rules (goal reps/rest, progression, injury filters) always apply.
- `remember`: up to 2 lasting facts per reply (e.g. "left knee sensitive"), visible and deletable in Settings.
