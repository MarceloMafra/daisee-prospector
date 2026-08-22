-- Extensoes que o `prisma db push` nao cria sozinho.
-- Aplicar com: npx dotenv -e .env.local -- npx tsx scripts/preparar-banco.ts
--
-- unaccent: a busca de leads compara nome, e-mail e empresa ignorando acento.
-- Sem ela, procurar "cambio" nao acha "OZ Cambio" e o operador conclui que o
-- lead nao existe.
CREATE EXTENSION IF NOT EXISTS unaccent;
