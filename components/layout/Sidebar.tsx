'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Pill,
  Users,
  Search,
  RefreshCw,
  AlertTriangle,
  BarChart3,
  Settings as SettingsIcon,
  Menu,
  X,
  Stethoscope,
} from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sales', label: 'New Sale (POS)', icon: ShoppingCart },
  { href: '/supply', label: 'Receive Supply', icon: Truck },
  { href: '/medicines', label: 'Medicines', icon: Pill },
  { href: '/vendors', label: 'Vendors', icon: Users },
  { href: '/query', label: 'Stock Query', icon: Search },
  { href: '/reorder', label: 'Reorder List', icon: RefreshCw },
  { href: '/expiry', label: 'Expiry Reports', icon: AlertTriangle },
  { href: '/reports', label: 'Reports & Profit', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const shopName = useAppStore((s) => s.settings.shopName);

  // Hide sidebar on print pages
  if (pathname.startsWith('/print/')) {
    return null;
  }

  const navContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-white tracking-tight">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-900/50">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="leading-tight text-emerald-400 font-extrabold text-sm tracking-wider uppercase">MSA</div>
            <div className="text-xs text-slate-400 font-normal truncate max-w-[140px]">{shopName}</div>
          </div>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-slate-400 hover:text-white p-1"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-400 flex flex-col gap-1 bg-slate-950/40">
        <div className="flex items-center justify-between text-slate-300">
          <span className="font-semibold text-emerald-400">Offline-First</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">Demo v1.0</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-normal">
          Persisted in browser storage. Ready for Vercel deployment.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Navbar with Hamburger */}
      <header className="md:hidden no-print bg-slate-900 border-b border-slate-800 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-slate-800"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-white tracking-wide text-sm">MSA – Medicine Shop</span>
        </div>
        <Link
          href="/sales"
          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 shadow"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>New Sale</span>
        </Link>
      </header>

      {/* Desktop Persistent Sidebar */}
      <aside aria-label="Sidebar navigation" className="hidden md:block w-64 flex-shrink-0 border-r border-slate-800 min-h-screen sticky top-0 h-screen no-print">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex no-print">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
