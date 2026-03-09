import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, User } from 'lucide-react';
import { PrayasLogo } from '@/components/icons';

export default function RoleSelectionPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="flex flex-col items-center text-center mb-12">
        <PrayasLogo className="h-20 w-20 mb-4 text-primary" />
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl font-headline">
          Welcome to Prayas
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground sm:text-lg md:mt-5 md:max-w-2xl md:text-xl">
          Your reliable attendance and payroll management system.
        </p>
        <p className="mt-6 font-semibold text-foreground">Choose your role to continue</p>
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:max-w-4xl w-full">
        <Card className="transform transition-transform duration-300 hover:scale-105 hover:shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Shield className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl font-semibold">Admin</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center">
            <p className="mb-6 text-muted-foreground">Manage partners, approve requests, and view overall reports.</p>
            <Button asChild className="w-full" size="lg">
              <Link href="/login/admin">
                Login as Admin <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="transform transition-transform duration-300 hover:scale-105 hover:shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 bg-accent/10 rounded-full">
                <User className="h-8 w-8 text-accent" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl font-semibold">Partner</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center">
            <p className="mb-6 text-muted-foreground">Check-in/out, view your attendance, and track your payroll.</p>
            <Button asChild className="w-full" size="lg" variant="secondary">
              <Link href="/login/partner">
                Login as Partner <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
