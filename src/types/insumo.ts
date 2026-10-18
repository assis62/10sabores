import type { UnidadeBase } from "@/types/catalogo";

export interface Insumo {
  id: string;
  // null no insumo manual (sem item do catálogo, ex.: caixa de pizza, massa
  // caseira); aí valem `nome` e `custo_manual`.
  catalogo_id: string | null;
  nome?: string;
  // R$ por unidade base (g, ml ou un), só no insumo manual.
  custo_manual?: number | null;
  // Percentual aproveitado (100 = sem perda). O custo do insumo é
  // custo ÷ (rendimento / 100), lido sempre do catálogo atual.
  rendimento: number;
  // Estoques na unidade base (g, ml ou un).
  estoque_atual: number;
  estoque_minimo: number;
  unidade_base: UnidadeBase;
  ativo: boolean;
}
