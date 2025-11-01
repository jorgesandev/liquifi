"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FileText, TrendingUp } from "lucide-react";
import { ConnectWallet } from "./ConnectWallet";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/borrow", label: "Pedir Préstamo", icon: FileText },
    { href: "/invest", label: "Invertir", icon: TrendingUp },
  ];

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <Image
                src="/LiquiFi_Logo_small.png"
                alt="LiquiFi Logo"
                width={40}
                height={40}
                className="object-contain"
                priority
                unoptimized
              />
            </div>
            <span className="text-2xl font-bold text-gray-900 hidden sm:inline">
              LiquiFi
            </span>
          </Link>

          {/* Nav Items */}
          <div className="hidden md:flex items-center gap-4 flex-1 justify-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-purple-100 text-purple-700"
                      : "text-gray-700 hover:bg-purple-50 hover:text-purple-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Wallet Connect */}
          <div className="flex items-center shrink-0">
            <ConnectWallet />
          </div>
        </div>
      </div>
    </nav>
  );
}

