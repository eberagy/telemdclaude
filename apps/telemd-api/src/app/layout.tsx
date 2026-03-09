import { ClerkProvider } from "@clerk/nextjs";
import { validateEnv } from "@/lib/env";

// Validate environment variables at startup
if (typeof window === "undefined") {
  validateEnv();
}

export default function RootLayout({ children }: { children: React.ReactNode }): React.ReactNode {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
