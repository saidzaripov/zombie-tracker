# Deploy to Vercel

Vercel login is browser-interactive, so you have to run these two commands yourself. Should take 2 minutes total.

## Prerequisites — paste your Anthropic key first

Open `.env.local` and paste your key into `ANTHROPIC_API_KEY=""`. Test locally:

```bash
npm run dev
# open http://localhost:3000, tap any card, watch the AI dossier stream in
```

If that works, deploy.

## Deploy

```bash
cd /Users/saidzaripov/Documents/GovHackathon/zombie-tracker

# 1. One-time login (opens browser)
npx vercel login

# 2. First deploy — answers when prompted:
#    Set up and deploy? Y
#    Which scope? (your personal account)
#    Link to existing project? N
#    Project name? zombie-tracker (or whatever)
#    In which directory is your code located? ./
#    Want to override settings? N
npx vercel

# 3. Add env vars to the Vercel project:
npx vercel env add DATABASE_URL production
# paste the read-only Postgres URL from the hackathon info pack
# (format: postgresql://USER:PASSWORD@HOST/DBNAME)

npx vercel env add ANTHROPIC_API_KEY production
# paste your sk-ant-... key

npx vercel env add ANTHROPIC_MODEL production
# paste: claude-sonnet-4-6

# 4. Deploy to production with the new env vars
npx vercel --prod
```

The final command prints a URL like `https://zombie-tracker-xxx.vercel.app` — that's your demo URL. Open it on your phone, test the 3 prepared zombies (entity_id 20310, 53984, 35730).

## Demo zombies (already cache-warmed locally)

| Story type | Entity ID | Name | Province | Why it demos well |
|---|---|---|---|---|
| Federal-heavy | 20310 | St. Stephen's Community House | ON | $115M, $94M federal IRCC newcomer-services contracts, last T3010 in 2020 |
| Alberta-dissolved | 53984 | Brenda Strafford Society for the Prevention of Domestic Violence | AB | $18.9M, AB registry status = Dissolved, shelter funding tapered 2019→2023 |
| CRA stopped filing | 35730 | Addictions Foundation of Manitoba | MB | $107M, 94% public revenue, last T3010 in 2022 |

In the deployed app, after first-load you can warm the production cache by:

```bash
URL="https://zombie-tracker-xxx.vercel.app"
curl -s "$URL/api/totals" > /dev/null
curl -s "$URL/api/zombies?limit=100" > /dev/null
for ID in 20310 53984 35730; do
  curl -s "$URL/api/zombies/$ID/dossier" > /dev/null
done
```

That makes the live demo instant when the audience taps.

## Pitch sequence (5 min)

1. **Hook (20s)** — open URL on your phone. Header ticker animates to **"$1.5B"** in public dollars to organizations no longer reporting. *"This is what Canadian taxpayers paid to charities that have stopped filing or dissolved."*
2. **Scroll the feed (40s)** — show 5 cards. Stop on St. Stephen's.
3. **Tap St. Stephen's (90s)** — let the audience watch the AI investigation stream in. Stay quiet. The streaming IS the demo.
4. **Tap Brenda Strafford (60s)** — Alberta-dissolved domestic violence org. Different jurisdiction, different signal. *"Same tool, different government."*
5. **Tap Addictions Foundation of Manitoba (45s)** — provincial dependency story. *"94% of revenue from government, then nothing."*
6. **Close (60s)** — *"23 million rows of open data. Three governments. One mobile-first investigative interface anyone in Canada can use. Built in 5 hours on the hackathon dataset."*
