import type { UnidadeBase } from "@/types/catalogo";

export const CATEGORIAS_PRODUTO = ["pizza", "lanche", "porção", "bebida", "milk-shake", "adicional"] as const;

export type CategoriaProduto = (typeof CATEGORIAS_PRODUTO)[number];

// Quantidade na unidade base do insumo.
export interface LinhaFichaVinculada {
  insumo_id: string;
  quantidade: number;
}

// Insumo que ainda não foi cadastrado; vira vinculada pelo botão "Vincular".
export interface LinhaFichaReservada {
  nome_reservado: string;
  quantidade: number;
  unidade: UnidadeBase;
}

export type LinhaFicha = LinhaFichaVinculada | LinhaFichaReservada;

export interface Produto {
  id: string;
  nome: string;
  categoria: CategoriaProduto;
  ativo: boolean;
  preco_base: number;
  ficha: LinhaFicha[];
  // Só pra mostrar o preço sugerido; o preco_base é sempre digitado à mão.
  margem_desejada?: number | null;
}
