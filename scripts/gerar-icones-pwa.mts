// Utilitário de uso único pra gerar os ícones da PWA. Não faz parte do app em
// runtime — roda localmente e grava os arquivos em public/.
//
// Uso: npx tsx scripts/gerar-icones-pwa.mts
//
// Gera public/icon-192.png, public/icon-512.png e public/apple-touch-icon.png.
// PROVISÓRIO: enquanto a logo da 10 Sabores não está definida, o ícone é só
// "10" sobre a cor primária da paleta neutra. Quando a logo chegar, troque o
// SVG abaixo pela logo (sharp aceita PNG/SVG) e atualize COR_FUNDO.

import path from "path";
import sharp from "sharp";

const COR_FUNDO = "#27272a";

function svgIcone(tamanho: number) {
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="${COR_FUNDO}" />
      <text x="50" y="50" dy="0.35em" text-anchor="middle" fill="#ffffff"
        font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="46">10</text>
    </svg>
  `);
}

async function gerarIcone(tamanho: number, arquivoSaida: string) {
  const destino = path.join(process.cwd(), "public", arquivoSaida);
  await sharp(svgIcone(tamanho)).png().toFile(destino);
  console.log(`Gerado public/${arquivoSaida} (${tamanho}x${tamanho})`);
}

async function main() {
  await gerarIcone(192, "icon-192.png");
  await gerarIcone(512, "icon-512.png");
  await gerarIcone(180, "apple-touch-icon.png");
  console.log("Concluído.");
}

main().catch((err) => {
  console.error("ERRO:", err);
  process.exit(1);
});
