import { Geist } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/lib/query-provider";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <QueryProvider>
        <body className={`${geistSans.className} antialiased`}>{children}</body>
      </QueryProvider>
      <Toaster />
    </html>
  );
}
