import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ReconcileFlow — Financial Reconciliation & Revenue Leakage Dashboard',
  description: 'Enterprise-grade deterministic financial reconciliation engine & AI auditor for e-commerce store orders and payment processors.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
