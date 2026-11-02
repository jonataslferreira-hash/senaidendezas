// Generated from cloudflare/r2-worker.js. Paste this entire file into the Cloudflare Worker editor.
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// collaboration-worker.js
var uuid = "[a-f0-9-]{36}";
var esc = /* @__PURE__ */ __name((value) => String(value || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]), "esc");
async function handleCollaboration(request, env, user, headers, rpc) {
  const path = new URL(request.url).pathname, json = /* @__PURE__ */ __name((value, status = 200) => Response.json(value, { status, headers }), "json");
  if (path === "/collaboration/status") {
    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);
    try {
      const enabled = await rpc("sl_group_access", { p_group_id: "00000000-0000-0000-0000-000000000000" });
      if (typeof enabled !== "boolean") throw Error();
      return json({ ready: true, emailConfigured: Boolean(env.RESEND_API_KEY && env.INVITE_FROM) });
    } catch {
      return json({ error: "groups_not_configured" }, 503);
    }
  }
  const file = new RegExp(`^/groups/(${uuid})/(${uuid})$`, "i").exec(path);
  const avatar = new RegExp(`^/groups/(${uuid})/avatars/(${uuid})$`, "i").exec(path);
  if (!file && !avatar && path !== "/collaboration/invite") return null;
  if (path === "/collaboration/invite") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const reader = request.body?.getReader();
    let size = 0, chunks = [];
    if (!reader) return json({ error: "invalid_request" }, 400);
    try {
      for (; ; ) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 4096) {
          await reader.cancel();
          return json({ error: "too_large" }, 413);
        }
        chunks.push(value);
      }
      const body = JSON.parse(await new Blob(chunks).text());
      if (!new RegExp(`^${uuid}$`, "i").test(body.documentId) || typeof body.email !== "string" || body.email.length > 254) return json({ error: "invalid_request" }, 400);
      const invite = body.role ? await rpc("sl_invite_with_role", { p_document_id: body.documentId, p_email: body.email, p_role: body.role }) : await rpc("sl_invite_collaborator", { p_document_id: body.documentId, p_email: body.email });
      const link = new URL(env.SITE_URL || "https://jonataslferreira-hash.github.io/senaidendezas/");
      link.searchParams.set("invite", invite.token);
      if (!env.RESEND_API_KEY || !env.INVITE_FROM) return json({ sent: false, link: link.href, reason: "email_not_configured" });
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ from: env.INVITE_FROM, to: [invite.email], subject: "Convite para colaborar: " + invite.title, html: `<h2>Vamos criar uma aula juntos?</h2><p>${esc(user.user_metadata?.display_name || "Um professor")} convidou voc\xEA para editar <strong>${esc(invite.title)}</strong>.</p><p><a href="${esc(link.href)}">Abrir aula compartilhada</a></p><p>Entre ou crie uma conta usando este mesmo e-mail. O convite expira em 7 dias.</p>` }), signal: AbortSignal.timeout(1e4) });
      return json({ sent: response.ok, link: link.href, ...!response.ok ? { reason: "email_delivery_failed" } : {} });
    } catch {
      return json({ error: "invitation_failed" }, 403);
    }
  }
  const groupId = (file || avatar)[1].toLowerCase();
  try {
    if (await rpc("sl_group_access", { p_group_id: groupId }) !== true) return json({ error: "forbidden" }, 403);
  } catch {
    return json({ error: "groups_not_configured" }, 503);
  }
  if (!env.FILES) return json({ error: "storage_not_configured" }, 503);
  const key = avatar ? avatar[2].toLowerCase() + "/profile/avatar" : `groups/${groupId}/${file[2].toLowerCase()}`;
  try {
    if (!avatar && ["PUT", "DELETE"].includes(request.method) && await rpc("sl_group_edit_access", { p_group_id: groupId }) !== true) return json({ error: "forbidden" }, 403);
    if (avatar && await rpc("sl_group_contains_user", { p_group_id: groupId, p_user_id: avatar[2].toLowerCase() }) !== true) return json({ error: "forbidden" }, 403);
    if (request.method === "GET") {
      const object2 = await env.FILES.get(key);
      if (!object2) return json({ error: "not_found" }, 404);
      const responseHeaders = new Headers(headers);
      responseHeaders.set("Content-Type", object2.httpMetadata?.contentType || (avatar ? "image/webp" : "application/json"));
      if (!avatar && object2.customMetadata?.format === "gzip") responseHeaders.set("Content-Encoding", "gzip");
      return new Response(object2.body, { headers: responseHeaders, encodeBody: "manual" });
    }
    if (!avatar && request.method === "DELETE") {
      if (await rpc("sl_revision_unused", { p_group_id: groupId, p_revision: file[2].toLowerCase() }) !== true) return json({ error: "revision_in_use" }, 409);
      await env.FILES.delete(key);
      return json({ ok: true });
    }
    if (avatar || request.method !== "PUT") return json({ error: "method_not_allowed" }, 405);
    const length = Number(request.headers.get("Content-Length")), type = request.headers.get("Content-Type");
    if (!Number.isSafeInteger(length) || length < 1 || length > 50 * 1024 * 1024) return json({ error: "invalid_size" }, 413);
    if (!["application/json", "application/gzip"].includes(type)) return json({ error: "invalid_type" }, 415);
    const object = await env.FILES.put(key, request.body, { onlyIf: { etagDoesNotMatch: "*" }, httpMetadata: { contentType: "application/json" }, customMetadata: { format: type === "application/gzip" ? "gzip" : "raw" } });
    return object ? json({ ok: true }) : json({ error: "revision_exists" }, 409);
  } catch {
    return json({ error: "storage_unavailable" }, 503);
  }
}
__name(handleCollaboration, "handleCollaboration");

