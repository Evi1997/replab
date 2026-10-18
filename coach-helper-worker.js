// Rep Lab coach helper: a free Cloudflare Worker that runs the AI chat coach on Workers AI's free daily allowance.
// Setup: Worker → Settings → Bindings → Add → Workers AI, variable name "AI". Then paste this whole file and Deploy.
// Only logged-in Rep Lab users (checked against Supabase) can use it, so nobody else can spend your free allowance.
const SUPA_URL = 'https://gcpzdexdatzyyzumbdcq.supabase.co';
const SUPA_KEY = 'sb_publishable_ChzAdeFs2WhXcVdJckbO7A_VVHVn11Y';
const MODELS = ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-3.1-8b-instruct-fast'];
const HEAD = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json'};
const json = (o, status = 200) => new Response(JSON.stringify(o), {status, headers: HEAD});

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, {headers: HEAD});
    const path = new URL(req.url).pathname;
    if (req.method !== 'POST' || path !== '/coach') return json({service: 'Rep Lab coach helper', ai: !!env.AI});

    const user = await fetch(`${SUPA_URL}/auth/v1/user`, {headers: {apikey: SUPA_KEY, Authorization: req.headers.get('Authorization') || ''}});
    if (!user.ok) return json({error: 'Log in to Rep Lab to use the AI coach'}, 401);
    if (!env.AI) return json({error: 'Workers AI is not connected to this Worker yet'}, 503);

    let body;
    try { body = await req.json(); } catch (e) { return json({error: 'Bad request'}, 400); }
    const system = String(body.system || '').slice(0, 16000);
    const messages = (Array.isArray(body.messages) ? body.messages : []).slice(-12)
      .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map(m => ({role: m.role, content: m.content.slice(0, 2000)}));
    if (!messages.length) return json({error: 'No message'}, 400);

    for (const model of MODELS) {
      try {
        const r = await env.AI.run(model, {messages: [{role: 'system', content: system}, ...messages], max_tokens: 700, temperature: 0.4});
        const text = typeof r.response === 'string' ? r.response : JSON.stringify(r.response);
        if (text) return json({text, model});
      } catch (e) { /* try the next, smaller model (e.g. daily allowance used up) */ }
    }
    return json({error: 'The AI coach is resting (free daily allowance may be used up). Try again later.'}, 503);
  },
};
