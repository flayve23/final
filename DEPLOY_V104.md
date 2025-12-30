# 🚀 GUIA DE DEPLOY - FLAYVE V104

## ⚠️ IMPORTANTE: BREAKING CHANGES

**TODOS OS TOKENS JWT ANTIGOS SÃO INVÁLIDOS!**

Após o deploy da V104, **todos os usuários precisarão fazer login novamente**.

---

## 📋 PRÉ-REQUISITOS

### 1. Variáveis de Ambiente (Cloudflare Pages)

Certifique-se de que estas variáveis estão configuradas:

```bash
JWT_SECRET=sua_chave_secreta_super_forte_aqui_min_32_chars
LIVEKIT_API_KEY=sua_chave_livekit
LIVEKIT_API_SECRET=seu_secret_livekit
LIVEKIT_URL=wss://flayve.livekit.cloud
MERCADO_PAGO_ACCESS_TOKEN=seu_token_mp_producao
SENDGRID_API_KEY=sua_chave_sendgrid
```

**CRÍTICO**: O `JWT_SECRET` deve ser uma string aleatória longa (mínimo 32 caracteres).

Gerar um JWT_SECRET seguro:
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL
openssl rand -hex 32

# Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 2. Bindings do Cloudflare

Verificar no `wrangler.jsonc` (ou criar se não existir):

```jsonc
{
  "name": "flayve",
  "pages_build_output_dir": "dist",
  "compatibility_date": "2024-01-01",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "webapp-production",
      "database_id": "seu-database-id-aqui"
    }
  ],
  "r2_buckets": [
    {
      "binding": "BUCKET",
      "bucket_name": "flayve-assets"
    }
  ]
}
```

---

## 🔧 PASSO A PASSO DO DEPLOY

### Etapa 1: Instalar Dependências

```bash
npm install
```

### Etapa 2: Build do Frontend

```bash
npm run build
```

Verificar se a pasta `dist/` foi criada:
```bash
ls -la dist/
```

### Etapa 3: Aplicar Migrações do Banco (se houver novas)

```bash
npx wrangler d1 migrations apply webapp-production --remote --config wrangler.jsonc
```

**Nota**: A V104 não adiciona novas migrações, então este passo pode ser pulado.

### Etapa 4: Deploy na Cloudflare

```bash
npx wrangler pages deploy dist --project-name=flayve
```

Ou usar o comando npm:
```bash
npm run deploy
```

### Etapa 5: Verificar Deploy

Após o deploy, testar o endpoint de health:

```bash
curl https://flayve.pages.dev/api/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "version": "V104",
  "path": "/api/health",
  "msg": "If you see this, /api routing is working!",
  "fixes": ["JWT HMAC-SHA256", "Call Billing", "MP Webhooks"]
}
```

---

## 🔔 CONFIGURAR WEBHOOK DO MERCADO PAGO

### Passo 1: Acessar Painel do MP

1. Ir para: https://www.mercadopago.com.br/developers/panel/webhooks
2. Fazer login com sua conta de produção

### Passo 2: Criar Webhook

1. Clicar em **"Criar webhook"**
2. Preencher:
   - **Nome**: Flayve Payments
   - **URL**: `https://flayve.pages.dev/api/webhooks/mercadopago`
   - **Eventos**: Selecionar `payment`
   - **Versão da API**: v1

3. Salvar

### Passo 3: Testar Webhook

Fazer uma recarga de teste e verificar os logs:

```bash
wrangler tail --format pretty
```

Procurar por mensagens tipo:
```
📥 Webhook MP recebido: {...}
💳 Payment 123456 - Status: approved
✅ Recarga creditada: User 1 - R$ 50.00
```

---

## 🧪 TESTAR FLUXO COMPLETO

### 1. Criar Contas de Teste

```bash
# Viewer
curl -X POST https://flayve.pages.dev/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "viewer_test",
    "email": "viewer@test.com",
    "password": "senha123",
    "role": "viewer"
  }'

# Streamer
curl -X POST https://flayve.pages.dev/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "streamer_test",
    "email": "streamer@test.com",
    "password": "senha123",
    "role": "streamer"
  }'
```

### 2. Testar Recarga (PIX Real)

```bash
# Fazer login como viewer
TOKEN_VIEWER="..."

# Criar recarga
curl -X POST https://flayve.pages.dev/api/wallet/recharge \
  -H "Authorization: Bearer $TOKEN_VIEWER" \
  -H "Content-Type: application/json" \
  -d '{"amount": 10, "method": "pix"}'
```

