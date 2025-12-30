#!/bin/bash
# ============================================
# SCRIPT DE DIAGNÓSTICO E CORREÇÃO - FLAYVE V104
# ============================================
# Este script identifica e corrige problemas de configuração
# ============================================

echo "🔍 DIAGNÓSTICO FLAYVE V104"
echo "=========================================="
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar
check() {
    local name=$1
    local command=$2
    
    echo -n "Verificando $name... "
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FALHOU${NC}"
        return 1
    fi
}

# ============================================
# 1. VERIFICAR COMANDOS BÁSICOS
# ============================================

echo "📦 1. VERIFICANDO FERRAMENTAS"
echo "----------------------------------------"

check "Node.js" "node --version"
check "NPM" "npm --version"
check "Wrangler" "npx wrangler --version"

echo ""

# ============================================
# 2. VERIFICAR D1 DATABASE
# ============================================

echo "🗄️  2. VERIFICANDO D1 DATABASE"
echo "----------------------------------------"

echo "Listando databases D1..."
D1_OUTPUT=$(npx wrangler d1 list 2>&1)

if echo "$D1_OUTPUT" | grep -q "webapp-production"; then
    echo -e "${GREEN}✓ Database 'webapp-production' encontrado!${NC}"
    
    # Extrair database_id
    DATABASE_ID=$(echo "$D1_OUTPUT" | grep "webapp-production" | awk '{print $NF}')
    
    if [ ! -z "$DATABASE_ID" ]; then
        echo -e "${GREEN}✓ Database ID: $DATABASE_ID${NC}"
        
        # Atualizar wrangler.toml
        echo ""
        echo "📝 Atualizando wrangler.toml com database_id real..."
        sed -i.bak "s/database_id = \"seu-database-id-aqui\"/database_id = \"$DATABASE_ID\"/" wrangler.toml
        
        if grep -q "$DATABASE_ID" wrangler.toml; then
            echo -e "${GREEN}✓ wrangler.toml atualizado!${NC}"
        else
            echo -e "${RED}✗ Falha ao atualizar wrangler.toml${NC}"
        fi
    fi
else
    echo -e "${RED}✗ Database 'webapp-production' NÃO encontrado!${NC}"
    echo ""
    echo "SOLUÇÃO:"
    echo "1. Criar database:"
    echo "   npx wrangler d1 create webapp-production"
    echo ""
    echo "2. Copiar o Database ID"
    echo "3. Editar wrangler.toml e substituir 'seu-database-id-aqui'"
    echo ""
fi

echo ""

# ============================================
# 3. VERIFICAR MIGRATIONS
# ============================================

echo "🔄 3. VERIFICANDO MIGRATIONS"
echo "----------------------------------------"

if [ -d "migrations" ]; then
    MIGRATION_COUNT=$(ls -1 migrations/*.sql 2>/dev/null | wc -l)
    echo -e "${GREEN}✓ $MIGRATION_COUNT migrations encontradas${NC}"
    
    echo ""
    echo "Para aplicar migrations:"
    echo "  npx wrangler d1 migrations apply webapp-production --remote"
else
    echo -e "${RED}✗ Pasta 'migrations' não encontrada${NC}"
fi

echo ""

# ============================================
# 4. VERIFICAR R2 BUCKET
# ============================================

echo "🪣 4. VERIFICANDO R2 BUCKET"
echo "----------------------------------------"

echo "Listando buckets R2..."
R2_OUTPUT=$(npx wrangler r2 bucket list 2>&1)

if echo "$R2_OUTPUT" | grep -q "flayve-assets"; then
    echo -e "${GREEN}✓ Bucket 'flayve-assets' encontrado!${NC}"
else
    echo -e "${RED}✗ Bucket 'flayve-assets' NÃO encontrado!${NC}"
    echo ""
    echo "SOLUÇÃO:"
    echo "  npx wrangler r2 bucket create flayve-assets"
    echo ""
fi

echo ""

# ============================================
# 5. VERIFICAR VARIÁVEIS DE AMBIENTE
# ============================================

echo "🔐 5. VERIFICANDO VARIÁVEIS DE AMBIENTE"
echo "----------------------------------------"

echo -e "${YELLOW}⚠️  As seguintes variáveis precisam estar configuradas no Cloudflare Dashboard:${NC}"
echo ""
echo "Pages > flayve > Settings > Environment Variables:"
echo ""
echo "  JWT_SECRET"
echo "  LIVEKIT_API_KEY"
echo "  LIVEKIT_API_SECRET"
echo "  LIVEKIT_URL"
echo "  MERCADO_PAGO_ACCESS_TOKEN"
echo "  SENDGRID_API_KEY"
echo ""
echo "Para gerar JWT_SECRET:"
echo "  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
echo ""

# ============================================
# 6. VERIFICAR BUILD
# ============================================

echo "🏗️  6. VERIFICANDO BUILD"
echo "----------------------------------------"

if [ -d "dist" ]; then
    echo -e "${GREEN}✓ Pasta 'dist' existe${NC}"
    
    DIST_FILES=$(ls -1 dist 2>/dev/null | wc -l)
    echo "  Arquivos em dist: $DIST_FILES"
else
    echo -e "${RED}✗ Pasta 'dist' não encontrada${NC}"
    echo ""
    echo "SOLUÇÃO:"
    echo "  npm run build"
    echo ""
fi

echo ""

# ============================================
# 7. VERIFICAR DEPENDÊNCIAS DAS FUNCTIONS
# ============================================

echo "📦 7. VERIFICANDO DEPENDÊNCIAS DAS FUNCTIONS"
echo "----------------------------------------"

if [ -f "functions/package.json" ]; then
    echo -e "${GREEN}✓ functions/package.json existe${NC}"
    
    if [ -d "functions/node_modules" ]; then
        echo -e "${GREEN}✓ functions/node_modules existe${NC}"
    else
        echo -e "${RED}✗ functions/node_modules NÃO existe${NC}"
        echo ""
        echo "SOLUÇÃO:"
        echo "  cd functions && npm install && cd .."
        echo ""
    fi
else
    echo -e "${RED}✗ functions/package.json NÃO encontrado${NC}"
    echo ""
    echo "SOLUÇÃO: Baixe o projeto V104 atualizado"
    echo ""
fi

echo ""

# ============================================
# RESUMO FINAL
# ============================================

echo "=========================================="
echo "📊 RESUMO DO DIAGNÓSTICO"
echo "=========================================="
echo ""
echo "Próximos passos:"
echo ""
echo "1. Se database_id foi atualizado → Fazer deploy novamente"
echo "2. Aplicar migrations:"
echo "   npx wrangler d1 migrations apply webapp-production --remote"
echo ""
echo "3. Criar bucket R2 (se não existe):"
echo "   npx wrangler r2 bucket create flayve-assets"
echo ""
echo "4. Configurar variáveis de ambiente no Cloudflare Dashboard"
echo ""
echo "5. Instalar dependências das Functions:"
echo "   cd functions && npm install && cd .."
echo ""
echo "6. Build e Deploy:"
echo "   npm run build"
echo "   npx wrangler pages deploy dist --project-name=flayve"
echo ""
echo "=========================================="
echo "✅ DIAGNÓSTICO COMPLETO!"
echo "=========================================="
