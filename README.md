# 10 Sabores

Sistema de gestão da 10 Sabores — Next.js (App Router) + TypeScript + Tailwind,
com Firebase (Auth + Firestore) no projeto `sabores-5fe4c`.

Base adaptada do sistema Freskinho. Por enquanto tem:

- Login com e-mail/senha e Google (com vínculo de conta quando o e-mail já tem senha)
- Funcionários com campo `admin`, telas de admin protegidas por `RequireAdmin` + PIN de admin
- Caixa: abrir, fechar (com conferência da gaveta), sangria/suprimento e reabrir o último fechado
- Insumos (`/insumos`, só admin): catálogo do fornecedor importado da tabela de preços,
  insumos apontando pro catálogo, com custo por kg/L/un, rendimento e estoque
- PWA (manifest + ícones) e regras do Firestore liberando tudo só pra usuário logado

Marca provisória: paleta neutra em `src/app/globals.css` (`--marca-primaria` /
`--marca-destaque`) e ícones gerados por `scripts/gerar-icones-pwa.mts` — trocar
quando as cores e o logo forem definidos.

## Rodando

```bash
npm install
npm run dev
```

As variáveis ficam em `.env.local` (modelo em `.env.local.example`).
`FIREBASE_SERVICE_ACCOUNT_KEY` é necessária pra rota de cadastro de funcionários
e pros scripts.

## Primeiro acesso

1. No Firebase Console, ativar em Authentication os provedores **E-mail/senha** e
   **Google**, e criar o banco do Firestore.
2. Publicar as regras: `firebase deploy --only firestore:rules`.
3. Entrar no app uma vez com a conta do dono.
4. Torná-la admin: `npx tsx scripts/cadastrar-admin.mts email@dono.com "Nome" --confirmar`
   (sem `--confirmar` é só um dry run).
5. Ao abrir Funcionários/Configurações pela primeira vez, o app pede pra criar o PIN de admin.

## Scripts

- `npm run test:caixa` — testa o fluxo do caixa e as regras no emulador do Firebase (precisa de Java).
- `npx tsx scripts/marcar-admin.mts "Nome" --confirmar` — marca funcionários existentes como admin.
- `npx tsx scripts/importar-catalogo.mts --confirmar` — importa `dados/tabela-big-alimentos.txt`
  (ou o arquivo passado como argumento) pra `catalogo_fornecedor`. Sem `--confirmar` é dry run:
  lista os itens, as linhas que falharam, os duplicados, os marcados "falta quantidade" e,
  na reimportação, quem subiu e quem desceu de preço.
- `npx tsx scripts/gerar-icones-pwa.mts` — regenera os ícones da PWA.
