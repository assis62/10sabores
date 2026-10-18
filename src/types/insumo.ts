import type { UnidadeBase } from "@/types/catalogo";

export interface Insumo {
  id: string;
  catalogo_id: string;
  // Percentual aproveitado (100 = sem perda). O custo do insumo é
  // custo_base ÷ (rendimento / 100), lido sempre do catálogo atual.
  rendimento: number;
  // Estoques na unidade base (g, ml ou un).
  estoque_atual: number;
  estoque_minimo: number;
  unidade_base: UnidadeBase;
  ativo: boolean;
}
