import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getNomeFuncionarioPorUid } from "@/lib/funcionarios";
import type { Caixa, MovimentacaoCaixa, TipoMovimentacaoCaixa } from "@/types/caixa";

const caixasCol = collection(db, "caixas");
const movimentacoesCaixaCol = collection(db, "movimentacoes_caixa");

export function listenCaixaAberto(callback: (caixa: Caixa | null) => void) {
  const q = query(caixasCol, where("status", "==", "aberto"), limit(1));
  return onSnapshot(q, (snapshot) => {
    const doc0 = snapshot.docs[0];
    callback(doc0 ? ({ id: doc0.id, ...doc0.data() } as Caixa) : null);
  });
}

export async function getCaixaAbertoId(): Promise<string | null> {
  const q = query(caixasCol, where("status", "==", "aberto"), limit(1));
  const snapshot = await getDocs(q);
  return snapshot.docs[0]?.id ?? null;
}

// O caixa mais recente da coleção, seja qual for o status. Enquanto não há
// caixa aberto, esse é sempre o último fechado — é o único elegível pra
// reabertura, pra não bagunçar o histórico reabrindo caixas mais antigos.
export function listenUltimoCaixa(callback: (caixa: Caixa | null) => void) {
  const q = query(caixasCol, orderBy("data_abertura", "desc"), limit(1));
  return onSnapshot(q, (snapshot) => {
    const doc0 = snapshot.docs[0];
    callback(doc0 ? ({ id: doc0.id, ...doc0.data() } as Caixa) : null);
  });
}

async function getUltimoCaixa(): Promise<Caixa | null> {
  const q = query(caixasCol, orderBy("data_abertura", "desc"), limit(1));
  const snapshot = await getDocs(q);
  const doc0 = snapshot.docs[0];
  return doc0 ? ({ id: doc0.id, ...doc0.data() } as Caixa) : null;
}

export async function abrirCaixa(valorAbertura: number) {
  const existente = await getCaixaAbertoId();
  if (existente) {
    throw new Error("Já existe um caixa aberto.");
  }
  const nomeFuncionario = await getNomeFuncionarioPorUid(auth.currentUser?.uid);
  return addDoc(caixasCol, {
    data_abertura: serverTimestamp(),
    valor_abertura: valorAbertura,
    status: "aberto",
    ...(nomeFuncionario ? { aberto_por: nomeFuncionario } : {}),
  });
}

export async function fecharCaixa(
  caixaId: string,
  valorFechamentoInformado: number,
): Promise<string | null> {
  const nomeFuncionario = await getNomeFuncionarioPorUid(auth.currentUser?.uid);
  await updateDoc(doc(caixasCol, caixaId), {
    data_fechamento: serverTimestamp(),
    valor_fechamento_informado: valorFechamentoInformado,
    status: "fechado",
    ...(nomeFuncionario ? { fechado_por: nomeFuncionario } : {}),
  });
  return nomeFuncionario;
}

export async function reabrirCaixa(caixaId: string) {
  const existente = await getCaixaAbertoId();
  if (existente) {
    throw new Error("Já existe um caixa aberto.");
  }
  const ultimo = await getUltimoCaixa();
  if (!ultimo || ultimo.id !== caixaId || ultimo.status !== "fechado") {
    throw new Error("Só é possível reabrir o caixa fechado mais recente.");
  }
  await updateDoc(doc(caixasCol, caixaId), {
    status: "aberto",
    data_fechamento: deleteField(),
    valor_fechamento_informado: deleteField(),
    fechado_por: deleteField(),
  });
}

export function listenCaixas(callback: (caixas: Caixa[]) => void, limiteRegistros = 500) {
  const q = query(caixasCol, orderBy("data_abertura", "desc"), limit(limiteRegistros));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Caixa));
  });
}

export function listenTodasMovimentacoesCaixa(
  callback: (movimentacoes: MovimentacaoCaixa[]) => void,
  limiteRegistros = 2000,
) {
  const q = query(movimentacoesCaixaCol, orderBy("data_hora", "desc"), limit(limiteRegistros));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as MovimentacaoCaixa));
  });
}

export function listenMovimentacoesCaixa(
  caixaId: string,
  callback: (movimentacoes: MovimentacaoCaixa[]) => void,
) {
  const q = query(movimentacoesCaixaCol, where("caixa_id", "==", caixaId));
  return onSnapshot(q, (snapshot) => {
    const lista = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }) as MovimentacaoCaixa)
      .sort((a, b) => (b.data_hora?.toMillis() ?? 0) - (a.data_hora?.toMillis() ?? 0));
    callback(lista);
  });
}

export async function registrarMovimentacaoCaixa(
  caixaId: string,
  tipo: TipoMovimentacaoCaixa,
  valor: number,
  motivo: string,
) {
  return addDoc(movimentacoesCaixaCol, {
    caixa_id: caixaId,
    tipo,
    valor,
    motivo,
    data_hora: serverTimestamp(),
  });
}
