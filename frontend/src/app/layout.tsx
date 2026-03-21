import type { Metadata } from "next";
import { Ubuntu, Ubuntu_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import BackgroundPattern from "@/components/BackgroundPattern";
import GlobalBackground from "@/components/GlobalBackground";
import { ThemeProvider } from "@/components/theme-provider";

const ubuntu = Ubuntu({
  variable: "--font-ubuntu",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const ubuntuMono = Ubuntu_Mono({
  variable: "--font-ubuntu-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "TransactAI",
  description: "AI-powered transaction categorization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${ubuntu.variable} ${ubuntuMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <GlobalBackground />
          <BackgroundPattern />
          {children}
          <Toaster
            position="top-right"
            expand={true}
            richColors
            toastOptions={{
              style: {
                padding: '16px',
                fontSize: '14px',
              },
              className: 'toast-custom',
              duration: 5000,
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
