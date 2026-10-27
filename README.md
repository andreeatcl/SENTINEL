# Sentinel - WIP

A mobile-first tool for monitoring geopolitical events and news, country by country. Click a country on the map, get its news feed. Built to run as a PWA installed on a phone home screen — no backend accounts, passcode-protected API routes (!), each device keeps its own API keys/favorites/searches in localStorage.

Originally an Express + React app; the backend has been rebuilt on Cloudflare Workers

## Structure

```
client/   React + Vite + Tailwind + Leaflet — the map/search UI
worker/   Cloudflare Worker — proxies NewsAPI, adds persistent (KV) caching
          and transparent main/backup API-key failover
```

## Run it locally

```
cd worker && npm install && npx wrangler dev      # backend, localhost:8787
cd client && npm install && npm run dev            # frontend, localhost:5173
```

No API keys or accounts needed to get the app running — you'll be prompted to paste a free NewsAPI key into the app itself on first launch
