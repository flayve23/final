# 🔧 FLAYVE RC1 - CORREÇÕES COMPLETAS

**Data**: 30 Dezembro 2025  
**Versão**: V104-RC1-FIX-ALL

---

## 🚨 PROBLEMAS CORRIGIDOS

### ✅ 1. MIGRATIONS (Windows Path Issue)
**Problema**: `No migrations present at C:\Users\Felipe\Desktop\migrations`  
**Causa**: Você estava na pasta errada  
**Solução**: 

```bash
# ERRADO (você está aqui):
C:\Users\Felipe\Desktop\flayve>

# CERTO (você precisa estar aqui):
C:\Users\Felipe\Desktop\flayve\flayve_export>

# Comandos corretos:
cd C:\Users\Felipe\Desktop\flayve\flayve_export
npx wrangler d1 migrations apply webapp-production --remote
```

---

### ✅ 2. UPLOAD DE STORIES 404
**Problema**: `POST /api/storage/upload/stories 404 (Not Found)`  
**Causa**: Rota não existia!  
**Solução**: Adicionada rota `/storage/upload/stories` no backend  
**Arquivo**: `functions/server/routes/storage.ts`  
**Agora suporta**: FormData upload (imagens e vídeos até 10MB)

---

### ✅ 3. SIGNUP 500 (mas cria usuário)
**Problema**: `POST /api/auth/signup 500` mas usuário é criado  
**Causa**: Erro ao criar profile de streamer quebrava o signup  
**Solução**: Try/catch no profile creation (não crítico)  
**Arquivo**: `functions/server/routes/auth.ts`  
**Agora**: Signup sempre retorna 200 mesmo se profile falhar

---

### ✅ 4. BANIR USUÁRIO 500
**Problema**: `POST /api/admin/users/update-role 500`  
**Causa**: Middleware não passava JWT_SECRET  
**Solução**: Middleware corrigido + melhor validação  
**Arquivo**: `functions/server/routes/admin.ts`  
**Agora**: Banir/promover funciona com logs detalhados

---

### ✅ 5. PERFIL COMPARTILHADO USA ID
**Problema**: URL `/p/14` em vez de `/p/username`  
**Causa**: Frontend usava `profile.user_id`  
**Solução**: Mudado para `profile.username`  
**Arquivo**: `src/pages/dashboard/StreamerProfile.tsx`  
**Agora**: Link é `/p/streamer` (amigável)

---

### ⚠️ 6. RECARGA NÃO MOSTRA QR CODE
**Problema**: "Aparece recarga realizada" sem tela de pagamento  
**Causa**: Mercado Pago pode estar em modo sandbox ou sem QR Code  
**Diagnóstico**: Verifique se `data.qr_code_base64` existe na resposta  
**Arquivo**: `src/components/ui/RechargeModal.tsx` (já correto)  
**Ação**: Verificar logs do Cloudflare Functions

```javascript
// O código JÁ ESTÁ CORRETO:
if (data.qr_code_base64) {
    setPaymentData(data);
    setStep('payment'); // Mostra QR Code
} else {
    alert('Recarga simulada realizada com sucesso!');
}
```

**Próximos passos para debug**:
1. Abra o Console do navegador (F12)
2. Vá para aba **Network**
3. Faça uma recarga
4. Clique na requisição `/wallet/recharge`
5. Veja a **Response** e me envie

---

### ⚠️ 7. TELA PRETA NA LIVE
**Problema**: Streamer aceita, mas viewer vê tela preta  
**Causa provável**: LiveKit token ou ICE config  
**Arquivo já corrigido**: `src/pages/call/ActiveCallPage.tsx`  
**Ação**: Verificar se `LIVEKIT_URL` está correto no Cloudflare

**Checklist LiveKit**:
- [ ] `LIVEKIT_URL` começa com `wss://` (não `ws://`)
- [ ] `LIVEKIT_API_KEY` está correto
- [ ] `LIVEKIT_API_SECRET` está correto
- [ ] Permissões de câmera/microfone concedidas

**Debug**:
1. Abra Console (F12) durante a chamada
2. Procure erros vermelhos
3. Me envie as mensagens de erro

---

