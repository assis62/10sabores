// Cálculos de custo do catálogo e dos insumos. Sem dependência do Firebase:
// é usado tanto pela tela quanto por scripts/importar-catalogo.mts.
import type { PesoVolume, UnidadeBase, UnidadePreco } from "@/types/catalogo";

export const UNIDADES_PRECO: readonly UnidadePreco[] = ["KG", "UNI", "CX", "FD", "BLD", "GLA"];

// Embalagens com várias unidades dentro: o custo depende de qtd_por_embalagem.
export function exigeQuantidade(unidadePreco: UnidadePreco): boolean {
  return unidadePreco === "CX" || unidadePreco === "FD" || unidadePreco === "BLD";
}

export function calcularUnidadeBase(unidadePreco: UnidadePreco, pesoVolume: PesoVolume | null): UnidadeBase {
  if (unidadePreco === "KG") return "g";
  return pesoVolume?.medida ?? "un";
}

// R$ por g, ml ou unidade. null quando a embalagem é CX/FD/BLD e ainda não se
// sabe quantas unidades vêm dentro.
export function calcularCustoBase(
  preco: number,
  unidadePreco: UnidadePreco,
  pesoVolume: PesoVolume | null,
  qtdPorEmbalagem: number | null,
): number | null {
  if (unidadePreco === "KG") return preco / 1000;
  const conteudo = pesoVolume?.valor ?? 1;
  if (exigeQuantidade(unidadePreco)) {
    if (!qtdPorEmbalagem || qtdPorEmbalagem <= 0) return null;
    return preco / (qtdPorEmbalagem * conteudo);
  }
  return preco / conteudo;
}

export function calcularCustoInsumo(custoBase: number | null, rendimento: number): number | null {
  if (custoBase === null || !(rendimento > 0)) return null;
  return custoBase / (rendimento / 100);
}

// Converte o custo por g/ml para R$/kg ou R$/L, que é como se lê no dia a dia.
export function custoNaReferencia(custo: number, unidadeBase: UnidadeBase): { valor: number; rotulo: string } {
  if (unidadeBase === "g") return { valor: custo * 1000, rotulo: "kg" };
  if (unidadeBase === "ml") return { valor: custo * 1000, rotulo: "L" };
  return { valor: custo, rotulo: "un" };
}

const formatadorReais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarReais(valor: number): string {
  return formatadorReais.format(valor);
}

export function formatarPesoVolume(pesoVolume: PesoVolume): string {
  const { valor, medida } = pesoVolume;
  if (valor >= 1000) {
    return `${(valor / 1000).toLocaleString("pt-BR")} ${medida === "g" ? "kg" : "L"}`;
  }
  return `${valor.toLocaleString("pt-BR")} ${medida}`;
}

// Comparação de texto sem diferenciar maiúsculas/acentos (busca por nome).
export function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}
