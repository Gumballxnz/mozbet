# 🎰 Plataforma de Apostas & Cassino Online (Arquitetura VPS)

> Plataforma completa de apostas online, crash games (Aviator, Mines, Plinko, etc.), casino, pagamentos instantâneos (M-Pesa / E-Mola) e sistema de afiliados. Projetada para execução unificada de alta performance em **VPS Dedicada**.

---

## 🚀 Arquitetura

A plataforma é composta por 3 serviços que rodam em conjunto na mesma VPS gerenciados via **PM2**:

1. **Aplicação Web (Next.js 16 Standalone)**: Frontend reativo e API Routes (Porta `3000`).
2. **Realtime Socket Server**: Roteador WebSocket para chat global, live bets e sincronização de apostas (Porta `3001`).
3. **Game Engine**: Motor contínuo de rodadas Provably Fair para jogos Crash (Aviator, Earplane, etc.).

---

## 🛠️ Stack Tecnológica

- **Frontend & API**: Next.js 16 (App Router, Standalone mode), React 19, TypeScript, TailwindCSS 4, Shadcn/UI
- **Realtime**: Node.js, Socket.io, Express
- **Banco de Dados**: Supabase / PostgreSQL
- **Gateways de Pagamento**: E2Payments (M-Pesa / E-Mola C2B instantâneo), DebitoPay
- **Serviços**: MozSMS (OTP móvel), Resend (E-mails transacionais), Telegram Bot (Notificações)
- **Hospedagem & Servidor**: VPS Dedicada (Ubuntu / Debian), PM2, Nginx (Reverse Proxy + SSL)

---

## 📦 Instalação & Setup Local

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Configurar variáveis de ambiente:**
   ```bash
   cp .env.example .env.local
   # Preencha as credenciais no .env.local
   ```

3. **Executar em modo de desenvolvimento:**
   ```bash
   npm run dev
   ```

---

## 🌐 Deploy em Produção (VPS)

### 1. Requisitos na VPS:
- **Node.js**: 20+ LTS
- **PM2**: `npm install -g pm2`
- **Nginx**: `sudo apt install nginx`

### 2. Configurar o Nginx:
Utilize o modelo fornecido em `nginx.conf.example` para configurar o proxy reverso apontando as portas `3000` (web) e `3001` (socket).

### 3. Build & Inicialização com PM2:
```bash
# 1. Compilar Next.js no modo Standalone
npm run build

# 2. Iniciar todos os serviços na VPS (Web, Realtime e Game Engine)
npm run start:vps

# Para gerenciar os processos:
npm run status:vps     # Status dos processos no PM2
npm run restart:vps    # Reiniciar todos os processos
npm run stop:vps       # Parar os processos
```

---

## 🔒 Segurança

- Credenciais de gateways e chaves Service Role são estritamente restritas ao backend.
- Headers de segurança configurados nativamente (CSP, X-Frame-Options SAMEORIGIN, Referrer-Policy, Permissions-Policy).
- Proteção contra bots e rate-limit de OTP integrado.
- Sessão assinada via tokens JWT com Cookies HTTP-only.
