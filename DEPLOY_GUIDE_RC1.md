# 🚀 DEPLOY GUIDE - FLAYVE V104-RC1

**Release Candidate 1 - Production Ready**

Este guia vai te ajudar a fazer o deploy do Flayve na Cloudflare Pages do ZERO!

---

## 📋 PRÉ-REQUISITOS

Antes de começar, você precisa:

- [ ] Conta no [Cloudflare](https://dash.cloudflare.com) (gratuita)
- [ ] Conta no [LiveKit Cloud](https://cloud.livekit.io) (gratuita)
- [ ] Conta no [Mercado Pago Developers](https://www.mercadopago.com.br/developers) (gratuita)
- [ ] Conta no [SendGrid](https://sendgrid.com) (gratuita)
- [ ] Node.js 18+ instalado
- [ ] Git instalado

---

## 🎯 PASSO 1: Obter Credenciais

### 1.1 LiveKit (Video Calls)

1. Acesse: https://cloud.livekit.io
2. Crie um novo projeto ou use existente
3. Vá em **Settings > Keys**
4. Copie:
   - `LIVEKIT_URL` (ex: wss://flayve-xyz.livekit.cloud)
   - `LIVEKIT_API_KEY` (ex: APIecfuSQCg5tRg)
   - `LIVEKIT_API_SECRET` (ex: vAuszI9Mle...)

### 1.2 Mercado Pago (Pagamentos)

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Crie uma aplicação ou use existente
3. Vá em **Credenciais de produção**
4. Copie:
   - `Access Token` (ex: APP_USR-8723722478...)

⚠️ **IMPORTANTE**: Use credenciais de **PRODUÇÃO**, não sandbox!

### 1.3 SendGrid (Emails)

1. Acesse: https://app.sendgrid.com
2. Vá em **Settings > API Keys**
3. Crie uma nova key com permissões de envio
4. Copie:
   - `API Key` (ex: SG.8AMPcBKF...)

### 1.4 JWT Secret

Gere uma chave segura no terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copie o resultado (ex: da40771c100ca9f7...)

---

## 🗄️ PASSO 2: Criar Database D1

1. Instale o Wrangler:
```bash
npm install -g wrangler@latest
```

2. Faça login no Cloudflare:
```bash
wrangler login
```

3. Crie o database:
```bash
wrangler d1 create webapp-production
```

4. Copie o **Database ID** que aparece (ex: b6e327ad-e5d2-4d9c-bdff-2ce790d8933f)

5. Cole no arquivo `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "webapp-production"
database_id = "COLE-SEU-DATABASE-ID-AQUI"
```

---

## 📦 PASSO 3: Criar Bucket R2

1. Crie o bucket:
```bash
wrangler r2 bucket create flayve-assets
```

2. Confirme que foi criado:
```bash
wrangler r2 bucket list
```

---

## 🔨 PASSO 4: Instalar Dependências

```bash
# Dependências raiz
npm install

# Dependências das Functions
cd functions
npm install
cd ..
```

---

## 🗃️ PASSO 5: Aplicar Migrations

```bash
npx wrangler d1 migrations apply webapp-production --remote
```

Você deve ver:
```
✅ Successfully applied 11 migrations
```

---

## 🏗️ PASSO 6: Build do Projeto

```bash
npm run build
```

Aguarde até ver:
```
✓ built in 12.34s
```

---

## ☁️ PASSO 7: Deploy no Cloudflare Pages

```bash
npx wrangler pages deploy dist --project-name=flayve
```

Copie a URL que aparece (ex: https://abc123.flayve.pages.dev)

---

## 🔐 PASSO 8: Configurar Variáveis de Ambiente

1. Acesse: https://dash.cloudflare.com
2. Clique em **Pages**
3. Clique no projeto **flayve**
4. Vá em **Settings > Environment variables**
5. Adicione TODAS as variáveis:

### Obrigatórias:

| Nome | Valor | Ambiente |
|------|-------|----------|
| `JWT_SECRET` | (seu JWT gerado) | Production |
| `LIVEKIT_URL` | wss://flayve-xyz.livekit.cloud | Production |
| `LIVEKIT_API_KEY` | APIecfuSQCg5tRg | Production |
| `LIVEKIT_API_SECRET` | (seu secret) | Production |
| `MERCADO_PAGO_ACCESS_TOKEN` | APP_USR-8723... | Production |
| `SENDGRID_API_KEY` | SG.8AMPcBKF... | Production |

### RC1 - Opcionais:

| Nome | Valor | Ambiente |
|------|-------|----------|
| `PUBLIC_URL` | https://flayve.pages.dev | Production |
| `ALLOWED_ORIGINS` | https://www.seudominio.com | Production |

6. Clique em **Save**

---

## 🔄 PASSO 9: Redeploy (para aplicar as vars)

```bash
npm run build
npx wrangler pages deploy dist --project-name=flayve --branch=main
```

---

## ✅ PASSO 10: Testar

### Health Check

```bash
curl https://flayve.pages.dev/api/health
```

Deve retornar:
```json
{
  "status": "ok",
  "version": "V104-RC1",
  "msg": "Release Candidate 1 - Production Ready!",
  "fixes": [...]
}
```

### Login no Frontend

1. Acesse: https://flayve.pages.dev/login
2. Faça login com usuário criado
3. Teste upload de foto
4. Teste recarga de saldo

---

## 🎨 PASSO 11: Configurar Domínio Customizado (Opcional)

1. No Cloudflare Pages > flayve > Custom domains
2. Clique em **Add domain**
3. Digite seu domínio (ex: www.meudominio.com)
4. Siga as instruções de DNS
5. Adicione em `ALLOWED_ORIGINS`:
```
https://www.meudominio.com,https://meudominio.com
```

---

## 🚨 TROUBLESHOOTING

### Erro: "Could not resolve 'hono'"
```bash
cd functions
npm install
cd ..
npm run build
```

### Erro: "D1 Database not found"
- Verifique se o `database_id` no `wrangler.toml` está correto
- Execute: `wrangler d1 list` e copie o ID correto

### Erro: "CORS blocked"
- Adicione seu domínio em `ALLOWED_ORIGINS`
- Faça um novo deploy

### Upload de foto não funciona
- Verifique se o bucket R2 foi criado: `wrangler r2 bucket list`
- Confirme que a variável `BUCKET` está bound no `wrangler.toml`

### Mercado Pago não notifica
- Configure `PUBLIC_URL` com sua URL de produção
- Teste o webhook: `curl https://flayve.pages.dev/api/webhooks/test`

### Vídeo não conecta (tela preta)
- Confirme que `LIVEKIT_URL` começa com `wss://`
- Verifique permissões de câmera/microfone no navegador
- Teste em rede diferente (RC1 adiciona STUN/TURN config)

---

## 📝 RESET DE USUÁRIOS (Opcional)

Se quiser criar usuários de teste:

```bash
npx wrangler d1 execute webapp-production --remote --file=reset_users_READY.sql
```

Credenciais criadas:
- **Admin**: admin@flayve.com / Admin@2025
- **Streamer**: streamer@flayve.com / Streamer@2025
- **Viewer**: viewer@flayve.com / Viewer@2025 (R$ 100 de saldo)

⚠️ **ATENÇÃO**: Isso apaga TODOS os dados existentes!

---

## 🎉 PRONTO!

Seu Flayve está no ar!

Acesse: https://flayve.pages.dev (ou seu domínio customizado)

---

## 📞 SUPORTE

Problemas? Verifique:
- Logs do Cloudflare: https://dash.cloudflare.com > Pages > flayve > Functions
- Console do navegador (F12)
- Arquivo `PROBLEMA_CORS.md` e `FIX_FUNCIONALIDADES.md`

---

**Release Candidate 1 - Dezembro 2025**