// music-worker.js
async function handleMusic(request, env, headers) {
  if (new URL(request.url).pathname !== "/music/spotify") return null;
  const json = /* @__PURE__ */ __name((body, status = 200) => Response.json(body, { status, headers }), "json");
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (Number(request.headers.get("Content-Length")) > 1024) return json({ error: "too_large" }, 413);
  try {
    const text = await request.text();
    if (text.length > 1024) return json({ error: "too_large" }, 413);
    const { id } = JSON.parse(text);
    if (!/^[A-Za-z0-9]{22}$/.test(id)) return json({ error: "invalid_track" }, 400);
    const response = await fetch("https://open.spotify.com/oembed?url=" + encodeURIComponent("https://open.spotify.com/track/" + id), { signal: AbortSignal.timeout(1e4) });
    if (!response.ok) return json({ error: "spotify_unavailable" }, 502);
    const info = await response.json(), result = { title: String(info.title || "M\xFAsica no Spotify").slice(0, 200), cover: typeof info.thumbnail_url === "string" && info.thumbnail_url.startsWith("https://") ? info.thumbnail_url : "", artist: "No Spotify" };
    if (env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET) {
      try {
        const auth = await fetch("https://accounts.spotify.com/api/token", { method: "POST", headers: { Authorization: "Basic " + btoa(env.SPOTIFY_CLIENT_ID + ":" + env.SPOTIFY_CLIENT_SECRET), "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials", signal: AbortSignal.timeout(8e3) }), token = await auth.json();
        if (token.access_token) {
          const trackResponse = await fetch("https://api.spotify.com/v1/tracks/" + id, { headers: { Authorization: "Bearer " + token.access_token }, signal: AbortSignal.timeout(8e3) });
          if (trackResponse.ok) {
            const track = await trackResponse.json();
            result.artist = (track.artists || []).map((a) => a.name).join(", ").slice(0, 200);
            result.duration = track.duration_ms;
          }
        }
      } catch {
      }
    }
    return json(result);
  } catch {
    return json({ error: "spotify_unavailable" }, 502);
  }
}
__name(handleMusic, "handleMusic");

// presentation-worker.js
var tokenPattern = /^\/presentations\/([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/i;
async function readPublicPresentation(request, env, headers) {
  const match = tokenPattern.exec(new URL(request.url).pathname);
  if (!match || request.method !== "GET") return null;
  const json = /* @__PURE__ */ __name((body, status) => Response.json(body, { status, headers }), "json");
  if (!env.FILES) return json({ error: "storage_not_configured" }, 503);
  try {
    const object = await env.FILES.get("presentations/" + match[1].toLowerCase());
    if (!object) return json({ error: "not_found" }, 404);
    const result = new Headers(headers);
    result.set("Content-Type", "application/json");
    if (object.customMetadata?.format === "gzip") result.set("Content-Encoding", "gzip");
    return new Response(object.body, { headers: result, encodeBody: "manual" });
  } catch {
    return json({ error: "storage_unavailable" }, 503);
  }
}
__name(readPublicPresentation, "readPublicPresentation");
async function writePublicPresentation(request, env, user, headers) {
  const path = new URL(request.url).pathname, match = tokenPattern.exec(path), json = /* @__PURE__ */ __name((body, status = 200) => Response.json(body, { status, headers }), "json");
  if (path !== "/presentations" && !match) return null;
  if (!env.FILES) return json({ error: "storage_not_configured" }, 503);
  try {
    if (request.method === "POST" && path === "/presentations") {
      const length = Number(request.headers.get("Content-Length")), type = request.headers.get("Content-Type");
      if (!Number.isSafeInteger(length) || length < 1 || length > 50 * 1024 * 1024) return json({ error: "invalid_size" }, 413);
      if (!["application/json", "application/gzip"].includes(type)) return json({ error: "invalid_type" }, 415);
      const token = crypto.randomUUID();
      await env.FILES.put("presentations/" + token, request.body, { httpMetadata: { contentType: "application/json" }, customMetadata: { owner: user.id, format: type === "application/gzip" ? "gzip" : "raw" } });
      return json({ token }, 201);
    }
    if (request.method === "DELETE" && match) {
      const key = "presentations/" + match[1].toLowerCase(), object = await env.FILES.head(key);
      if (!object) return json({ error: "not_found" }, 404);
      if (object.customMetadata?.owner !== user.id) return json({ error: "forbidden" }, 403);
      await env.FILES.delete(key);
      return json({ ok: true });
    }
    return json({ error: "method_not_allowed" }, 405);
  } catch {
    return json({ error: "storage_unavailable" }, 503);
  }
}
__name(writePublicPresentation, "writePublicPresentation");

// r2-worker.js
var MAX_FILE = 50 * 1024 * 1024;
var defaults = ["https://jonataslferreira-hash.github.io", "http://localhost:5173", "http://127.0.0.1:5173"];
function createR2Handler(verifyUser = async (token, env) => {
  const response = await fetch((env.SUPABASE_URL || "https://qkpgiwjsqtocvjmqinii.supabase.co") + "/auth/v1/user", { headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_-CT7iCR3355qijcVioyRkA_-Njn3Q4e", Authorization: "Bearer " + token }, signal: AbortSignal.timeout(1e4) });
  if (!response.ok) throw Error("unauthorized");
  return response.json();
}, callRpc = async (token, env, name, args) => {
  const response = await fetch((env.SUPABASE_URL || "https://qkpgiwjsqtocvjmqinii.supabase.co") + "/rest/v1/rpc/" + name, { method: "POST", headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_-CT7iCR3355qijcVioyRkA_-Njn3Q4e", Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify(args), signal: AbortSignal.timeout(1e4) });
  if (!response.ok) throw Error("rpc_failed");
  return response.json();
}) {
  return /* @__PURE__ */ __name(async function handle(request, env) {
    const origin = request.headers.get("Origin"), allowed = (env.ALLOWED_ORIGINS || defaults.join(",")).split(",").map((s) => s.trim());
    if (origin && !allowed.includes(origin)) return new Response("Origin not allowed", { status: 403 });
    const headers = { "Access-Control-Allow-Origin": origin || allowed[0], "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Authorization,Content-Type,X-Lesson-Title,X-Original-Bytes", "Cache-Control": "private, no-store", Vary: "Origin" };
    const json = /* @__PURE__ */ __name((body, status = 200) => Response.json(body, { status, headers }), "json");
    if (new URL(request.url).pathname === "/health" && request.method === "GET") return json({ version: 4, collaboration: true, animatedAvatars: true, roles: true, people: true });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    const publicPresentation = await readPublicPresentation(request, env, headers);
    if (publicPresentation) return publicPresentation;
    const token = /^Bearer ([A-Za-z0-9_.-]{20,16384})$/.exec(request.headers.get("Authorization") || "")?.[1];
    if (!token) return json({ error: "unauthorized" }, 401);
    let user;
    try {
      user = await verifyUser(token, env);
    } catch {
      return json({ error: "unauthorized" }, 401);
    }
    if (!user || !/^[a-f0-9-]{36}$/i.test(user.id) || !user.email_confirmed_at || user.is_anonymous) return json({ error: "unauthorized" }, 401);
    const person = /^\/people\/([a-f0-9-]{36})\/avatar$/i.exec(new URL(request.url).pathname);
    if (person) {
      if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);
      try {
        const uid = person[1].toLowerCase();
        if (await callRpc(token, env, "sl_profile_access", { p_user_id: uid }) !== true) return json({ error: "forbidden" }, 403);
        const object = await env.FILES?.get(uid + "/profile/avatar");
        if (!object) return json({ error: "not_found" }, 404);
        return new Response(object.body, { headers: { ...headers, "Content-Type": object.httpMetadata?.contentType || "image/webp" } });
      } catch {
        return json({ error: "profiles_not_configured" }, 503);
      }
    }
    const published = await writePublicPresentation(request, env, user, headers);
    if (published) return published;
    const music = await handleMusic(request, env, headers);
    if (music) return music;
    const collaboration = await handleCollaboration(request, env, user, headers, (name, args) => callRpc(token, env, name, args));
    if (collaboration) return collaboration;
    if (!env.FILES) return json({ error: "storage_not_configured" }, 503);
    const url = new URL(request.url), avatar = url.pathname === "/profile/avatar", match = /^\/lessons\/([a-zA-Z0-9_-]{1,100})$/.exec(url.pathname);
    try {
      if (url.pathname === "/lessons" && request.method === "GET") {
        const items = [];
        let cursor;
        do {
          const page = await env.FILES.list({ prefix: user.id + "/lessons/", include: ["customMetadata"], limit: 100, cursor });
          for (const object of page.objects) items.push({ path: "r2:" + object.key.split("/").pop(), title: object.customMetadata?.title || "Minha aula", bytes: object.size, updatedAt: object.uploaded.toISOString() });
          cursor = page.truncated ? page.cursor : void 0;
        } while (cursor && items.length < 500);
        return json(items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      }
      if (!avatar && !match) return json({ error: "not_found" }, 404);
      const key = user.id + (avatar ? "/profile/avatar" : "/lessons/" + match[1]);
      if (request.method === "GET") {
        const object = await env.FILES.get(key);
        if (!object) return json({ error: "not_found" }, 404);
        const responseHeaders = new Headers(headers);
        responseHeaders.set("Content-Type", object.httpMetadata?.contentType || (avatar ? "image/webp" : "application/json"));
        if (!avatar && object.customMetadata?.format === "gzip") responseHeaders.set("Content-Encoding", "gzip");
        return new Response(object.body, { headers: responseHeaders, encodeBody: "manual" });
      }
      if (avatar && request.method === "DELETE") {
        await env.FILES.delete(key);
        return json({ ok: true });
      }
      if (request.method !== "PUT") return json({ error: "method_not_allowed" }, 405);
      const length = Number(request.headers.get("Content-Length")), type = request.headers.get("Content-Type");
      if (!Number.isSafeInteger(length) || length < 1) return json({ error: "content_length_required" }, 411);
      if (length > (avatar ? 256 * 1024 : MAX_FILE)) return json({ error: "too_large" }, 413);
      if (!(avatar ? ["image/webp", "image/png", "image/jpeg", "image/gif"] : ["application/json", "application/gzip"]).includes(type)) return json({ error: "invalid_type" }, 415);
      let title = "Minha aula";
      try {
        title = decodeURIComponent(request.headers.get("X-Lesson-Title") || title).slice(0, 140);
      } catch {
        return json({ error: "invalid_title" }, 400);
      }
      await env.FILES.put(key, request.body, { httpMetadata: { contentType: avatar ? type : "application/json" }, customMetadata: { title, format: type === "application/gzip" ? "gzip" : "raw" } });
      return json({ ok: true });
    } catch {
      return json({ error: "storage_unavailable" }, 503);
    }
  }, "handle");
}
__name(createR2Handler, "createR2Handler");
var r2_worker_default = { fetch: createR2Handler() };
export {
  createR2Handler,
  r2_worker_default as default
};
