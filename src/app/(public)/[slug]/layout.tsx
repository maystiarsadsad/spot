import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Spot",
    default: "Spot",
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
