import type { Timestamp } from "firebase/firestore";

export type StatusCaixa = "aberto" | "fechado";

export interface Caixa {
  id: string;
  data_abertura: Timestamp;
  valor_abertura: number;
  data_fechamento?: Timestamp;
  valor_fechamento_informado?: number;
  status: StatusCaixa;
  aberto_por?: string;
  fechado_por?: string;
}

export type TipoMovimentacaoCaixa = "sangria" | "suprimento";

export interface MovimentacaoCaixa {
  id: string;
  caixa_id: string;
  tipo: TipoMovimentacaoCaixa;
  valor: number;
  motivo: string;
  data_hora: Timestamp;
}
