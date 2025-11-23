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
  description: 'La mejor aplicación para controlar tus gastos, ahorros y deudas en Perú. Compatible con Yape, Plin, BCP, Interbank y más. 100% gratis y seguro.',
  keywords: ['finanzas personales', 'peru', 'ahorro', 'gastos', 'deudas', 'yape', 'plin', 'bcp', 'interbank', 'presupuesto', 'app financiera'],
  authors: [{ name: 'Finanzas Personales Perú' }],
  creator: 'Finanzas Personales Perú',
  publisher: 'Finanzas Personales Perú',
  metadataBase: new URL('https://finanzas-personales-peru.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    url: '/',
    title: 'Finanzas Personales Perú - Gestiona tu dinero inteligentemente',
    description: 'La mejor aplicación para controlar tus gastos, ahorros y deudas en Perú. Compatible con Yape, Plin, BCP, Interbank y más.',
    siteName: 'Finanzas Personales Perú',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Finanzas Personales Perú',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Finanzas Personales Perú - Gestiona tu dinero inteligentemente',
    description: 'La mejor app para controlar tus gastos, ahorros y deudas en Perú. Compatible con Yape, Plin y todos los bancos.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your verification codes here when available
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
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
