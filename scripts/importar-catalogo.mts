// Importa a tabela de preços da Distribuidora Big Alimentos para a coleção
// catalogo_fornecedor. Roda direto contra o Firestore de produção via Admin SDK.
//
// Uso:
//   npx tsx scripts/importar-catalogo.mts                        -> dry run de dados/tabela-big-alimentos.txt
//   npx tsx scripts/importar-catalogo.mts outra-tabela.txt       -> dry run de outro arquivo
//   npx tsx scripts/importar-catalogo.mts --confirmar            -> grava de verdade
//
// O dry run lista os itens lidos, as linhas que falharam, os duplicados, os
// marcados "falta quantidade" (CX/FD/BLD sem qtd_por_embalagem) e, se o item já
// existia, quem subiu e quem desceu de preço. BLD/GLA com peso ou volume no
// nome ficam com qtd_por_embalagem = 1, e CX com "NxPESO" (24X170G) com N. A
// qtd_por_embalagem preenchida na tela /insumos é preservada na reimportação. Itens que sumiram da tabela ficam
// com na_tabela: false (não são apagados, pra não quebrar insumos).
//
// Requer FIREBASE_SERVICE_ACCOUNT_KEY em .env.local.

process.loadEnvFile(".env.local");

import { readFileSync } from "node:fs";
import { FieldValue, type WriteBatch } from "firebase-admin/firestore";
import { getAdminDb } from "../src/lib/firebase-admin";
import {
  calcularCustoBase,
  calcularUnidadeBase,
  custoNaReferencia,
  exigeQuantidade,
  formatarPesoVolume,
  formatarReais,
} from "../src/lib/custos";
import { chaveItem, lerTabela, type ItemTabela } from "../src/lib/tabelaFornecedor";

const FORNECEDOR = "Distribuidora Big Alimentos";
const PREFIXO_ID = "big-alimentos--";
const ARQUIVO_PADRAO = "dados/tabela-big-alimentos.txt";
const TAMANHO_LOTE = 400;

interface ItemPreparado {
  id: string;
  item: ItemTabela;
  qtd_por_embalagem: number | null;
  custo_base: number | null;
  falta_quantidade: boolean;
  preco_anterior: number | null;
}

function descreverCusto(p: ItemPreparado): string {
  if (p.custo_base === null) return "custo: falta quantidade";
  const unidadeBase = calcularUnidadeBase(p.item.unidade_preco, p.item.peso_volume);
  const { valor, rotulo } = custoNaReferencia(p.custo_base, unidadeBase);
  return `custo: ${formatarReais(valor)}/${rotulo}`;
}

function variacao(anterior: number, atual: number): string {
  const percentual = ((atual - anterior) / anterior) * 100;
  const sinal = percentual > 0 ? "+" : "";
  return `${formatarReais(anterior)} → ${formatarReais(atual)} (${sinal}${percentual.toFixed(1).replace(".", ",")}%)`;
}

