import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Funcionario } from "@/types/funcionario";

const funcionariosCol = collection(db, "funcionarios");

export function listenFuncionarios(callback: (funcionarios: Funcionario[]) => void) {
  return onSnapshot(funcionariosCol, (snapshot) => {
    const lista = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Funcionario)
      .sort((a, b) => a.nome.localeCompare(b.nome));
    callback(lista);
  });
}

export async function criarFuncionario(nome: string, uidAuth: string) {
  return addDoc(funcionariosCol, {
    nome,
    uid_auth: uidAuth,
    ativo: true,
    admin: false,
  });
}

export async function alternarAtivoFuncionario(id: string, ativo: boolean) {
  return updateDoc(doc(funcionariosCol, id), { ativo });
}

export async function getNomeFuncionarioPorUid(uid?: string | null): Promise<string | null> {
  if (!uid) return null;
  const q = query(funcionariosCol, where("uid_auth", "==", uid), limit(1));
  const snapshot = await getDocs(q);
  const dados = snapshot.docs[0]?.data();
  return typeof dados?.nome === "string" ? dados.nome : null;
}

export function listenAdminPorUid(uid: string, callback: (admin: boolean) => void) {
  const q = query(funcionariosCol, where("uid_auth", "==", uid), limit(1));
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs[0]?.data().admin === true),
    () => callback(false),
  );
}
