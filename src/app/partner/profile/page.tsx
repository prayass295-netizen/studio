"use client";

import { useRef, useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, Upload, Trash2, Phone, Shield, Wallet, Award, Loader } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Partner } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';


export default function PartnerProfilePage() {
  const { currentUser, updateUserProfile, getAdminForPartner, getTasksForPartner, getAdminSettings } = useAuth();
  
  const partner = currentUser as Partner | null;
  const admin = partner ? getAdminForPartner(partner) : null;
  const adminSettings = getAdminSettings();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phoneNumber, setPhoneNumber] = useState(partner?.phoneNumber || '');

  const partnerTasks = useMemo(() => {
    if (!partner) return [];
    return getTasksForPartner(partner.id);
  }, [partner, getTasksForPartner]);
  
  const approvedTasksCount = useMemo(() => {
    return partnerTasks.filter(t => t.status === 'Approved').length;
  }, [partnerTasks]);

  const bonusTarget = adminSettings?.monthlyTaskTarget ?? 10;
  const bonusAmount = adminSettings?.monthlyTaskBonus ?? 2000;
  const progressPercentage = (approvedTasksCount / bonusTarget) * 100;


  // Effect to sync phone number if currentUser changes from another tab
  useEffect(() => {
    if (partner) {
      setPhoneNumber(partner.phoneNumber || '');
    }
  }, [partner]);

  if (!currentUser || !partner) {
    return (
       <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const photo = currentUser?.photoUrl;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        updateUserProfile(partner.id, { photoUrl: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    updateUserProfile(partner.id, { photoUrl: null });
  };

  const handleSaveChanges = () => {
    updateUserProfile(partner.id, { phoneNumber });
  };
  
  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="items-center text-center">
              <div className="relative">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={photo ?? undefined} alt={partner.username} />
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
              <CardTitle>{partner.username}</CardTitle>
              <CardDescription>{partner.destination ?? 'Partner'}</CardDescription>
            </CardHeader>
             <CardContent>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg"><Wallet className="h-5 w-5"/>Incentive Wallet</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Earned Incentives</p>
                            <p className="text-3xl font-bold text-green-600">{formatCurrency(partner.walletBalance ?? 0)}</p>
                        </div>
                         <div>
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-sm font-medium flex items-center gap-2"><Award className="h-4 w-4 text-yellow-500"/>Monthly Bonus</p>
                                <p className="text-sm font-bold">{approvedTasksCount} / {bonusTarget} tasks</p>
                            </div>
                            <Progress value={progressPercentage} className="h-2" />
                            <p className="text-xs text-muted-foreground mt-1">Complete {bonusTarget} tasks this month to earn an extra {formatCurrency(bonusAmount)}.</p>
                        </div>
                    </CardContent>
                </Card>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                    <CardDescription>Manage your personal details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="phone-number" className="flex items-center gap-2"><Phone className="h-4 w-4"/> Phone Number</Label>
                        <Input 
                            id="phone-number"
                            type="tel"
                            placeholder="Enter your phone number"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Shield className="h-4 w-4"/> My Admin</Label>
                        <Input 
                            value={admin?.username ?? 'N/A'}
                            disabled
                            className="font-medium"
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSaveChanges}>Save Changes</Button>
                </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
}