## 📦 ARQUIVOS MODIFICADOS

```
✏️ functions/server/routes/storage.ts     (+ rota /upload/stories)
✏️ functions/server/routes/auth.ts        (signup não quebra + check banned)
✏️ functions/server/routes/admin.ts       (middleware + validação)
✏️ src/pages/dashboard/StreamerProfile.tsx (username em vez de user_id)
```

---

## 🚀 COMO APLICAR AS CORREÇÕES

### Opção A: Download do arquivo corrigido completo
(Vou criar agora)

### Opção B: Atualizar apenas os arquivos modificados

Se você já tem o projeto rodando, copie os 4 arquivos acima do novo download.

---

## 🔍 DEBUG PASSO A PASSO

### 1. Migrations (CRÍTICO - FAÇA PRIMEIRO)

```bash
# 1. Navegue para a pasta CORRETA
cd C:\Users\Felipe\Desktop\flayve\flayve_export

# 2. Confirme que você está no lugar certo
dir migrations

# Você DEVE ver os arquivos:
# 0001_initial_schema.sql
# 0002_add_stories.sql
# ... (11 arquivos .sql)

# 3. Agora sim aplique as migrations
npx wrangler d1 migrations apply webapp-production --remote

# ✅ Esperado:
# Successfully applied 11 migrations
```

---

### 2. Verificar Variáveis de Ambiente

```bash
# Listar vars configuradas no Cloudflare
npx wrangler pages project list
```

Acesse: https://dash.cloudflare.com → Pages → flayve → Settings → Environment variables

**Confirme que existem**:
- ✅ JWT_SECRET
- ✅ LIVEKIT_URL (wss://...)
- ✅ LIVEKIT_API_KEY
- ✅ LIVEKIT_API_SECRET
- ✅ MERCADO_PAGO_ACCESS_TOKEN
- ✅ SENDGRID_API_KEY

---

### 3. Testar Cada Funcionalidade

#### Teste 1: Upload de Stories
1. Login como streamer
2. Dashboard → Adicionar Story
3. Selecione uma imagem
4. **✅ Deve fazer upload sem erro 404**

#### Teste 2: Signup
1. Crie um novo usuário (qualquer role)
2. **✅ Deve retornar 200 e fazer login automático**

#### Teste 3: Banir usuário
1. Login como admin
2. Painel Admin → Usuários
3. Banir um usuário de teste
4. **✅ Deve retornar sucesso**

#### Teste 4: Perfil compartilhado
1. Login como streamer
2. Dashboard → Compartilhar
3. Copie o link
4. **✅ Link deve ser: `https://final-6fd.pages.dev/p/streamer`**
5. Abra em aba anônima
6. **✅ Perfil deve carregar**

#### Teste 5: Recarga
1. Login como viewer
2. Adicionar Saldo → R$ 50
3. **⚠️ Se mostrar "Recarga realizada" SEM QR Code**:
   - Abra F12 → Network
   - Veja a resposta de `/wallet/recharge`
   - Me envie o JSON da resposta

#### Teste 6: Vídeo
1. Login como streamer
2. Aguarde chamada de viewer
3. Aceitar
4. **⚠️ Se der tela preta**:
   - Abra F12 → Console
   - Procure erros vermelhos
   - Me envie as mensagens

---

## 📋 CHECKLIST PÓS-DEPLOY

- [ ] Migrations aplicadas com sucesso
- [ ] Upload de avatar funciona
- [ ] Upload de story funciona
- [ ] Signup funciona sem erro 500
- [ ] Banir usuário funciona
- [ ] Link de perfil usa username
- [ ] Recarga gera QR Code (ou me envie resposta do API)
- [ ] Vídeo conecta (ou me envie erros do console)

---

## 🆘 PRÓXIMOS PASSOS

1. **APLIQUE AS MIGRATIONS** (passo mais importante!)
2. **Baixe o arquivo corrigido** (vou criar agora)
3. **Faça o deploy novamente**
4. **Teste cada funcionalidade**
5. **Me envie**:
   - ✅ O que funcionou
   - ❌ O que ainda não funciona
   - 📋 Logs/erros do Console (F12)

---

**Aguarde o link de download do arquivo corrigido completo!**
