import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/lib/ui/theme";
import "./globals.css";

/*
 * Three faces, each doing one job — the split the design specifies:
 *   Space Grotesk  headings, where the product has a voice
 *   Inter          body and UI, comfortable at long-form reading sizes
 *   JetBrains Mono every figure, so compared numbers align (UI_PRD §5)
 */
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PMIE — Why did this market move?",
  description:
    "Causal explanations for Polymarket price movements: whale activity, volume spikes, liquidity crunches and cited news, with a confidence score that is re-checked after 48 hours. Research tooling, not financial advice.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/*
          Stamps data-theme before first paint. Without it the page renders in
          the token sheet's default and visibly flips once React hydrates —
          on every navigation, for anyone whose choice isn't the default.

          suppressHydrationWarning above is required because this script
          mutates <html> before React sees it; the attribute is the only
          difference, and it is intentional.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
