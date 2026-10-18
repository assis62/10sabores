// Utilitário avulso pra cadastrar o PRIMEIRO admin num projeto novo: a tela de
// Funcionários só abre pra admin, então alguém precisa virar admin por fora.
// Não faz parte do app — roda direto contra o Firestore de produção via Admin
// SDK. A pessoa precisa já ter entrado no app uma vez (com e-mail/senha ou
// Google), pra conta existir no Firebase Auth.
//
// Uso:
//   npx tsx scripts/cadastrar-admin.mts dono@email.com "Nome"              -> dry run: só mostra o que mudaria
//   npx tsx scripts/cadastrar-admin.mts dono@email.com "Nome" --confirmar  -> grava de verdade
//
// Se já houver um funcionário com esse UID, só marca `admin: true` nele.
//
// Requer FIREBASE_SERVICE_ACCOUNT_KEY em .env.local.

process.loadEnvFile(".env.local");

import { getAdminAuth, getAdminDb } from "../src/lib/firebase-admin";

async function main() {
  const confirmar = process.argv.includes("--confirmar");
  const [email, nome] = process.argv.slice(2).filter((arg) => arg !== "--confirmar");

  if (!email || !nome?.trim()) {
    console.error('Informe o e-mail e o nome. Ex.: npx tsx scripts/cadastrar-admin.mts dono@email.com "Nome"');
    process.exit(1);
  }

  console.log(confirmar ? "=== EXECUÇÃO REAL ===" : "=== DRY RUN (nada será alterado) ===");

  let uid: string;
  try {
    uid = (await getAdminAuth().getUserByEmail(email)).uid;
  } catch {
    console.error(`Nenhuma conta com o e-mail ${email} no Firebase Auth. Entre no app uma vez com ele e rode de novo.`);
    process.exit(1);
  }

  const db = getAdminDb();
  const existente = await db.collection("funcionarios").where("uid_auth", "==", uid).limit(1).get();
  const doc = existente.docs[0];

  if (doc?.data().admin === true) {
    console.log(`${doc.data().nome} (uid_auth: ${uid}) já é admin. Nada a fazer.`);
    return;
  }

  if (doc) {
    console.log(`→ ${doc.data().nome} (uid_auth: ${uid}) já é funcionário — admin: ${doc.data().admin ?? "(ausente)"} -> true`);
  } else {
    console.log(`→ Novo funcionário: ${nome.trim()} (uid_auth: ${uid}), ativo e admin.`);
  }

  if (!confirmar) {
    console.log("Nada foi gravado (dry run). Revise acima e rode com --confirmar pra aplicar de verdade.");
    return;
  }

  if (doc) {
    await doc.ref.update({ admin: true });
  } else {
    await db.collection("funcionarios").add({ nome: nome.trim(), uid_auth: uid, ativo: true, admin: true });
  }
  console.log("Concluído.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("ERRO:", err);
    process.exit(1);
  });
