"use client";

import { useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, Upload, Trash2, Copy, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Admin } from '@/lib/types';
import { Loader } from 'lucide-react';
import { compressImage } from '@/lib/utils';

export default function AdminProfilePage() {
  const { currentUser, updateUserProfile, getPartnerCountForAdmin, adminReferralCode } = useAuth();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const admin = currentUser as Admin | null;

  if (!admin) {
    return (
       <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const photo = currentUser?.photoUrl;

  const partnerCount = getPartnerCountForAdmin(admin);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const compressedImage = await compressImage(file, { maxSizeMB: 0.2, maxWidthOrHeight: 512 });
        updateUserProfile(admin.id, { photoUrl: compressedImage });
      } catch (error) {
        console.error("Failed to compress image", error);
        toast({
          variant: "destructive",
          title: "Image Processing Failed",
          description: "Could not process the selected image. Please try another one.",
        });
      }
    }
  };

  const handleRemovePhoto = () => {
    updateUserProfile(admin.id, { photoUrl: null });
  };

  const copyToClipboard = (text: string | null) => {
    if (!text) {
      toast({ variant: 'destructive', title: 'Error', description: 'No code to copy.' });
      return;
    }

    // Modern browsers with secure context
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => {
          toast({ title: 'Copied!', description: 'Referral code copied to clipboard.' });
        })
        .catch(err => {
          console.error('Async clipboard copy failed: ', err);
          toast({ variant: 'destructive', title: 'Copy Failed', description: 'Could not copy the code.' });
        });
    } else {
      // Fallback for older browsers or insecure contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      // Make it non-visible
      textArea.style.position = 'fixed';
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = '1px';
      textArea.style.height = '1px';
      textArea.style.padding = 0;
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      let success = false;
      try {
        success = document.execCommand('copy');
      } catch (err) {
        console.error('Fallback execCommand copy failed: ', err);
      }

      document.body.removeChild(textArea);

      if (success) {
        toast({ title: 'Copied!', description: 'Referral code copied to clipboard.' });
      } else {
        toast({ variant: 'destructive', title: 'Copy Failed', description: 'Your browser does not support copying.' });
      }
    }
  };

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
                  accept="image/jpeg, image/png"
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
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(adminReferralCode)}>
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
