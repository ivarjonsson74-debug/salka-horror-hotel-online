# Hraðleið: birta netútgáfuna

Þetta er Worker-verkefni, ekki venjulegur Pages ZIP-pakki.

## 1. Afþjappa

Afþjappaðu `salka-horror-hotel-online-cloudflare.zip`.

## 2. Opna Terminal

Á Mac:

- Opnaðu Finder → Applications → Utilities → Terminal.
- Dragðu verkefnismöppuna inn í Terminal á eftir `cd `.

Dæmi:

```bash
cd /slóð/að/salka-horror-hotel-online
```

## 3. Setja upp og skrá inn

```bash
npm install
npx wrangler login
```

Vafri opnast. Samþykktu Cloudflare-aðganginn.

## 4. Birta

```bash
npm run deploy
```

Wrangler birtir síðan slóð á borð við:

```text
https://salka-horror-hotel-online.<þitt-subdomain>.workers.dev
```

Sendu þá slóð til annarra leikmanna.

## 5. Prófa

- Opnaðu slóðina á tveimur tækjum.
- Veldu „Spila saman á netinu“ á tæki 1.
- Veldu „Stofna netleik“.
- Sláðu kóðann inn á tæki 2.
- Þegar báðir birtast í biðherberginu velur gestgjafinn „Hefja netleik“.

Nánari leiðbeiningar eru í `README.md`.
