"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PrayasLogo } from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Copy } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AdminAuthPage() {
  const { login, registerAdmin, adminReferralCode } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', password: '' },
  });

  const onLoginSubmit = (data: LoginFormValues) => {
    const user = login(data.username, data.password);
    if (user && user.role === 'admin') {
      toast({ title: 'Success', description: `Welcome back, ${user.username}!` });
      router.push('/admin/dashboard');
    } else if (user) {
        toast({ variant: 'destructive', title: 'Access Denied', description: 'This account is not an admin account.' });
    }
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    const admin = registerAdmin(data.username, data.password);
    if (admin) {
      setGeneratedCode(admin.referralCode);
      toast({ title: 'Admin Account Created', description: 'Your admin account and referral code have been generated.' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Referral code copied to clipboard.' });
  };
  
  const hasAdmin = !!adminReferralCode;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Tabs defaultValue={hasAdmin ? 'login' : 'register'} className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex items-center gap-2">
            <PrayasLogo className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Prayas - Admin</span>
          </Link>
        </div>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login" disabled={!hasAdmin}>Login</TabsTrigger>
          <TabsTrigger value="register" disabled={hasAdmin}>Register</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Admin Login</CardTitle>
              <CardDescription>Enter your credentials to access the admin dashboard.</CardDescription>
            </CardHeader>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Username</Label>
                  <Input id="login-username" {...loginForm.register('username')} />
                  {loginForm.formState.errors.username && <p className="text-sm text-destructive">{loginForm.formState.errors.username.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" type="password" {...loginForm.register('password')} />
                  {loginForm.formState.errors.password && <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>}
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
                  {loginForm.formState.isSubmitting ? 'Signing In...' : 'Sign In'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle>Create Admin Account</CardTitle>
              <CardDescription>
                {generatedCode ? 'Your account has been created.' : 'Set up your admin account. This can only be done once.'}
              </CardDescription>
            </CardHeader>
            {generatedCode ? (
              <CardContent>
                <div className="space-y-4 text-center">
                    <p>Your unique 6-digit referral code is:</p>
                    <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg">
                        <span className="text-2xl font-bold tracking-widest text-primary">{generatedCode}</span>
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(generatedCode)}>
                            <Copy className="h-5 w-5"/>
                        </Button>
                    </div>
                    <p className="text-muted-foreground text-sm">Partners will use this code to register. Keep it safe.</p>
                </div>
                 <Button onClick={() => router.push('/login/admin')} className="w-full mt-6">
                    Proceed to Login
                </Button>
              </CardContent>
            ) : (
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-username">Username</Label>
                  <Input id="register-username" {...registerForm.register('username')} />
                  {registerForm.formState.errors.username && <p className="text-sm text-destructive">{registerForm.formState.errors.username.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input id="register-password" type="password" {...registerForm.register('password')} />
                  {registerForm.formState.errors.password && <p className="text-sm text-destructive">{registerForm.formState.errors.password.message}</p>}
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={registerForm.formState.isSubmitting}>
                  {registerForm.formState.isSubmitting ? 'Creating Account...' : 'Create Account'}
                </Button>
              </CardFooter>
            </form>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
