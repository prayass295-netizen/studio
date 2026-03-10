"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PrayasLogo } from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { LogOut, User } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function Header() {
  const { currentUser, logout, adminReferralCode } = useAuth();
  const pathname = usePathname();

  if (!currentUser) return null; // Don't render header if not logged in

  const navLinks =
    currentUser?.role === 'admin'
      ? [
          { href: '/admin/dashboard', label: 'Dashboard' },
          { href: '/admin/reports', label: 'Reports' },
          { href: '/admin/profile', label: 'Profile' },
        ]
      : [
          { href: '/partner/dashboard', label: 'Dashboard' },
          { href: '/partner/reports', label: 'My Report' },
          { href: '/partner/profile', label: 'Profile' },
        ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex items-center">
          <Link href={currentUser.role === 'admin' ? '/admin/dashboard' : '/partner/dashboard'} className="flex items-center gap-2">
            <PrayasLogo className="h-6 w-6 text-primary" />
            <span className="font-bold">Prayas</span>
          </Link>
        </div>
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'transition-colors hover:text-primary',
                pathname.startsWith(link.href) ? 'text-primary font-semibold' : 'text-muted-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
           {currentUser?.role === 'admin' && adminReferralCode && (
            <div className="hidden lg:flex items-center gap-2 rounded-md bg-muted px-3 py-1.5">
              <span className="text-sm font-medium text-muted-foreground">Your Team Code:</span>
              <span className="text-sm font-bold tracking-wider text-primary">{adminReferralCode}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
             <Avatar className="h-8 w-8 hidden sm:flex">
                <AvatarImage src={currentUser?.photoUrl ?? undefined} />
                <AvatarFallback>
                    <User className="h-4 w-4" />
                </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground hidden sm:inline">
                Welcome, <span className="font-semibold text-foreground">{currentUser?.username}</span>
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
