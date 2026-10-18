// Custo de insumos e de fichas técnicas. Sem dependência do Firebase.
import { calcularCustoInsumo, normalizarBusca } from "@/lib/custos";
import type { ItemCatalogo, UnidadeBase } from "@/types/catalogo";
import type { Insumo } from "@/types/insumo";
import type { LinhaFicha, LinhaFichaVinculada } from "@/types/produto";

// Insumo já com nome e custo resolvidos (do catálogo ou manual).
export interface InsumoResolvido {
  id: string;
  nome: string;
  unidade_base: UnidadeBase;
  // R$ por unidade base, já com o rendimento; null quando não dá pra calcular.
  custo: number | null;
  manual: boolean;
  ativo: boolean;
}

export function resolverInsumo(insumo: Insumo, catalogoPorId: Map<string, ItemCatalogo>): InsumoResolvido {
  const item = insumo.catalogo_id ? catalogoPorId.get(insumo.catalogo_id) : undefined;
  const custoBase = insumo.catalogo_id ? (item?.custo_base ?? null) : (insumo.custo_manual ?? null);
  return {
    id: insumo.id,
    nome: insumo.catalogo_id ? (item?.nome ?? "Item do catálogo não encontrado") : (insumo.nome ?? "Sem nome"),
    unidade_base: insumo.unidade_base,
    custo: calcularCustoInsumo(custoBase, insumo.rendimento),
    manual: !insumo.catalogo_id,
    ativo: insumo.ativo,
  };
}

export function linhaVinculada(linha: LinhaFicha): linha is LinhaFichaVinculada {
  return "insumo_id" in linha;
}

// Custo de cada linha (null = reservada ou insumo sem custo, mostrada com ⚠)
// e o total só das linhas com custo. `completo` diz se o total vale.
export function calcularCustoFicha(ficha: LinhaFicha[], insumosPorId: Map<string, InsumoResolvido>) {
  const custos = ficha.map((linha) => {
    if (!linhaVinculada(linha)) return null;
    const custo = insumosPorId.get(linha.insumo_id)?.custo ?? null;
    return custo === null ? null : custo * linha.quantidade;
  });
  return {
    custos,
    total: custos.reduce<number>((soma, custo) => soma + (custo ?? 0), 0),
    completo: custos.every((custo) => custo !== null),
  };
}

export function calcularPrecoSugerido(custo: number, margemPercentual: number): number | null {
  if (!(margemPercentual >= 0 && margemPercentual < 100)) return null;
  return custo / (1 - margemPercentual / 100);
}

function palavras(texto: string): string[] {
  return normalizarBusca(texto)
    .split(/[^a-z0-9]+/)
    .filter((palavra) => palavra.length >= 3);
}

// Quantas palavras do nome reservado aparecem no nome do insumo.
export function pontuarSugestao(nomeReservado: string, nomeInsumo: string): number {
  const alvo = normalizarBusca(nomeInsumo);
  return palavras(nomeReservado).filter((palavra) => alvo.includes(palavra)).length;
}
