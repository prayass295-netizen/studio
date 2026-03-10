"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PrayasLogo } from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { LogOut, User, Menu, ClipboardList } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTrigger,
} from '@/components/ui/sheet';

export function Header() {
  const { currentUser, logout, adminReferralCode } = useAuth();
  const pathname = usePathname();

  if (!currentUser) return null;

  const navLinks =
    currentUser?.role === 'admin'
      ? [
          { href: '/admin/dashboard', label: 'Dashboard' },
          { href: '/admin/tasks', label: 'Tasks' },
          { href: '/admin/reports', label: 'Reports' },
          { href: '/admin/profile', label: 'Profile' },
        ]
      : [
          { href: '/partner/dashboard', label: 'Dashboard' },
          { href: '/partner/tasks', label: 'My Tasks' },
          { href: '/partner/reports', label: 'My Report' },
          { href: '/partner/profile', label: 'Profile' },
        ];

  const homeLink = currentUser.role === 'admin' ? '/admin/dashboard' : '/partner/dashboard';

  const MobileNav = (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-full max-w-xs flex-col p-0">
        <div className="border-b p-4">
          <SheetClose asChild>
            <Link href={homeLink} className="flex items-center gap-2">
              <PrayasLogo className="h-7 w-7 text-primary" />
              <span className="font-bold text-lg">Prayas</span>
            </Link>
          </SheetClose>
        </div>
        <nav className="flex flex-col gap-4 p-4 text-base">
          {navLinks.map((link) => (
            <SheetClose asChild key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  'font-medium transition-colors hover:text-primary',
                  pathname.startsWith(link.href) ? 'text-primary' : 'text-foreground'
                )}
              >
                {link.label}
              </Link>
            </SheetClose>
          ))}
        </nav>
        <div className="mt-auto space-y-4 border-t p-4">
          {currentUser?.role === 'admin' && adminReferralCode && (
            <div className="flex flex-col items-center gap-1 rounded-md bg-muted px-3 py-2">
              <span className="text-sm font-medium text-muted-foreground">Your Team Code</span>
              <span className="text-base font-bold tracking-wider text-primary">{adminReferralCode}</span>
            </div>
          )}
           <div className="flex items-center gap-3">
             <Avatar className="h-9 w-9">
                <AvatarImage src={currentUser?.photoUrl ?? undefined} />
                <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
            </Avatar>
            <div>
                <p className="text-sm text-muted-foreground">Welcome,</p>
                <p className="font-semibold text-foreground -mt-1">{currentUser?.username}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={logout}>
            <LogOut className="mr-2" /> Logout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center">
        <div className="flex items-center gap-6">
          {MobileNav}
          <Link href={homeLink} className="hidden items-center gap-2 md:flex">
            <PrayasLogo className="h-6 w-6 text-primary" />
            <span className="font-bold">Prayas</span>
          </Link>
          <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
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
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          {currentUser?.role === 'admin' && adminReferralCode && (
            <div className="hidden lg:flex items-center gap-2 rounded-md bg-muted px-3 py-1.5">
              <span className="text-sm font-medium text-muted-foreground">Your Team Code:</span>
              <span className="text-sm font-bold tracking-wider text-primary">{adminReferralCode}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={currentUser?.photoUrl ?? undefined} />
              <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
            </Avatar>
            <span className="hidden text-sm text-muted-foreground sm:inline">
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
