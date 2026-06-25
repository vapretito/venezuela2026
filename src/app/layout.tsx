import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Venezuela 2026",
  description:
    "Registro solidario de personas desaparecidas tras el terremoto en Caracas.",
  icons: {
    icon: "/bandera/flag.avif",
    shortcut: "/bandera/flag.avif",
    apple: "/bandera/flag.avif",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${manrope.variable} ${cormorant.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
