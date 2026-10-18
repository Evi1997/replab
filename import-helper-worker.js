// Rep Lab import helper: a free Cloudflare Worker. No AI.
// It expands short TikTok links and reads the public caption of a TikTok or Instagram post,
// so the app can pick out the exercise names. Paste this whole file into a new Worker.
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const HEAD = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'};
const json = (o, status = 200) => new Response(JSON.stringify(o), {status, headers: HEAD});
const clean = s => s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

export default {
  async fetch(req) {
    if (req.method === 'OPTIONS') return new Response(null, {headers: HEAD});
    const url = new URL(req.url).searchParams.get('url') || '';
    if (!/^https:\/\/([\w-]+\.)*(tiktok|instagram)\.com\//.test(url)) return json({error: 'Only TikTok and Instagram links'}, 400);
    try {
      if (url.includes('tiktok.com')) {
        const r = await fetch(url, {redirect: 'follow', headers: {'User-Agent': UA}});
        const id = (r.url.match(/video\/(\d+)/) || url.match(/video\/(\d+)/) || [])[1];
        const o = await (await fetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(id ? `https://www.tiktok.com/@/video/${id}` : url))).json();
        return json({platform: 'tiktok', id, caption: o.title || '', author: o.author_name || '', thumb: o.thumbnail_url || ''});
      }
      const code = (url.match(/\/(?:p|reel|reels|tv)\/([\w-]+)/) || [])[1];
      if (!code) return json({error: 'No post code in link'}, 400);
      const html = await (await fetch(`https://www.instagram.com/p/${code}/embed/captioned/`, {headers: {'User-Agent': UA}})).text();
      const div = html.match(/class="Caption"[^>]*>([\s\S]*?)<div class="CaptionComments"/);
      const raw = html.match(/"caption":"((?:[^"\\]|\\.)*)"/);
      // the embed's caption block starts with the username, so drop that first word
      const caption = div ? clean(div[1]).replace(/^\S+\s*/, '') : raw ? JSON.parse(`"${raw[1]}"`) : '';
      return json({platform: 'instagram', code, caption});
    } catch (e) {
      return json({error: String(e)}, 502);
    }
  },
};
