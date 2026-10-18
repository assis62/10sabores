import { addDoc, collection, doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { calcularCustoBase } from "@/lib/custos";
import { db } from "@/lib/firebase";
import type { ItemCatalogo } from "@/types/catalogo";
import type { Insumo } from "@/types/insumo";

const catalogoCol = collection(db, "catalogo_fornecedor");
const insumosCol = collection(db, "insumos");

export function listenCatalogo(callback: (itens: ItemCatalogo[]) => void) {
  return onSnapshot(catalogoCol, (snapshot) => {
    const lista = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }) as ItemCatalogo)
      .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome));
    callback(lista);
  });
}

export function listenInsumos(callback: (insumos: Insumo[]) => void) {
  return onSnapshot(insumosCol, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Insumo));
  });
}

// Reativa o insumo se esse item do catálogo já foi usado antes.
export async function adicionarInsumo(item: ItemCatalogo, insumos: Insumo[]) {
  const existente = insumos.find((i) => i.catalogo_id === item.id);
  if (existente?.ativo) throw new Error("Esse item já está nos insumos.");
  if (existente) return updateDoc(doc(insumosCol, existente.id), { ativo: true });
  return addDoc(insumosCol, {
    catalogo_id: item.id,
    rendimento: 100,
    estoque_atual: 0,
    estoque_minimo: 0,
    unidade_base: item.unidade_base,
    ativo: true,
  });
}

export async function atualizarInsumo(
  id: string,
  campos: Partial<Pick<Insumo, "rendimento" | "estoque_atual" | "estoque_minimo">>,
) {
  return updateDoc(doc(insumosCol, id), campos);
}

export async function removerInsumo(id: string) {
  return updateDoc(doc(insumosCol, id), { ativo: false });
}

// A reimportação da tabela preserva esse valor e recalcula o custo com ele.
export async function salvarQtdPorEmbalagem(item: ItemCatalogo, qtd: number) {
  if (!Number.isInteger(qtd) || qtd <= 0) {
    throw new Error("Informe uma quantidade inteira maior que zero.");
  }
  return updateDoc(doc(catalogoCol, item.id), {
    qtd_por_embalagem: qtd,
    custo_base: calcularCustoBase(item.preco, item.unidade_preco, item.peso_volume, qtd),
    falta_quantidade: false,
    atualizado_em: serverTimestamp(),
  });
}
