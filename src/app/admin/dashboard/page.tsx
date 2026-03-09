"use client";

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Partner } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Users, UserPlus } from 'lucide-react';

export default function AdminDashboard() {
  const { getPartners, getPendingPartners, approvePartner } = useAuth();
  const { toast } = useToast();
  
  // Local state to trigger re-renders
  const [partners, setPartners] = useState<Partner[]>(getPartners());
  const [pendingPartners, setPendingPartners] = useState<Partner[]>(getPendingPartners());
  const [salary, setSalary] = useState('');

  const handleApprove = (partnerId: string) => {
    const baseSalary = parseFloat(salary);
    if (isNaN(baseSalary) || baseSalary <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Salary', description: 'Please enter a valid positive number for the base salary.' });
      return;
    }

    const success = approvePartner(partnerId, baseSalary);
    if (success) {
      toast({ title: 'Partner Approved', description: 'The partner can now log in and use the system.' });
      // Refresh local state from the source of truth
      setPartners(getPartners());
      setPendingPartners(getPendingPartners());
      setSalary('');
    } else {
      toast({ variant: 'destructive', title: 'Approval Failed', description: 'Something went wrong. Please try again.' });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserPlus />Pending Requests</CardTitle>
            <CardDescription>Approve new partners to grant them access.</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingPartners.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPartners.map(partner => (
                    <TableRow key={partner.id}>
                      <TableCell className="font-medium">{partner.username}</TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm">Approve</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Approve {partner.username}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Set the base monthly salary for this partner. This can be changed later.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4">
                              <Label htmlFor="salary">Base Salary (per month)</Label>
                              <Input
                                id="salary"
                                type="number"
                                placeholder="e.g., 50000"
                                value={salary}
                                onChange={(e) => setSalary(e.target.value)}
                              />
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setSalary('')}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleApprove(partner.id)}>
                                Approve Partner
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">No pending requests.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users />All Partners</CardTitle>
            <CardDescription>View all registered partners.</CardDescription>
          </CardHeader>
          <CardContent>
             {partners.filter(p => p.approved).length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Base Salary</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.filter(p => p.approved).map(partner => (
                    <TableRow key={partner.id}>
                      <TableCell className="font-medium">{partner.username}</TableCell>
                      <TableCell>{formatCurrency(partner.baseSalary ?? 0)}</TableCell>
                      <TableCell>
                        <Badge variant="default">Approved</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
             ) : (
                <p className="text-muted-foreground text-center py-4">No approved partners yet.</p>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
