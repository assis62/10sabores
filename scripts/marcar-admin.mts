// Utilitário avulso pra marcar `admin: true` nos funcionários indicados. Não
// faz parte do app — roda direto contra o Firestore de produção via Admin SDK.
// Cada argumento pode ser o nome do funcionário (sem diferenciar
// maiúsculas/acentos), o UID do login (uid_auth) ou o ID do documento.
//
// Uso:
//   npx tsx scripts/marcar-admin.mts "Maria" abc123UID              -> dry run: só mostra o que mudaria
//   npx tsx scripts/marcar-admin.mts "Maria" abc123UID --confirmar  -> grava de verdade
//
// Se algum argumento não bater com exatamente um funcionário, nada é gravado.
//
// Requer FIREBASE_SERVICE_ACCOUNT_KEY em .env.local.

process.loadEnvFile(".env.local");

import { getAdminDb } from "../src/lib/firebase-admin";

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

async function main() {
  const confirmar = process.argv.includes("--confirmar");
  const alvos = process.argv.slice(2).filter((arg) => arg !== "--confirmar");

  if (alvos.length === 0) {
    console.error('Informe ao menos um nome ou UID. Ex.: npx tsx scripts/marcar-admin.mts "Maria" abc123UID');
    process.exit(1);
  }

  const db = getAdminDb();
  console.log(confirmar ? "=== EXECUÇÃO REAL ===" : "=== DRY RUN (nada será alterado) ===");

  const snapshot = await db.collection("funcionarios").get();
  const idsParaMarcar = new Set<string>();
  let problemas = 0;

  console.log();
  for (const alvo of alvos) {
    const encontrados = snapshot.docs.filter((doc) => {
      const dados = doc.data();
      return (
        doc.id === alvo ||
        dados.uid_auth === alvo ||
        (typeof dados.nome === "string" && normalizar(dados.nome) === normalizar(alvo))
      );
    });

    if (encontrados.length === 0) {
      console.log(`  ✗ "${alvo}": nenhum funcionário encontrado.`);
      problemas++;
      continue;
    }
    if (encontrados.length > 1) {
      console.log(`  ✗ "${alvo}": ${encontrados.length} funcionários batem — use o UID pra desambiguar:`);
      for (const doc of encontrados) {
        const dados = doc.data();
        console.log(`      - [${doc.id}] ${dados.nome} (uid_auth: ${dados.uid_auth})`);
      }
      problemas++;
      continue;
    }

    const [doc] = encontrados;
    const dados = doc.data();
    const situacao = dados.ativo === false ? " [INATIVO]" : "";
    if (dados.admin === true) {
      console.log(`  = "${alvo}": ${dados.nome}${situacao} (uid_auth: ${dados.uid_auth}) já é admin.`);
    } else {
      console.log(
        `  → "${alvo}": ${dados.nome}${situacao} (uid_auth: ${dados.uid_auth}) — admin: ${dados.admin ?? "(ausente)"} -> true`,
      );
      idsParaMarcar.add(doc.id);
    }
  }

  console.log();
  if (problemas > 0) {
    console.log(`${problemas} argumento(s) com problema. Nada foi gravado — corrija e rode de novo.`);
    process.exit(1);
  }

  if (!confirmar) {
    console.log(
      `Total: ${idsParaMarcar.size} funcionário(s) seriam marcados como admin. Nada foi gravado (dry run). Revise acima e rode com --confirmar pra aplicar de verdade.`,
    );
    return;
  }

  if (idsParaMarcar.size > 0) {
    const lote = db.batch();
    for (const id of idsParaMarcar) {
      lote.update(db.collection("funcionarios").doc(id), { admin: true });
    }
    await lote.commit();
  }
  console.log(`Concluído. ${idsParaMarcar.size} funcionário(s) marcados como admin.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("ERRO:", err);
    process.exit(1);
  });
