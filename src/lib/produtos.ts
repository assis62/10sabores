import { addDoc, collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Produto } from "@/types/produto";

const produtosCol = collection(db, "produtos");

export type DadosProduto = Omit<Produto, "id">;

export function listenProdutos(callback: (produtos: Produto[]) => void) {
  return onSnapshot(produtosCol, (snapshot) => {
    const lista = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Produto)
      .sort((a, b) => a.nome.localeCompare(b.nome));
    callback(lista);
  });
}

function validar(dados: DadosProduto) {
  if (!dados.nome.trim()) throw new Error("Informe o nome do produto.");
  if (!(dados.preco_base >= 0)) throw new Error("Informe um preço base válido.");
  for (const linha of dados.ficha) {
    if (!(linha.quantidade > 0)) throw new Error("Toda linha da ficha precisa de quantidade maior que zero.");
    if ("nome_reservado" in linha && !linha.nome_reservado.trim()) {
      throw new Error("Toda linha reservada precisa de um nome.");
    }
  }
}

export async function criarProduto(dados: DadosProduto) {
  validar(dados);
  return addDoc(produtosCol, dados);
}

export async function atualizarProduto(id: string, dados: DadosProduto) {
  validar(dados);
  return updateDoc(doc(produtosCol, id), dados);
}

export async function alternarAtivoProduto(id: string, ativo: boolean) {
  return updateDoc(doc(produtosCol, id), { ativo });
}
