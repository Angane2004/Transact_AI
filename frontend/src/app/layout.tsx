import type { Metadata } from "next";
import { Ubuntu, Ubuntu_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import BackgroundPattern from "@/components/BackgroundPattern";
import GlobalBackground from "@/components/GlobalBackground";
import { ThemeProvider } from "@/components/theme-provider";

// Font loaders must be called in module scope
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

/** Set in GitHub Actions (APK build) to avoid flaky fonts.gstatic.com fetches on the runner. */
const skipGoogleFonts = process.env.SKIP_GOOGLE_FONT_DOWNLOAD === "true";

// Use empty font config when skipping Google Fonts
const fontConfig = skipGoogleFonts
  ? { variable: "", className: "" }
  : ubuntu;

const monoFontConfig = skipGoogleFonts
  ? { variable: "", className: "" }
  : ubuntuMono;

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
        className={[fontConfig.variable, monoFontConfig.variable, "antialiased"].filter(Boolean).join(" ")}
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