**Pagar o PIX gerado e aguardar 5-10 segundos.**

Verificar saldo:
```bash
curl https://flayve.pages.dev/api/wallet/balance \
  -H "Authorization: Bearer $TOKEN_VIEWER"
```

Deve retornar: `{"balance": 10.00}`

### 3. Testar Chamada

**No navegador:**
1. Login como viewer
2. Procurar streamer
3. Iniciar chamada
4. Streamer aceita
5. Aguardar 1-2 minutos na chamada
6. Encerrar

**Verificar cobrança:**
- Viewer: saldo deve ter diminuído
- Streamer: saldo deve ter aumentado (80% do valor)

---

## 🐛 TROUBLESHOOTING

### Problema: "JWT verification failed"

**Causa**: JWT_SECRET não está configurado ou está errado.

**Solução**:
1. Verificar variável no Cloudflare Pages: Settings > Environment Variables
2. Gerar novo JWT_SECRET seguro
3. Fazer redeploy

### Problema: "Webhook não está creditando saldo"

**Causa**: URL do webhook incorreta ou MP não está enviando notificações.

**Solução**:
1. Verificar URL no painel MP: deve ser exatamente `https://flayve.pages.dev/api/webhooks/mercadopago`
2. Testar endpoint:
   ```bash
   curl https://flayve.pages.dev/api/webhooks/test
   ```
3. Verificar logs do Cloudflare:
   ```bash
   wrangler tail
   ```

### Problema: "Chamada não está cobrando"

**Causa**: Frontend não está enviando `call_id` ou `duration_seconds`.

**Solução**:
1. Verificar console do navegador (F12) por erros
2. Verificar se `state.call_id` existe no ActiveCallPage
3. Verificar logs da API:
   ```bash
   wrangler tail | grep "calls/end"
   ```

### Problema: "CORS error"

**Causa**: Domínio não está na whitelist.

**Solução**:
1. Adicionar seu domínio em `functions/api/[[route]].ts`:
   ```typescript
   const allowedOrigins = [
     'https://flayve.pages.dev',
     'https://seu-dominio-customizado.com', // ADICIONAR AQUI
     'http://localhost:5173'
   ];
   ```
2. Fazer redeploy

---

## 📊 MONITORAMENTO PÓS-DEPLOY

### Logs em Tempo Real

```bash
wrangler tail --format pretty
```

### Métricas no Dashboard

1. Acessar: https://dash.cloudflare.com
2. Ir em: Pages > flayve > Analytics
3. Monitorar:
   - Requests por minuto
   - Erros (status 4xx, 5xx)
   - Latência (p50, p99)

### Alertas Importantes

Criar alertas para:
- Taxa de erro > 5%
- Latência p99 > 2 segundos
- Webhook failures

---

## ✅ CHECKLIST PÓS-DEPLOY

- [ ] Health check respondendo (`/api/health` retorna V104)
- [ ] Webhook MP configurado e testado
- [ ] Variáveis de ambiente verificadas
- [ ] JWT_SECRET forte configurado
- [ ] Login funcionando (gera novo token)
- [ ] Recarga via PIX funcionando
- [ ] Webhook creditando saldo automaticamente
- [ ] Chamadas cobrando corretamente
- [ ] Timer de chamada visível
- [ ] Upload de imagem com validações
- [ ] CORS funcionando
- [ ] Logs limpos (sem erros críticos)

---

## 📞 SUPORTE

Se encontrar problemas:

1. **Verificar logs**:
   ```bash
   wrangler tail --format pretty
   ```

2. **Testar endpoints manualmente**:
   ```bash
   curl https://flayve.pages.dev/api/health
   ```

3. **Verificar variáveis**:
   ```bash
   wrangler pages deployment list
   ```

4. **Consultar documentação**:
   - Cloudflare Pages: https://developers.cloudflare.com/pages/
   - Mercado Pago: https://www.mercadopago.com.br/developers/

---

## 🎉 DEPLOY CONCLUÍDO!

**Versão**: V104 (Security & Billing Update)  
**Data**: 2025-12-30  
**Branch**: hotfix/critical-security-fixes-v104

**Próximos passos sugeridos**:
1. Notificar usuários sobre necessidade de novo login
2. Monitorar primeiras recargas e chamadas
3. Ajustar comissão da plataforma se necessário (atualmente 20%)
4. Implementar sistema de chat (próxima versão)
5. Adicionar analytics para streamers

---

**Bom lançamento! 🚀**
