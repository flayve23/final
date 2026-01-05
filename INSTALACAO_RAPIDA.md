# ⚡ INSTALAÇÃO SUPER RÁPIDA - FLAYVE v1.0.4

## 🎯 PARA QUEM TEM PRESSA (5 COMANDOS)

```bash
# 1. Extrair pacote
cd C:\Users\Felipe\Desktop
# (Extrair o FLAYVE_v104_COMPLETO.tar.gz aqui)

# 2. Entrar na pasta
cd flayve_completo

# 3. Instalar
npm install

# 4. Aplicar banco de dados
npx wrangler d1 execute flayve-db-prod --remote --file=migrations/ALL_MIGRATIONS.sql

# 5. Deploy
npm run build
npx wrangler pages deploy dist --project-name=final
```

✅ **PRONTO! Acesse:** https://flayve.com

---

## 🔧 CONFIGURAÇÃO OPCIONAL (Secrets)

Acesse: https://dash.cloudflare.com → Workers & Pages → final → Settings

**Adicione (clique em Encrypt):**
- `JWT_SECRET`: `flayve2026secretkeysupersecure1234567890abcdef`
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (quando tiver LiveKit)
- `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_PUBLIC_KEY` (quando tiver Mercado Pago)

---

## ✅ CHECKLIST

- [ ] Extrair pacote
- [ ] `npm install`
- [ ] Aplicar migrations (111 queries)
- [ ] Deploy (`npm run build` + `wrangler pages deploy`)
- [ ] Testar em https://flayve.com/register
- [ ] Criar primeira conta (Email: teste@flayve.com)

---

## 🆘 ERRO?

**"vite não reconhecido"**
```bash
npm install
```

**"database_id inválido"**
```bash
# Pegar novo ID
npx wrangler d1 list

# Atualizar wrangler.toml (linha 13)
database_id = "SEU_NOVO_ID_AQUI"
```

**Deploy falha**
```bash
# Ver erro
npx wrangler pages deployment tail

# Tentar novamente
npm run build
npx wrangler pages deploy dist --project-name=final
```

---

## 📞 SUPORTE

Me envie:
1. Print do erro
2. Console do navegador (F12)
3. Comando que deu erro

---

**TEMPO TOTAL:** ~10 minutos  
**DIFICULDADE:** ⭐⭐☆☆☆ (Fácil)
