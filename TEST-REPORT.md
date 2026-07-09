# Prófunarskýrsla – Salka Horror Hotel v3 online

Dagsetning: 2026-07-09

## Staðfest

### Framendi

- JavaScript-setningafræði stóðst `node --check`.
- HTML/JavaScript var keyrt í hermdu vafraumhverfi með Canvas- og Audio-stubbum.
- Aðalvalmynd og staðbundinn einspilunarleikur ræstust án upphafsvillu.
- Netspilunarviðmótið var ræst með hermdu API og WebSocket.
- `welcome`-skilaboð stofnuðu biðherbergi.
- `start`-skilaboð ræstu netleik með tveimur leikmönnum.

### Cloudflare Worker

- Worker-setningafræði stóðst `node --check`.
- `wrangler deploy --dry-run` staðfesti:
  - static assets;
  - `GAME_ROOMS` Durable Object binding;
  - `GameRoom` SQLite migration;
  - Worker entry point.

### Staðbundið API- og WebSocket-próf

Prófið keyrði gegn `wrangler dev --local` og staðfesti:

1. `POST /api/rooms` stofnaði herbergi og skilaði sex stafa kóða.
2. Gestgjafi tengdist WebSocket og fékk slot 0.
3. Annar leikmaður tengdist og fékk slot 1.
4. Gestgjafi sendi `start`; báðir fengu sama seed og stillingar.
5. Leikmannsstaða gests var miðluð til gestgjafa.
6. Stöðumynd gestgjafa var miðluð til gests.
7. Þegar gestgjafi aftengdist tók hinn leikmaðurinn sjálfkrafa við.

## Ekki fullprófað hér

- Heill leikur frá byrjun til flótta á tveimur raunverulegum tækjum.
- Nethegðun á hægu eða óstöðugu farsímaneti.
- iPhone Safari og Android Chrome með tveimur eða fleiri raunverulegum notendum.
- Fjórir samtímis tengdir leikmenn.
- Langvarandi leikjalota og endurtenging eftir margra mínútna sambandsrof.

Því er útgáfan tæknilega tilbúin til birtingar og fyrstu notendaprófunar, en hún
ætti að teljast v3 beta þar til Salka og annar leikmaður hafa lokið heilum leik
á tveimur aðskildum tækjum.
