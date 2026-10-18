// Marca, só nesta aba do navegador, que o admin já digitou o PIN. Guarda o
// UID pra que outro login na mesma aba não herde a liberação. Todo acesso
// fica em try/catch: sessionStorage pode estar bloqueado (aba anônima etc.),
// e aí o pior caso é pedir o PIN de novo.
const CHAVE = "10sabores:pin-admin-ok";

export function pinAdminLiberado(uid: string): boolean {
  try {
    return sessionStorage.getItem(CHAVE) === uid;
  } catch {
    return false;
  }
}

export function liberarPinAdmin(uid: string) {
  try {
    sessionStorage.setItem(CHAVE, uid);
  } catch {
    // Sem sessionStorage a liberação vale só enquanto a tela estiver montada.
  }
}

export function limparPinAdmin() {
  try {
    sessionStorage.removeItem(CHAVE);
  } catch {
    // Nada a limpar.
  }
}
