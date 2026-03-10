"use client";

import { useRef, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, Upload, Trash2, Copy, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Admin } from '@/lib/types';

export default function AdminProfilePage() {
  const { currentUser, updateUserProfile, getPartnerCountForAdmin, adminReferralCode } = useAuth();
  const { toast } = useToast();
  const admin = currentUser as Admin;

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use currentUser for the photo to ensure it updates reactively
  const photo = currentUser?.photoUrl;

  const partnerCount = getPartnerCountForAdmin(admin);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        updateUserProfile(admin.id, { photoUrl: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    updateUserProfile(admin.id, { photoUrl: null });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Referral code copied to clipboard.' });
  };

  if (!currentUser) return null;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Profile</h1>
      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="items-center text-center">
              <div className="relative">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={photo ?? undefined} alt={admin.username} />
                  <AvatarFallback><UserIcon className="h-12 w-12" /></AvatarFallback>
                </Avatar>
                <div className="absolute bottom-4 -right-2 flex gap-1">
                   <Button size="icon" variant="outline" className="h-8 w-8 rounded-full bg-background" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4" />
                  </Button>
                   {photo && (
                    <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full" onClick={handleRemovePhoto}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                 <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                />
              </div>
              <CardTitle>{admin.username}</CardTitle>
              <CardDescription>Administrator</CardDescription>
            </CardHeader>
          </Card>
        </div>
        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Team Insights</CardTitle>
                    <CardDescription>Manage your team and referral information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div>
                            <p className="text-sm text-muted-foreground">Your Unique Referral ID</p>
                            <p className="text-2xl font-bold tracking-widest text-primary">{adminReferralCode}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => adminReferralCode && copyToClipboard(adminReferralCode)}>
                            <Copy className="h-6 w-6"/>
                        </Button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-primary/10 rounded-full">
                             <Users className="h-6 w-6 text-primary" />
                           </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Partners Joined</p>
                                <p className="text-2xl font-bold">{partnerCount}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
