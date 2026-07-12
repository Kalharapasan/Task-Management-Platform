import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import LayoutWrapper from '@/components/LayoutWrapper';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'ShieldAML - Financial Fraud & AML Hub',
  description: 'Next-generation Anti-Money Laundering transaction tracking and GNN explainability dashboard.',
};

/**
 * Root Layout.
 * 
 * AML Architecture Context:
 * Bootstraps the layout shell. Wraps all pages in TanStack React Query providers
 * and the Authentication Context, delegating sidebar display and session gates to LayoutWrapper.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable}`}>
        <Providers>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}
