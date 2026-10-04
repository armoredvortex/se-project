import type { Metadata } from 'next';
import './globals.css';
import { HydrationShield } from '@/components/layout/HydrationShield';
import { Sidebar } from '@/components/layout/Sidebar';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'MSA – Medicine Shop Automation',
  description: 'Clean, professional retail medicine shop automation system with live inventory, FEFO batch allocation, and financial analytics.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col selection:bg-emerald-500 selection:text-white">
        <HydrationShield>
          <ToastProvider>
            <div className="flex-1 flex flex-col md:flex-row min-h-0">
              <Sidebar />
              <main className="flex-1 min-w-0 overflow-y-auto">
                {children}
              </main>
            </div>
          </ToastProvider>
        </HydrationShield>
      </body>
    </html>
  );
}
