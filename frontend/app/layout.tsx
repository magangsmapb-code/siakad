import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { ThemeInitializer } from "@/components/theme/theme-initializer";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SIAKAD | SMA Pemberdayaan Bangsa",
  description: "Sistem informasi akademik SMA Pemberdayaan Bangsa.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={poppins.variable}>
      <body><ThemeInitializer />{children}</body>
    </html>
  );
}
