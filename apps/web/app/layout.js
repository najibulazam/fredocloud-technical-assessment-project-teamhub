import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Team Hub",
  description: "Team collaboration hub"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
