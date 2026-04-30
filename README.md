# 🎰 MOZBET

> Casa de Apostas Online — Moçambique

## Stack
- **Next.js 16** + React 19 + TypeScript
- **TailwindCSS 4** + Shadcn/UI
- **Supabase** (PostgreSQL)
- **e2Payments** (M-Pesa / E-Mola)
- **Vercel** (Hospedagem)

## Setup
```bash
npm install
cp .env.example .env.local
# Preencher .env.local com credenciais
npm run dev
```

## Ambiente
- Dev: `http://localhost:3000`
- Prod: `https://mozbet.online`

## Segurança
- ⛔ Nunca commitar `.env.local`
- 🔒 Credenciais e2Payments só no backend
- 🛡️ Cloudflare + Headers de segurança
