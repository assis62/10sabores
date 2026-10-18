// Leitura da tabela de preços que o fornecedor manda em texto (WhatsApp).
// Sem dependência do Firebase: usado por scripts/importar-catalogo.mts.
//
// Formato esperado:
//   𝐌𝐔𝐒𝐒𝐀𝐑𝐄𝐋𝐀𝐒                       <- título de categoria em letras matemáticas
//   MUSSARELA TIROLEZ - R$32,90 KG     <- NOME - R$00,00 UNIDADE
import { UNIDADES_PRECO } from "@/lib/custos";
import type { PesoVolume, UnidadePreco } from "@/types/catalogo";

export interface ItemTabela {
  linha: number;
  nome: string;
  categoria: string;
  preco: number;
  unidade_preco: UnidadePreco;
  peso_volume: PesoVolume | null;
  // Quantidade deduzida do nome; a preenchida à mão em /insumos tem prioridade.
  qtd_por_embalagem: number | null;
}

export interface FalhaTabela {
  linha: number;
  texto: string;
  motivo: string;
}

export const SEM_CATEGORIA = "SEM CATEGORIA";

// Bloco "Mathematical Alphanumeric Symbols" (𝐀, 𝑨, 𝔸, 𝟏...).
const LETRAS_MATEMATICAS = /[\u{1D400}-\u{1D7FF}]/u;

// O hífen antes do R$ às vezes falta ("1,05-KG R$22,87 UNI").
const LINHA_ITEM = /^(.+?)\s*[-–—]?\s*R\$\s*(\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{2})\s*([A-Za-z]+)\.?$/;

// Aceita "500G", "3,5 Kg", "1,05-KG", "5K", "1,01L", "5LTS".
const PESO_VOLUME = /(\d+(?:[.,]\d+)?)[\s-]*(KG|K|KILOS?|GRS?|G|ML|LTS?|LITROS?|L)(?![A-Z])/;

// "24X170G": 24 unidades de 170 g na caixa.
const QTD_X_PESO = /(\d+)\s*X\s*\d+(?:[.,]\d+)?[\s-]*(KG|K|KILOS?|GRS?|G|ML|LTS?|LITROS?|L)(?![A-Z])/;

// NFKD transforma 𝐌𝐔𝐒𝐒𝐀𝐑𝐄𝐋𝐀𝐒 em MUSSARELAS; o NFC em seguida recompõe os
// acentos que o NFKD separou (Ç, Ã...).
function normalizarLinha(texto: string): string {
  return texto.normalize("NFKD").normalize("NFC").replace(/\s+/g, " ").trim();
}

// Tira emojis, asteriscos e enfeites do começo/fim da linha.
function limparEnfeites(texto: string): string {
  return texto.replace(/^[^\p{L}\p{N}]+/u, "").replace(/[^\p{L}\p{N}.)]+$/u, "");
}

export function extrairPesoVolume(nome: string): PesoVolume | null {
  const achado = PESO_VOLUME.exec(nome.toUpperCase());
  if (!achado) return null;
  const numero = Number(achado[1].replace(",", "."));
  if (!(numero > 0)) return null;
  const sufixo = achado[2];
  const emKg = sufixo === "KG" || sufixo === "K" || sufixo.startsWith("KILO");
  const emLitros = sufixo === "L" || sufixo.startsWith("LT") || sufixo.startsWith("LITRO");
  const valor = Math.round(numero * (emKg || emLitros ? 1000 : 1) * 1000) / 1000;
  return { valor, medida: emLitros || sufixo === "ML" ? "ml" : "g" };
}

// Balde e galão com peso/volume no nome são uma embalagem só; caixa com
// "NxPESO" no nome traz N unidades. Fora disso, fica pra preencher à mão.
export function inferirQtdPorEmbalagem(
  nome: string,
  unidadePreco: UnidadePreco,
  pesoVolume: PesoVolume | null,
): number | null {
  if ((unidadePreco === "BLD" || unidadePreco === "GLA") && pesoVolume) return 1;
  if (unidadePreco === "CX") {
    const achado = QTD_X_PESO.exec(nome.toUpperCase());
    const qtd = achado ? Number(achado[1]) : 0;
    return qtd > 0 ? qtd : null;
  }
  return null;
}

export function chaveItem(nome: string, unidadePreco: UnidadePreco): string {
  const slug = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug}--${unidadePreco.toLowerCase()}`;
}

export function lerTabela(conteudo: string): { itens: ItemTabela[]; falhas: FalhaTabela[] } {
  const itens: ItemTabela[] = [];
  const falhas: FalhaTabela[] = [];
  let categoria = SEM_CATEGORIA;

  conteudo
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .forEach((bruta, indice) => {
      const linha = indice + 1;
      const texto = limparEnfeites(normalizarLinha(bruta));
      if (!texto) return;

      const item = LINHA_ITEM.exec(texto);
      if (item) {
        const unidade = item[3].toUpperCase() as UnidadePreco;
        if (!UNIDADES_PRECO.includes(unidade)) {
          falhas.push({ linha, texto: bruta.trim(), motivo: `unidade desconhecida "${item[3]}"` });
          return;
        }
        const nome = limparEnfeites(item[1]);
        const preco = Number(item[2].replace(/\./g, "").replace(",", "."));
        if (!nome || !(preco > 0)) {
          falhas.push({ linha, texto: bruta.trim(), motivo: "nome vazio ou preço zerado" });
          return;
        }
        const pesoVolume = extrairPesoVolume(nome);
        itens.push({
          linha,
          nome,
          categoria,
          preco,
          unidade_preco: unidade,
          peso_volume: pesoVolume,
          qtd_por_embalagem: inferirQtdPorEmbalagem(nome, unidade, pesoVolume),
        });
        return;
      }

      if (LETRAS_MATEMATICAS.test(bruta)) {
        const titulo = texto
          .replace(/[^\p{L}\p{N}\s&/-]/gu, "")
          .replace(/\s+/g, " ")
          .trim()
          .toUpperCase();
        if (titulo) {
          categoria = titulo;
          return;
        }
      }

      falhas.push({ linha, texto: bruta.trim(), motivo: "fora do formato NOME - R$00,00 UNIDADE" });
    });

  return { itens, falhas };
}
