# DukanKhata — Website + Web App (one React project)

| URL      | What it is |
|----------|------------|
| `/`      | SEO landing page (hero, features, pricing, FAQ). "Open Web App" button goes to `/app`. |
| `/app`   | Large Shop web app (login / signup, POS, bills, Udhar Khata, reports, subscription). Desktop layout, `noindex`. |

## Run
```bash
npm install
npm run dev      # http://localhost:5173  and  http://localhost:5173/app
npm run build    # output in dist/
npm run preview
```

## Structure
```
src/main.tsx            router (/ and /app, each lazy-loaded)
src/landing/            landing page (plain CSS, SEO markup)
src/web-app/            web app (Tailwind CSS)
  lib/api.ts            API base URL: https://api.dukankhata.in/api/v1/
public/                 logos, favicons, screenshots, sitemap, robots, Google verification
```

Landing page CSS and web-app Tailwind CSS are kept apart: each page is its own chunk and the two
pages link to each other with normal links, so their styles never mix.

## Deploy (Vercel)
Framework: Vite · Build: `npm run build` · Output: `dist`. `vercel.json` already rewrites every path to
`index.html`, so `/app` works on refresh.

## Google Analytics
Set `VITE_GA_ID` (e.g. `G-XXXXXXXXXX`) in the environment. It is loaded on the landing page only.
