import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AgentOps — Control Center",
  description: "TeleMD AgentOps multi-agent control plane",
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.ReactNode {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased">{children}</body>
    </html>
  );
}
