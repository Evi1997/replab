// Rep Lab coach helper: a free Cloudflare Worker that runs the AI chat coach.
// 1st choice: Google Gemini free tier (secret GEMINI_KEY). Backup: Cloudflare Workers AI free allowance (binding AI).
// Only logged-in Rep Lab users (checked against Supabase) can use it, so nobody else can spend your free allowances.
const SUPA_URL = 'https://gcpzdexdatzyyzumbdcq.supabase.co';
const SUPA_KEY = 'sb_publishable_ChzAdeFs2WhXcVdJckbO7A_VVHVn11Y';
const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-2.5-flash'];
const CF_MODELS = ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-3.1-8b-instruct-fast'];
const HEAD = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json'};
const json = (o, status = 200) => new Response(JSON.stringify(o), {status, headers: HEAD});

async function gemini(env, system, messages){
  for (const model of (env.GEMINI_MODEL ? [env.GEMINI_MODEL] : GEMINI_MODELS)) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: {'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY},
      body: JSON.stringify({
        systemInstruction: {parts: [{text: system}]},
        contents: messages.map(m => ({role: m.role === 'assistant' ? 'model' : 'user', parts: [{text: m.content}]})),
        generationConfig: {responseMimeType: 'application/json', temperature: 0.5, maxOutputTokens: 4096},
      }),
    });
    if (!r.ok) continue;
    const j = await r.json();
    const text = (j.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('');
    if (text) return {text, model};
  }
  return null;
}
async function workersAI(env, system, messages){
  for (const model of CF_MODELS) {
    try {
      const r = await env.AI.run(model, {messages: [{role: 'system', content: system}, ...messages], max_tokens: 700, temperature: 0.4});
      const text = typeof r.response === 'string' ? r.response : JSON.stringify(r.response);
      if (text) return {text, model};
    } catch (e) { /* next model */ }
  }
  return null;
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, {headers: HEAD});
    const path = new URL(req.url).pathname;
    if (req.method !== 'POST' || path !== '/coach') return json({service: 'Rep Lab coach helper', gemini: !!env.GEMINI_KEY, ai: !!env.AI});

    const user = await fetch(`${SUPA_URL}/auth/v1/user`, {headers: {apikey: SUPA_KEY, Authorization: req.headers.get('Authorization') || ''}});
    if (!user.ok) return json({error: 'Log in to Rep Lab to use the AI coach'}, 401);

    let body;
    try { body = await req.json(); } catch (e) { return json({error: 'Bad request'}, 400); }
    const system = String(body.system || '').slice(0, 20000);
    const messages = (Array.isArray(body.messages) ? body.messages : []).slice(-14)
      .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map(m => ({role: m.role, content: m.content.slice(0, 2000)}));
    if (!messages.length) return json({error: 'No message'}, 400);

    try { if (env.GEMINI_KEY) { const g = await gemini(env, system, messages); if (g) return json(g); } } catch (e) { /* fall through */ }
    try { if (env.AI) { const w = await workersAI(env, system, messages); if (w) return json(w); } } catch (e) { /* fall through */ }
    return json({error: 'The AI coach is resting (free allowance may be used up). Try again later.'}, 503);
  },
};
