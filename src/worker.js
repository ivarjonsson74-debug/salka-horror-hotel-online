import { DurableObject } from "cloudflare:workers";

const CODE_CHARS = "ABCDEFGHJKMNPQRTUVWXYZ";
const MAX_PLAYERS = 4;
const ROOM_TTL_MS = 30 * 60 * 1000;

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}
function safeName(value) {
  return String(value || "Gestur").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 16) || "Gestur";
}
function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}
function randomSecret() {
  return crypto.randomUUID().replaceAll("-", "");
}
function securityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  headers.set("permissions-policy", "camera=(), geolocation=(), microphone=(), payment=(), usb=(), fullscreen=(self), gamepad=(self)");
  headers.set("content-security-policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; media-src 'self' blob: data:; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'; worker-src 'self' blob:");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function serveAsset(request, env) {
  const response = await env.ASSETS.fetch(request);
  const contentType = response.headers.get("content-type") || "";
  if (response.ok && contentType.includes("text/html")) {
    let html = await response.text();
    if (!html.includes("/online-fixes.js")) {
      html = html.replace("</body>", '<script src="/online-fixes.js?v=1"></script></body>');
    }
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.set("cache-control", "no-cache");
    return securityHeaders(new Response(html, { status: response.status, statusText: response.statusText, headers }));
  }
  return securityHeaders(response);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") return json({ ok: true, service: "salka-horror-hotel-online" });

    if (url.pathname === "/api/rooms" && request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch (_) {}
      for (let attempt = 0; attempt < 12; attempt++) {
        const code = randomCode();
        const creatorKey = randomSecret();
        const id = env.GAME_ROOMS.idFromName(code);
        const room = env.GAME_ROOMS.get(id);
        const created = await room.fetch("https://room.internal/create", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code, creatorKey, creatorName: safeName(body.name) }),
        });
        if (created.status === 201) return json({ code, creatorKey }, { status: 201 });
      }
      return json({ error: "Ekki tókst að búa til herbergi. Reyndu aftur." }, { status: 503 });
    }

    const match = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})(\/ws)?$/);
    if (match) {
      const code = match[1];
      const id = env.GAME_ROOMS.idFromName(code);
      const room = env.GAME_ROOMS.get(id);
      if (match[2] === "/ws") {
        if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
          return json({ error: "WebSocket-tenging krafist." }, { status: 426 });
        }
        const origin = request.headers.get("origin");
        if (origin && new URL(origin).host !== url.host) return json({ error: "Óleyfilegur uppruni." }, { status: 403 });
        const forwarded = new URL("https://room.internal/ws");
        for (const key of ["name", "clientId", "creatorKey"]) {
          const value = url.searchParams.get(key); if (value) forwarded.searchParams.set(key, value);
        }
        return room.fetch(new Request(forwarded, request));
      }
      if (request.method === "GET") return room.fetch("https://room.internal/status");
    }

    if (url.pathname.startsWith("/api/")) return json({ error: "API-leið fannst ekki." }, { status: 404 });
    return serveAsset(request, env);
  },
};

