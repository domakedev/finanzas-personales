import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import DataLoader from "@/components/DataLoader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Finanzas Personales Perú - Gestiona tu dinero inteligentemente',
  description: 'La mejor app para controlar tus gastos, ahorros y deudas en Perú. Compatible con Yape, Plin y todos los bancos.',
  keywords: 'finanzas personales, peru, ahorro, gastos, deudas, yape, plin, bcp, interbank',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <DataLoader>
            {children}
          </DataLoader>
        </AuthProvider>
      </body>
    </html>
  );
}
