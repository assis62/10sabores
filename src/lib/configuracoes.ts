import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const segurancaRef = doc(db, "configuracoes", "seguranca");

export const PADRAO_PIN_ADMIN = /^\d{4,6}$/;

// Chama com null enquanto nenhum PIN foi cadastrado (primeiro acesso).
export function listenPinAdmin(callback: (pin: string | null) => void) {
  return onSnapshot(segurancaRef, (snap) => {
    const pin = snap.data()?.pin_admin;
    callback(typeof pin === "string" && PADRAO_PIN_ADMIN.test(pin) ? pin : null);
  });
}

export async function salvarPinAdmin(pin: string) {
  if (!PADRAO_PIN_ADMIN.test(pin)) {
    throw new Error("O PIN precisa ter de 4 a 6 dígitos.");
  }
  return setDoc(segurancaRef, { pin_admin: pin }, { merge: true });
}
