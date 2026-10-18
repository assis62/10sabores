import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "10 Sabores",
  description: "Sistema de gestão da 10 Sabores",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "10 Sabores",
  },
  other: {
    // Next.js só emite a tag moderna "mobile-web-app-capable"; o iOS Safari
    // ainda depende da tag legada pra abrir em modo standalone sem a barra do
    // navegador quando adicionado à tela inicial.
    "apple-mobile-web-app-capable": "yes",
  },
};

// Sempre modo claro, independente do tema do sistema/navegador — evita a
// classe de bug de contraste de texto sem cor explícita em modo escuro.
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#27272a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
