# Salka Horror Hotel v3 – netspilun á Cloudflare

Þessi útgáfa sameinar leikinn og netþjóninn í einu **Cloudflare Worker**-verkefni.
Hún notar **Durable Objects** og **WebSockets** fyrir 2–4 manna einkaherbergi.

## Það sem virkar

- Stofna netleik og fá sex stafa herbergiskóða.
- Tengjast frá síma, spjaldtölvu eða tölvu með sama kóða.
- 2–4 leikmenn í sama hóteli.
- Sameiginlegir lyklar, hurðir, safnhlutir, stig, Húsvörður og hótelatvik.
- Gestgjafi keyrir leikheiminn og sendir stöðuna til hinna.
- Sjálfvirk endurtenging í stuttan tíma.
- Ef gestgjafi dettur út tekur annar tengdur leikmaður við.
- Engin innskráning, rödd eða opið spjall.

## Mikilvæg breyting frá Pages

Þessa útgáfu er **ekki hægt að birta með Drag and drop í Pages**, vegna þess að
Durable Object þarf Wrangler-migration. Cloudflare mælir nú með Workers Static
Assets fyrir ný full-stack verkefni.

Nýja útgáfan fær fyrst slóð á borð við:

`https://salka-horror-hotel-online.<cloudflare-subdomain>.workers.dev`

Gamla `salkahotel.pages.dev` síðan helst óbreytt þar til þú vísar fólki á nýju slóðina.
`pages.dev`-slóð er ekki hægt að flytja beint yfir á Worker, en síðar má tengja eigið lén.

## Birta með Wrangler

Þú þarft Node.js 20 eða nýrra.

```bash
cd salka-horror-hotel-online
npm install
npx wrangler login
npm run deploy
```

Í fyrsta skipti opnast vafri þar sem þú samþykkir Cloudflare-aðgang. Að lokinni
birtingu sýnir Wrangler opinberu `workers.dev`-slóðina.

## Prófa á tölvunni áður

```bash
npm install
npm run dev
```

Opnaðu síðan slóðina sem Wrangler sýnir, yfirleitt `http://localhost:8787`.
Opnaðu hana í tveimur vöfrum eða í venjulegum og einkaglugga, stofnaðu herbergi
í öðrum og tengstu með kóðanum í hinum.

## Birta í gegnum GitHub

1. Stofnaðu nýtt GitHub repository.
2. Settu allt innihald þessarar möppu í repositoryið.
3. Í Cloudflare velurðu **Workers & Pages → Create → Import a repository**.
4. Cloudflare les `wrangler.jsonc` og setur upp Durable Object migration.
5. Build command: `npm install` (ef óskað er eftir henni).
6. Deploy command: `npx wrangler deploy`.

Wrangler CLI er öruggari leið fyrir fyrstu birtingu, því hún sýnir migrationina skýrt.

## Hönnun netspilunar

Þetta er gestgjafastýrð útgáfa. Gestgjafinn keyrir Húsvörðinn og sameiginlega
leikheiminn. Aðrir leikmenn keyra eigin hreyfingu staðbundið og senda stöðu sína
til gestgjafans. Durable Object miðlar skilaboðunum og heldur utan um herbergið.
Þetta er hagkvæm og viðbragðsfljót leið fyrir einkaleiki milli vina, en ekki
svindlvarin samkeppnisarkitektúr.

## Persónuvernd og öryggi

- Engir notendareikningar.
- Engin almenn leit að herbergjum.
- Engin texta- eða raddspjöll.
- Nöfn eru takmörkuð við 16 stafi og hreinsuð bæði í vafra og á netþjóni.
- Herbergi eyðast eftir 30 mínútur án tengdra leikmanna.
- Hámark fjórir leikmenn í herbergi.

## Prófun sem fylgir pakkanum

- `node --check` fyrir bæði framenda og Worker.
- `wrangler deploy --dry-run` til að sannreyna Worker, assets, bindingu og migration.
- Staðbundið API- og WebSocket-próf fyrir stofnun herbergis, tvo leikmenn, start,
  stöðumiðlun og gestgjafaskipti.

Raunverulegt spilapróf á tveimur símum þarf samt að fara fram eftir birtingu.
