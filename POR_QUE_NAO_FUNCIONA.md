# 🚨 POR QUE NADA FUNCIONA? GUIA DE CORREÇÃO

**Data:** 2025-12-30  
**Problema:** Upload de foto, vídeo, carregar saldo - NADA funciona!

---

## 🔴 CAUSA RAIZ

Você fez o deploy mas o **wrangler.toml tem configurações FAKE**:

```toml
database_id = "seu-database-id-aqui"  # ← FAKE!
```

**Resultado:** O backend NÃO consegue acessar o banco de dados!

---

## ✅ SOLUÇÃO EM 5 PASSOS (10 MINUTOS)

### **PASSO 1: Pegar o Database ID REAL**

Execute este comando:

```bash
npx wrangler d1 list
```

Você vai ver algo assim:

```
┌──────────────────────────────────┬─────────────────────────────────────┐
│ Database                         │ Database ID                         │
├──────────────────────────────────┼─────────────────────────────────────┤
│ webapp-production                │ abc123-def456-ghi789-jkl012         │
└──────────────────────────────────┴─────────────────────────────────────┘
```

**👉 COPIE O "Database ID"** (o texto da direita)

---

### **PASSO 2: Atualizar wrangler.toml**

Abra o arquivo **`wrangler.toml`** e encontre esta linha:

```toml
database_id = "seu-database-id-aqui"
```

**Substitua por:**

```toml
database_id = "abc123-def456-ghi789-jkl012"  # ← COLE SEU ID REAL AQUI
```

**Salve o arquivo!**

---

### **PASSO 3: Aplicar Migrations (Criar Tabelas)**

Execute:

```bash
npx wrangler d1 migrations apply webapp-production --remote
```

Isso cria as tabelas no banco (users, profiles, transactions, etc.)

---

### **PASSO 4: Criar Bucket R2 (Para Upload de Fotos)**

Execute:

```bash
npx wrangler r2 bucket create flayve-assets
```

---

### **PASSO 5: Configurar Variáveis de Ambiente**

Vá em: **Cloudflare Dashboard** → **Pages** → **flayve** → **Settings** → **Environment variables**

Adicione **NO MÍNIMO**:

| Nome | Valor | Como Gerar |
|------|-------|------------|
| `JWT_SECRET` | `<string aleatória>` | Execute: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `LIVEKIT_API_KEY` | `<sua key do LiveKit>` | Pegue em: https://livekit.io |
| `LIVEKIT_API_SECRET` | `<seu secret do LiveKit>` | Pegue em: https://livekit.io |
| `LIVEKIT_URL` | `wss://flayve.livekit.cloud` | URL do seu servidor LiveKit |

**⚠️ SEM JWT_SECRET = NADA FUNCIONA!**

---

### **PASSO 6: Deploy Novamente**

```bash
npm run build
npx wrangler pages deploy dist --project-name=flayve
```

---

## 🧪 TESTAR SE FUNCIONOU

### Teste 1: Upload de Foto

1. Faça login no site
2. Vá em **Dashboard** → **Editar Perfil**
3. Clique no avatar e envie uma foto

**Se der erro**, abra o **Console do Navegador** (F12) e me envie a mensagem de erro!

### Teste 2: Carregar Saldo

1. Faça login
2. Vá em **Carteira** → **Recarregar**
3. Tente adicionar R$ 10

**Se der erro**, me envie o erro que aparece!

### Teste 3: Vídeo/Chamadas

1. Login como viewer
2. Clique em um streamer
3. Tente solicitar chamada

**Se não conectar**, me envie o erro!

---

## 🆘 SE AINDA NÃO FUNCIONAR

Execute o script de diagnóstico:

```bash
chmod +x diagnose.sh
./diagnose.sh
```

Ele vai verificar **TUDO** e te dizer exatamente o que está faltando!

---

## 📞 CHECKLIST RÁPIDO

Use esta lista para verificar tudo:

- [ ] **Database ID** no wrangler.toml está correto (não é "seu-database-id-aqui")
- [ ] **Migrations aplicadas** (`npx wrangler d1 migrations apply webapp-production --remote`)
- [ ] **Bucket R2 criado** (`npx wrangler r2 bucket create flayve-assets`)
- [ ] **JWT_SECRET configurado** no Cloudflare Dashboard
- [ ] **LIVEKIT_* configurados** no Cloudflare Dashboard
- [ ] **Deploy feito** após corrigir tudo (`npx wrangler pages deploy dist`)

---

## 🎯 RESUMO DO PROBLEMA

| Problema | Causa | Solução |
|----------|-------|---------|
| Upload de foto não funciona | Database ID fake → banco não conecta | Passo 1 + 2 + 6 |
| Carregar saldo não funciona | Database ID fake → banco não conecta | Passo 1 + 2 + 6 |
| Vídeo não funciona | Database ID fake → banco não conecta | Passo 1 + 2 + 6 |
| Tudo dá erro "500" | JWT_SECRET não configurado | Passo 5 + 6 |
| Erro "R2 not configured" | Bucket não existe | Passo 4 + 6 |

---

## 💡 DICA PRO

Depois de corrigir tudo, teste nesta ordem:

1. ✅ Login funciona?
2. ✅ Dashboard carrega?
3. ✅ Upload de foto funciona?
4. ✅ Carregar saldo mostra o QR Code do PIX?
5. ✅ Vídeo conecta?

---

**ME ENVIE:**

1. A saída do comando `npx wrangler d1 list`
2. Se deu algum erro ao aplicar migrations
3. Qualquer erro que aparece no Console do navegador (F12)

**Aí eu te ajudo a resolver na hora!** 🚀
