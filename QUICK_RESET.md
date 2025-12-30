# 🎯 QUICK START - RESET DE USUÁRIOS
**Data:** 2025-12-30  
**Versão:** V104  

---

## ⚡ EXECUÇÃO RÁPIDA

### 1️⃣ Executar SQL no D1

```bash
# No diretório do projeto
cd flayve/

# Executar reset (VAI APAGAR TODOS OS DADOS!)
npx wrangler d1 execute webapp-production --remote --file=reset_users_READY.sql
```

### 2️⃣ Fazer Login

Acesse: `https://flayve.pages.dev/login`

**Usuários criados:**

| Email | Senha | Role | Saldo |
|-------|-------|------|-------|
| admin@flayve.com | Admin@2025 | Admin | R$ 0 |
| streamer@flayve.com | Streamer@2025 | Streamer | R$ 0 |
| viewer@flayve.com | Viewer@2025 | Viewer | **R$ 100** |

### 3️⃣ Testar Funcionalidades

✅ **Upload de Foto (Streamer)**
- Login: streamer@flayve.com
- Dashboard > Editar Perfil
- Clicar no avatar > Enviar imagem (JPG/PNG até 5MB)

✅ **Sistema Admin**
- Login: admin@flayve.com  
- Admin > Usuários
- Testar: Promover, Banir, Atualizar Role

✅ **Sistema de Chamadas (Viewer)**
- Login: viewer@flayve.com
- Explorar > Clicar em um streamer
- Solicitar chamada (saldo: R$ 100)

---

## 🐛 SE ALGO NÃO FUNCIONAR

### Upload de foto falha

```bash
# Verificar se bucket R2 existe
npx wrangler r2 bucket list

# Se não existir, criar:
npx wrangler r2 bucket create flayve-assets
```

### Usuário banido ainda consegue acessar

```bash
# Trocar JWT_SECRET (invalida TODOS os tokens)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copiar resultado e atualizar em:
# Cloudflare Dashboard > Pages > flayve > Settings > Environment Variables
# JWT_SECRET = <novo valor>
```

### Erro ao executar SQL

```bash
# Listar databases
npx wrangler d1 list

# Verificar se webapp-production existe
# Se não existir, criar:
npx wrangler d1 create webapp-production

# Aplicar migrations:
npx wrangler d1 migrations apply webapp-production --remote
```

---

## 📚 DOCUMENTAÇÃO COMPLETA

- **FIX_FUNCIONALIDADES.md** - Guia detalhado de todas as correções
- **FIX_DEPLOY_ERROR.md** - Solução para erro de deploy
- **DEPLOY_V104.md** - Guia completo de deploy
- **README_V104.md** - Visão geral do projeto

---

**⚠️ IMPORTANTE:** Mude as senhas após o primeiro login!

**Desenvolvido por:** IA Desenvolvimento Sênior  
**Data:** 2025-12-30