export class GameRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
    this.room = null;
    this.ready = ctx.blockConcurrencyWhile(async () => {
      this.room = (await ctx.storage.get("room")) || null;
    });
  }

  async fetch(request) {
    await this.ready;
    const url = new URL(request.url);
    if (url.pathname === "/create" && request.method === "POST") return this.create(request);
    if (url.pathname === "/status") return this.status();
    if (url.pathname === "/ws") return this.connect(request);
    return json({ error: "Leið fannst ekki." }, { status: 404 });
  }

  async create(request) {
    if (this.room && Date.now() - this.room.createdAt < ROOM_TTL_MS) return json({ error: "Herbergi er þegar til." }, { status: 409 });
    const data = await request.json();
    this.room = {
      code: data.code,
      creatorKey: data.creatorKey,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      phase: "lobby",
      hostId: null,
      game: null,
      players: [],
    };
    await this.ctx.storage.put("room", this.room);
    return json({ ok: true }, { status: 201 });
  }

  status() {
    if (!this.room) return json({ error: "Herbergið fannst ekki." }, { status: 404 });
    return json({
      code: this.room.code,
      phase: this.room.phase,
      players: this.room.players.filter((p) => p.connected).length,
      capacity: MAX_PLAYERS,
    });
  }

  publicPlayers() {
    return this.room.players.map(({ id, name, slot, connected }) => ({
      id, name, slot, connected: !!connected, host: id === this.room.hostId,
    }));
  }

  async connect(request) {
    if (!this.room) return json({ error: "Herbergið fannst ekki." }, { status: 404 });
    const url = new URL(request.url);
    const name = safeName(url.searchParams.get("name"));
    const requestedId = String(url.searchParams.get("clientId") || "").slice(0, 64);
    const creatorKey = url.searchParams.get("creatorKey") || "";

    let player = requestedId ? this.room.players.find((p) => p.id === requestedId) : null;
    if (!player) {
      if (!this.room.hostId) {
        if (creatorKey !== this.room.creatorKey) return json({ error: "Gestgjafalykill vantar." }, { status: 403 });
      } else if (this.room.phase !== "lobby") {
        return json({ error: "Leikurinn er þegar hafinn." }, { status: 409 });
      }
      if (this.room.players.length >= MAX_PLAYERS) return json({ error: "Herbergið er fullt." }, { status: 409 });
      const used = new Set(this.room.players.map((p) => p.slot));
      let slot = 0; while (used.has(slot)) slot++;
      player = { id: crypto.randomUUID(), name, slot, connected: false, joinedAt: Date.now() };
      this.room.players.push(player);
      if (!this.room.hostId) this.room.hostId = player.id;
    } else {
      player.name = name;
    }
    player.connected = true;
    delete player.disconnectedAt;

    // Close an older socket for the same client before attaching the new one.
    for (const old of this.ctx.getWebSockets()) {
      const a = old.deserializeAttachment();
      if (a?.clientId === player.id) { try { old.close(4001, "reconnected"); } catch (_) {} }
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    this.room.updatedAt = Date.now();
    const attachment = { clientId: player.id, slot: player.slot };
    server.serializeAttachment(attachment);
    await this.ctx.storage.put("room", this.room);

    server.send(JSON.stringify({
      type: "welcome",
      clientId: player.id,
      slot: player.slot,
      host: player.id === this.room.hostId,
      roomCode: this.room.code,
      phase: this.room.phase,
      game: this.room.game,
      players: this.publicPlayers(),
    }));
    this.broadcast({ type: "presence", hostId: this.room.hostId, players: this.publicPlayers() });
    return new Response(null, { status: 101, webSocket: client });
  }

  socketForClient(clientId) {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws.deserializeAttachment()?.clientId === clientId) return ws;
    }
    return null;
  }

  send(ws, message) {
    try { ws.send(JSON.stringify(message)); } catch (_) {}
  }

  broadcast(message, exceptClientId = null) {
    const encoded = JSON.stringify(message);
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment();
      if (!exceptClientId || a?.clientId !== exceptClientId) {
        try { ws.send(encoded); } catch (_) {}
      }
    }
  }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== "string" || raw.length > 48_000) return;
    let message;
    try { message = JSON.parse(raw); } catch (_) { return; }
    const sender = ws.deserializeAttachment();
    if (!sender || !this.room) return;
    const isHost = sender.clientId === this.room.hostId;

    if (message.type === "start" && isHost) {
      const connected = this.room.players.filter((p) => p.connected).length;
      if (connected < 2) return this.send(ws, { type: "error", message: "Að minnsta kosti tveir þurfa að vera tengdir." });
      const game = message.game || {};
      this.room.phase = "play";
      this.room.game = {
        seed: Number.isFinite(game.seed) ? Math.trunc(game.seed) : 10000 + Math.floor(Math.random() * 89999),
        diff: Math.max(0, Math.min(2, Math.trunc(game.diff || 0))),
        soft: !!game.soft,
      };
      this.room.updatedAt = Date.now();
      await this.ctx.storage.put("room", this.room);
      return this.broadcast({ type: "start", game: this.room.game });
    }

    if (message.type === "player" && !isHost) {
      const host = this.socketForClient(this.room.hostId);
      if (host) this.send(host, { type: "player", slot: sender.slot, state: message.state || {}, actions: message.actions || {} });
      return;
    }

    if (message.type === "snapshot" && isHost) {
      return this.broadcast({ type: "snapshot", snapshot: message.snapshot }, sender.clientId);
    }

    if (message.type === "broadcast" && isHost) {
      return this.broadcast({ type: "payload", payload: message.payload }, sender.clientId);
    }

    if (message.type === "target" && isHost) {
      const target = this.room.players.find((p) => p.slot === Number(message.slot));
      const socket = target ? this.socketForClient(target.id) : null;
      if (socket) this.send(socket, { type: "payload", payload: message.payload });
      return;
    }

    if (message.type === "pause" && isHost) {
      return this.broadcast({ type: "pause", paused: !!message.paused }, sender.clientId);
    }

    if (message.type === "ping") this.send(ws, { type: "pong", at: Date.now() });
  }

  async webSocketClose(ws, code, reason) {
    const a = ws.deserializeAttachment();
    if (!a || !this.room) return;

    // When a client reconnects, closing the older socket must not mark the
    // newly attached socket as disconnected.
    if (code === 4001 && reason === "reconnected") return;

    const player = this.room.players.find((p) => p.id === a.clientId);
    if (!player) return;
    const intentionalLeave = code === 1000 && reason === "leave";
    const wasHost = this.room.hostId === player.id;

    if (intentionalLeave) {
      this.room.players = this.room.players.filter((p) => p.id !== player.id);
      if (!this.room.players.length) {
        this.room = null;
        await this.ctx.storage.deleteAll();
        return;
      }
    } else {
      player.connected = false;
      player.disconnectedAt = Date.now();
    }

    if (wasHost) {
      const replacement = this.room.players
        .filter((p) => p.connected)
        .sort((x, y) => x.slot - y.slot)[0];
      if (replacement) {
        this.room.hostId = replacement.id;
        this.broadcast({ type: "host_changed", hostId: replacement.id, hostName: replacement.name, players: this.publicPlayers() });
      } else if (intentionalLeave) {
        const fallback = this.room.players.slice().sort((x, y) => x.slot - y.slot)[0];
        this.room.hostId = fallback ? fallback.id : null;
      }
      // On an unexpected disconnect with no replacement, the host keeps the
      // role and can reconnect with the same clientId.
    }

    if (this.room.hostId && !this.room.players.some((p) => p.id === this.room.hostId)) {
      const replacement = this.room.players
        .slice()
        .sort((x, y) => Number(y.connected) - Number(x.connected) || x.slot - y.slot)[0];
      this.room.hostId = replacement ? replacement.id : null;
    }

    this.room.updatedAt = Date.now();
    await this.ctx.storage.put("room", this.room);
    this.broadcast({ type: "presence", hostId: this.room.hostId, players: this.publicPlayers() });
    if (!this.room.players.some((p) => p.connected)) await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
  }

  async webSocketError(ws) {
    try { ws.close(1011, "websocket error"); } catch (_) {}
  }

  async alarm() {
    if (!this.room || this.room.players.some((p) => p.connected)) return;
    if (Date.now() - this.room.updatedAt >= ROOM_TTL_MS) {
      this.room = null;
      await this.ctx.storage.deleteAll();
    } else {
      await this.ctx.storage.setAlarm(this.room.updatedAt + ROOM_TTL_MS);
    }
  }
}
