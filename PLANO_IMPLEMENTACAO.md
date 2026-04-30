# 🚀 PLANO DE IMPLEMENTAÇÃO — MOZBET

> **Criado:** 29/04/2026 | **Status:** AGUARDANDO APROVAÇÃO

---

## 📋 DECISÕES FINAIS APROVADAS

| Decisão | Escolha |
|---|---|
| Stack | **Next.js 15** (migração de React+Vite) |
| Banco de Dados | **Supabase** (novo projeto gratuito, PostgreSQL) |
| Pagamentos | **e2Payments** (depósitos apenas, backend-only) |
| Idiomas | **PT (padrão) + EN** com botão de troca |
| Registro | Telefone (+258) + senha (telefone travado para depósitos) |
| Login social | ❌ Não |
| KYC | ❌ Não |
| Depósito | Mín 1 MT, Máx 25.000 MT |
| Saque | Botão presente mas desativado |
| Moeda | MZN apenas |
| Bônus | 500% primeiro depósito (máx 25.000 MT bônus, com requisito de aposta) |
| Jogos | 15 atuais mantidos + modo demo com jogos reais via iframe |
| Suporte | IA chatbot (Gemini API grátis), perguntas gerais |
| Admin | 2 super admins (email+senha+2FA), link secreto dinâmico |
| Admin route | `/portal/{token-rotativo}` (sem /admin visível) |
| Notificações | Admin recebe na inbox do painel (sem email/SMS) |
| Email contato | suportemozbet@gmail.com |
| Domínio | mozbet.online ou mozbet.site |
| Hospedagem | Vercel (novo repo privado `mozbet`) |
| Design | Manter tema escuro + verde (#00FF7F), mesmos botões/banners |
| Logo | Criar versão temporária |
| Foco | Website mobile-first (sem PWA por agora) |
| Segurança | Cloudflare, anti-bot, anti-clone, nunca confiar no front |

---

## 🏗️ FASES DE IMPLEMENTAÇÃO

### FASE 1 — Fundação (Novo Projeto Next.js)
**Objetivo:** Criar projeto limpo, sem código Lovable

- [ ] Criar novo projeto Next.js 15 com TypeScript
- [ ] Configurar TailwindCSS com o design system atual (mesmas cores, fontes)
- [ ] Configurar estrutura de pastas (app router)
- [ ] Instalar dependências essenciais (Lucide, Shadcn/UI)
- [ ] Configurar i18n (PT padrão + EN)
- [ ] Criar novo projeto Supabase gratuito
- [ ] Configurar variáveis de ambiente (.env.local)
- [ ] Criar repo privado `mozbet` no GitHub
- [ ] Conectar com Vercel

### FASE 2 — Autenticação & Usuários
**Objetivo:** Sistema de registro/login seguro

- [ ] Tabela `users` no Supabase (phone, password_hash, balance, created_at)
- [ ] API Route: POST /api/auth/register (telefone + senha)
- [ ] API Route: POST /api/auth/login
- [ ] API Route: POST /api/auth/logout
- [ ] Hash de senhas com bcrypt (backend)
- [ ] Sessões via JWT httpOnly cookies
- [ ] Middleware de autenticação
- [ ] Validação de prefixos telefone (84/85/86/87)
- [ ] Rate limiting no login (anti-brute force)

### FASE 3 — Frontend Core (Migração)
**Objetivo:** Recriar todas as páginas em Next.js

- [ ] Layout principal (header, footer)
- [ ] MobileHeader com saldo e ações
- [ ] Página inicial (banners, jogos em destaque, catálogo)
- [ ] Modal de registro/login
- [ ] Modal de depósito (UI pronta, e2Payments placeholder)
- [ ] Página de perfil do jogador
- [ ] Página 404
- [ ] Componente de troca de idioma (PT/EN)
- [ ] Logo temporário MOZBET
- [ ] Migrar todos os assets (imagens dos jogos)

### FASE 4 — Jogos (Migração + Demo)
**Objetivo:** Migrar 15 jogos e adicionar modo demo

- [ ] Migrar AviatorGame, TaxiCrashGame, EarplaneGame
- [ ] Migrar PurpleCrashGame, SubwayCrashGame, AugustusCrashGame
- [ ] Migrar ChickenHighwayGame, PlinkoGame, MinesGame
- [ ] Migrar BottleManiaGame, FishinatorGame, FootballXGame
- [ ] Migrar MegaFruitsGame, LionZamaGame
- [ ] Sistema de lazy loading para cada jogo
- [ ] Modo DEMO: integração iframe dos provedores reais
- [ ] Toggle visual Demo/Real em cada jogo
- [ ] Sistema de sons (manter Web Audio API — é leve)

### FASE 5 — Pagamentos (e2Payments Backend)
**Objetivo:** Integração completa de depósitos

- [ ] API Route: POST /api/payments/token (gerar OAuth token)
- [ ] API Route: POST /api/payments/deposit (C2B M-Pesa/E-Mola)
- [ ] Campos placeholder para client_id, client_secret, wallet_id
- [ ] Tabela `transactions` no Supabase
- [ ] Creditar saldo após confirmação
- [ ] Logs de todas as transações
- [ ] Botão de saque (UI presente, funcionalidade desativada)
- [ ] Bônus 500% primeiro depósito (lógica automática)

### FASE 6 — IA de Suporte
**Objetivo:** Chatbot inteligente para ajuda

- [ ] Integração com Gemini API (grátis)
- [ ] API Route: POST /api/support/chat
- [ ] Botão flutuante redondo de suporte
- [ ] Interface de chat moderna
- [ ] Base de conhecimento MOZBET (regras, como depositar, como jogar)
- [ ] Respostas em PT e EN conforme idioma do usuário

### FASE 7 — Painel Administrativo
**Objetivo:** Admin completo e seguro

**Acesso:**
- [ ] Rota secreta `/portal/{token-dinâmico}`
- [ ] Login por email + senha forte
- [ ] 2FA (Google Authenticator / TOTP)
- [ ] IP logging de acessos

**Dashboard:**
- [ ] Visão geral (jogadores online, receita diária, depósitos hoje)
- [ ] Gráficos de receita (diário, semanal, mensal)
- [ ] Total de usuários registrados
- [ ] Alertas e notificações na inbox

**Gestão de Usuários:**
- [ ] Lista de todos os jogadores
- [ ] Busca por telefone
- [ ] Ver detalhes (saldo, histórico, transações)
- [ ] Bloquear/desbloquear jogador
- [ ] Ajustar saldo manualmente (com log de auditoria)

**Gestão Financeira:**
- [ ] Lista de todos os depósitos (com status)
- [ ] Relatórios de receita
- [ ] Exportar dados (CSV)
- [ ] Configurar limites de depósito/saque

**Gestão de Jogos:**
- [ ] Ativar/desativar jogos
- [ ] Ver estatísticas por jogo

**Gestão de Admins:**
- [ ] 2 super admins iniciais
- [ ] Adicionar admins comuns
- [ ] Permissões por nível (super admin vs admin)

**Inbox de Mensagens:**
- [ ] Receber notificações de eventos (novos depósitos, alertas)
- [ ] Marcar como lido/não lido

### FASE 8 — Segurança
**Objetivo:** Protecção empresarial

- [ ] Configurar Cloudflare (DNS, CDN, WAF, DDoS)
- [ ] Anti-bot (Cloudflare Turnstile ou hCaptcha no registro)
- [ ] Anti-clone (Content Security Policy, anti-iframe)
- [ ] CORS restritivo
- [ ] Rate limiting em todas as APIs
- [ ] Validação server-side em tudo (nunca confiar no front)
- [ ] Headers de segurança (HSTS, X-Frame-Options, etc.)
- [ ] Sanitização de inputs (anti-XSS, anti-SQL injection)
- [ ] Audit logs em ações críticas

### FASE 9 — SEO & Analytics
**Objetivo:** Aparecer no Google

- [ ] Google Search Console
- [ ] Google Analytics 4
- [ ] Meta tags SEO em todas as páginas
- [ ] Sitemap.xml dinâmico
- [ ] robots.txt otimizado
- [ ] Schema.org (WebSite, Organization)
- [ ] Open Graph + Twitter Cards
- [ ] Páginas estáticas de SEO (Sobre, Termos, Privacidade)

### FASE 10 — Otimização & Launch
**Objetivo:** Performance e deploy final

- [ ] Otimizar bundle (code splitting, tree shaking)
- [ ] Otimizar imagens (WebP, compressão, next/image)
- [ ] Lighthouse score > 90
- [ ] Testar em dispositivos 1GB RAM
- [ ] Comprar domínio (mozbet.online ou mozbet.site)
- [ ] Configurar domínio na Vercel
- [ ] Configurar Cloudflare DNS
- [ ] Deploy final em produção
- [ ] Testes completos end-to-end

---

## 📊 ESTIMATIVA DE TEMPO

| Fase | Estimativa |
|---|---|
| Fase 1 — Fundação | 1 sessão |
| Fase 2 — Autenticação | 1 sessão |
| Fase 3 — Frontend Core | 2 sessões |
| Fase 4 — Jogos | 2 sessões |
| Fase 5 — Pagamentos | 1 sessão |
| Fase 6 — IA Suporte | 1 sessão |
| Fase 7 — Admin Panel | 2-3 sessões |
| Fase 8 — Segurança | 1 sessão |
| Fase 9 — SEO | 1 sessão |
| Fase 10 — Launch | 1 sessão |

---

## ⚠️ DEPENDÊNCIAS EXTERNAS (o dono precisa providenciar)

- [ ] Criar novo projeto Supabase → fornecer URL e keys
- [ ] Pagar plano e2Payments → fornecer client_id, client_secret, wallet_id
- [ ] Comprar domínio mozbet.online ou mozbet.site
- [ ] Criar conta Cloudflare
- [ ] Criar conta Google Search Console
- [ ] Criar conta Google Analytics
- [ ] Email suportemozbet@gmail.com (criar se não existe)

---

> **PRÓXIMO PASSO:** Após aprovação, inicio a FASE 1 imediatamente.
