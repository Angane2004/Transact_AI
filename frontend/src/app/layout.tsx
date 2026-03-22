import type { Metadata } from "next";
import { Ubuntu, Ubuntu_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import BackgroundPattern from "@/components/BackgroundPattern";
import GlobalBackground from "@/components/GlobalBackground";
import { ThemeProvider } from "@/components/theme-provider";

/** Set in GitHub Actions (APK build) to avoid flaky fonts.gstatic.com fetches on the runner. */
const skipGoogleFonts = process.env.SKIP_GOOGLE_FONT_DOWNLOAD === "true";

const ubuntu = skipGoogleFonts
  ? { variable: "", className: "" }
  : Ubuntu({
      variable: "--font-ubuntu",
      subsets: ["latin"],
      weight: ["300", "400", "500", "700"],
    });

const ubuntuMono = skipGoogleFonts
  ? { variable: "", className: "" }
  : Ubuntu_Mono({
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
    <html
      lang="en"
      suppressHydrationWarning
      className={skipGoogleFonts ? "ci-system-fonts" : undefined}
    >
      <body
        className={[ubuntu.variable, ubuntuMono.variable, "antialiased"].filter(Boolean).join(" ")}
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
