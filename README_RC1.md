# 🚀 FLAYVE V104-RC1 - RELEASE CANDIDATE 1

**Status**: ✅ Production Ready  
**Data**: 30 Dezembro 2025  
**Versão**: V104-RC1  
**Tamanho**: 259 KB

---

## 📥 DOWNLOAD

**Arquivo**: `flayve_v104_RC1_2025-12-30.tar.gz`  
**Localização**: `/home/user/flayve/flayve_v104_RC1_2025-12-30.tar.gz`  
**MD5**: (calcular após download)

---

## 🎯 O QUE ESTA VERSÃO CORRIGE?

### 1. ✅ CORS Dinâmico
- **Antes**: Bloqueava domínios customizados
- **Agora**: Aceita qualquer `*.pages.dev` + `ALLOWED_ORIGINS`

### 2. ✅ Mercado Pago Webhooks
- **Antes**: `notification_url` não enviada
- **Agora**: Detecta automaticamente ou usa `PUBLIC_URL`

### 3. ✅ LiveKit Vídeo (Tela Preta)
- **Antes**: Não conectava em redes diferentes
- **Agora**: ICE config STUN/TURN habilitado

### 4. ✅ Wrangler Migrations
- **Antes**: Erro "No migrations found"
- **Agora**: `migrations_dir` configurado

---

## 📦 CONTEÚDO DO PACOTE

```
flayve_export/
├── functions/
│   ├── api/[[route]].ts           (CORS dinâmico)
│   └── server/routes/
│       └── wallet.ts              (notification_url MP)
├── src/pages/call/
│   └── ActiveCallPage.tsx         (ICE config LiveKit)
├── migrations/                     (11 migrations SQL)
├── wrangler.toml                  (migrations_dir + database_id)
├── .env.production.example        (template vars)
├── DEPLOY_GUIDE_RC1.md            (guia completo)
├── CHANGELOG_RC1.md               (documentação)
└── package.json
```

---

## 🚀 COMO USAR

### Extração
```bash
tar -xzf flayve_v104_RC1_2025-12-30.tar.gz
cd flayve_export/
```

### Deploy Completo
Siga o guia: `DEPLOY_GUIDE_RC1.md`

Ou resumo rápido:
```bash
# 1. Instalar dependências
npm install
cd functions && npm install && cd ..

# 2. Configurar database_id (se necessário)
# Edite wrangler.toml com o ID do seu D1

# 3. Aplicar migrations
npx wrangler d1 migrations apply webapp-production --remote

# 4. Criar bucket R2
npx wrangler r2 bucket create flayve-assets

# 5. Build
npm run build

# 6. Deploy
npx wrangler pages deploy dist --project-name=flayve

# 7. Configurar variáveis de ambiente
# Dashboard Cloudflare > Pages > flayve > Settings > Environment variables
```

---

## 🔐 VARIÁVEIS DE AMBIENTE

### Obrigatórias:
- `JWT_SECRET`
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `SENDGRID_API_KEY`

### RC1 - Opcionais:
- `PUBLIC_URL` (ex: https://flayve.pages.dev)
- `ALLOWED_ORIGINS` (ex: https://www.seudominio.com)

Veja `.env.production.example` para template completo.

---

## ✅ VALIDAÇÃO PÓS-DEPLOY

```bash
# Health check
curl https://flayve.pages.dev/api/health

# Esperado:
{
  "status": "ok",
  "version": "V104-RC1",
  "msg": "Release Candidate 1 - Production Ready!",
  "fixes": [
    "JWT HMAC-SHA256",
    "Call Billing",
    "MP Webhooks",
    "CORS Dinâmico",
    "LiveKit ICE Config",
    "Domínios Customizados"
  ]
}
```

---

## 📊 ESTATÍSTICAS

- **Commits**: 5 novos
- **Arquivos modificados**: 7
- **Linhas adicionadas**: +641
- **Linhas removidas**: -38
- **Problemas corrigidos**: 4 críticos
- **Novos recursos**: 3
- **Tempo de deploy**: ~30-45 minutos

---

## 🎉 MIGRAÇÃO

Se você já tem Flayve rodando, atualize apenas os arquivos modificados:

```bash
# Backup primeiro!
cp -r YOUR_PROJECT YOUR_PROJECT_BACKUP

# Atualize os arquivos
cp flayve_export/functions/api/[[route]].ts YOUR_PROJECT/functions/api/
cp flayve_export/functions/server/routes/wallet.ts YOUR_PROJECT/functions/server/routes/
cp flayve_export/src/pages/call/ActiveCallPage.tsx YOUR_PROJECT/src/pages/call/
cp flayve_export/wrangler.toml YOUR_PROJECT/

# Configure as novas vars (opcional)
# - PUBLIC_URL
# - ALLOWED_ORIGINS

# Rebuild e deploy
cd YOUR_PROJECT
npm run build
npx wrangler pages deploy dist --project-name=flayve
```

---

## 🐛 TROUBLESHOOTING

### CORS ainda bloqueado
- Configure `ALLOWED_ORIGINS` no Cloudflare Dashboard
- Faça um novo deploy

### Upload não funciona
- Confirme que o bucket R2 existe: `wrangler r2 bucket list`
- Verifique binding `BUCKET` no wrangler.toml

### Vídeo tela preta
- Confirme `LIVEKIT_URL` começa com `wss://`
- Teste em rede diferente
- Verifique permissões de câmera no navegador

### Mercado Pago não notifica
- Configure `PUBLIC_URL` com URL de produção
- Teste webhook: `curl https://flayve.pages.dev/api/webhooks/test`

---

## 📞 SUPORTE

Documentação completa:
- `DEPLOY_GUIDE_RC1.md` (guia passo a passo)
- `CHANGELOG_RC1.md` (changelog detalhado)
- `.env.production.example` (vars necessárias)

---

## 🏆 RESULTADO

**ANTES:**
- ❌ Upload de foto não funciona
- ❌ Carregar saldo não funciona
- ❌ Vídeo tela preta
- ❌ CORS bloqueado

**AGORA (RC1):**
- ✅ Upload funciona (R2)
- ✅ Saldo funciona (MP webhooks)
- ✅ Vídeo conecta (ICE config)
- ✅ CORS aceita domínios

---

**Release Candidate 1 - Pronto para Produção! 🚀**