async function main() {
  const confirmar = process.argv.includes("--confirmar");
  const arquivo = process.argv.slice(2).find((arg) => arg !== "--confirmar") ?? ARQUIVO_PADRAO;

  console.log(confirmar ? "=== EXECUÇÃO REAL ===" : "=== DRY RUN (nada será alterado) ===");
  console.log(`Arquivo: ${arquivo}`);

  const { itens, falhas } = lerTabela(readFileSync(arquivo, "utf8"));

  const porId = new Map<string, ItemTabela>();
  const duplicados: { item: ItemTabela; primeiro: ItemTabela }[] = [];
  for (const item of itens) {
    const id = PREFIXO_ID + chaveItem(item.nome, item.unidade_preco);
    const primeiro = porId.get(id);
    if (primeiro) {
      duplicados.push({ item, primeiro });
    } else {
      porId.set(id, item);
    }
  }

  const db = getAdminDb();
  const colecao = db.collection("catalogo_fornecedor");
  const existentes = await colecao.where("fornecedor", "==", FORNECEDOR).get();
  const existentesPorId = new Map(existentes.docs.map((doc) => [doc.id, doc.data()]));

  const preparados: ItemPreparado[] = [];
  for (const [id, item] of porId) {
    const anterior = existentesPorId.get(id);
    const qtdSalva = anterior?.qtd_por_embalagem;
    const qtd =
      exigeQuantidade(item.unidade_preco) && typeof qtdSalva === "number" ? qtdSalva : item.qtd_por_embalagem;
    const custo = calcularCustoBase(item.preco, item.unidade_preco, item.peso_volume, qtd);
    preparados.push({
      id,
      item,
      qtd_por_embalagem: qtd,
      custo_base: custo,
      falta_quantidade: custo === null,
      preco_anterior: typeof anterior?.preco === "number" ? anterior.preco : null,
    });
  }

  const sairam = existentes.docs.filter((doc) => !porId.has(doc.id) && doc.data().na_tabela !== false);

  console.log(`\nItens lidos (${preparados.length}):`);
  let categoriaAtual = "";
  for (const p of preparados) {
    if (p.item.categoria !== categoriaAtual) {
      categoriaAtual = p.item.categoria;
      console.log(`\n  [${categoriaAtual}]`);
    }
    const pesoVolume = p.item.peso_volume ? ` — ${formatarPesoVolume(p.item.peso_volume)}` : "";
    const qtd = p.qtd_por_embalagem ? ` — ${p.qtd_por_embalagem} por embalagem` : "";
    console.log(
      `    ${p.item.nome} — ${formatarReais(p.item.preco)} ${p.item.unidade_preco}${pesoVolume}${qtd} — ${descreverCusto(p)}`,
    );
  }

  console.log(`\nLinhas que falharam (${falhas.length}):`);
  for (const f of falhas) {
    console.log(`  ✗ linha ${f.linha}: ${f.motivo} — "${f.texto}"`);
  }

  console.log(`\nDuplicados — fica o primeiro (${duplicados.length}):`);
  for (const { item, primeiro } of duplicados) {
    console.log(
      `  ! linha ${item.linha}: ${item.nome} ${formatarReais(item.preco)} ${item.unidade_preco} (ignorado; vale a linha ${primeiro.linha}, ${formatarReais(primeiro.preco)})`,
    );
  }

  const faltaQuantidade = preparados.filter((p) => p.falta_quantidade);
  console.log(`\nMarcados "falta quantidade" (${faltaQuantidade.length}) — preencher em /insumos:`);
  for (const p of faltaQuantidade) {
    console.log(`  ? ${p.item.nome} — ${formatarReais(p.item.preco)} ${p.item.unidade_preco}`);
  }

  if (existentes.size > 0) {
    const novos = preparados.filter((p) => p.preco_anterior === null);
    const subiram = preparados.filter((p) => p.preco_anterior !== null && p.item.preco > p.preco_anterior);
    const desceram = preparados.filter((p) => p.preco_anterior !== null && p.item.preco < p.preco_anterior);

    console.log(`\nSubiram de preço (${subiram.length}):`);
    for (const p of subiram) {
      console.log(`  ↑ ${p.item.nome} (${p.item.unidade_preco}): ${variacao(p.preco_anterior!, p.item.preco)}`);
    }
    console.log(`\nDesceram de preço (${desceram.length}):`);
    for (const p of desceram) {
      console.log(`  ↓ ${p.item.nome} (${p.item.unidade_preco}): ${variacao(p.preco_anterior!, p.item.preco)}`);
    }
    console.log(`\nNovos no catálogo (${novos.length}):`);
    for (const p of novos) {
      console.log(`  + ${p.item.nome} — ${formatarReais(p.item.preco)} ${p.item.unidade_preco}`);
    }
    console.log(`\nSaíram da tabela (${sairam.length}) — ficam com na_tabela: false:`);
    for (const doc of sairam) {
      const dados = doc.data();
      console.log(`  - ${dados.nome} — ${formatarReais(dados.preco)} ${dados.unidade_preco}`);
    }
  }

  console.log();
  if (!confirmar) {
    console.log(
      `Total: ${preparados.length} item(ns) seriam gravados, ${sairam.length} marcados como fora da tabela. Nada foi gravado (dry run). Revise acima e rode com --confirmar pra aplicar de verdade.`,
    );
    return;
  }

  const escritas = [
    ...preparados.map((p) => (lote: WriteBatch) => {
      lote.set(
        colecao.doc(p.id),
        {
          nome: p.item.nome,
          categoria: p.item.categoria,
          preco: p.item.preco,
          unidade_preco: p.item.unidade_preco,
          peso_volume: p.item.peso_volume,
          qtd_por_embalagem: p.qtd_por_embalagem,
          custo_base: p.custo_base,
          unidade_base: calcularUnidadeBase(p.item.unidade_preco, p.item.peso_volume),
          falta_quantidade: p.falta_quantidade,
          fornecedor: FORNECEDOR,
          na_tabela: true,
          atualizado_em: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }),
    ...sairam.map((doc) => (lote: WriteBatch) => {
      lote.update(doc.ref, { na_tabela: false, atualizado_em: FieldValue.serverTimestamp() });
    }),
  ];

  for (let inicio = 0; inicio < escritas.length; inicio += TAMANHO_LOTE) {
    const lote = db.batch();
    for (const escrever of escritas.slice(inicio, inicio + TAMANHO_LOTE)) {
      escrever(lote);
    }
    await lote.commit();
  }
  console.log(
    `Concluído. ${preparados.length} item(ns) gravados, ${sairam.length} marcados como fora da tabela.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("ERRO:", err);
    process.exit(1);
  });
