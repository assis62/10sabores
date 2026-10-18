import type { Timestamp } from "firebase/firestore";

export type UnidadePreco = "KG" | "UNI" | "CX" | "FD" | "BLD" | "GLA";

// Unidade em que o custo_base é expresso: R$ por grama, mililitro ou unidade.
export type UnidadeBase = "g" | "ml" | "un";

export interface PesoVolume {
  valor: number;
  medida: "g" | "ml";
}

export interface ItemCatalogo {
  id: string;
  nome: string;
  categoria: string;
  preco: number;
  unidade_preco: UnidadePreco;
  // Peso ou volume lido do nome (ex.: "500G", "1,5L"). Em CX/FD/BLD é o
  // conteúdo de cada unidade dentro da embalagem.
  peso_volume: PesoVolume | null;
  // Preenchido à mão (tela /insumos) para CX/FD/BLD; a reimportação preserva.
  qtd_por_embalagem: number | null;
  custo_base: number | null;
  unidade_base: UnidadeBase;
  falta_quantidade: boolean;
  fornecedor: string;
  // false quando o item sumiu da última tabela importada.
  na_tabela: boolean;
  atualizado_em?: Timestamp;
}
