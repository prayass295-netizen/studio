"use client";

import { useState, useEffect } from 'react';
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
import { formatCurrency, formatTime } from '@/lib/utils';
import { Users, UserPlus, Edit, Eye, User as UserIcon } from 'lucide-react';
import { getAttendanceStatus, calculateLatePenalty, calculateOvertimeIncentive } from '@/lib/calculations';
import { StatusIndicator } from '@/components/status-indicator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type LivePartnerData = {
  id: string;
  username: string;
  status: 'In' | 'Out';
  checkInTime: string;
  punctuality: 'green' | 'yellow' | 'red' | 'gray';
  deductions: number;
  incentives: number;
  netPay: number;
};

export default function AdminDashboard() {
  const { getPartners, getPendingPartners, approvePartner, updatePartnerDetails, getTodaysAttendance } = useAuth();
  const { toast } = useToast();
  
  const [partners, setPartners] = useState<Partner[]>(getPartners());
  const [pendingPartners, setPendingPartners] = useState<Partner[]>(getPendingPartners());
  
  const [salary, setSalary] = useState('');
  const [shiftStartTime, setShiftStartTime] = useState('09:00');
  const [shiftEndTime, setShiftEndTime] = useState('17:00');
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [liveData, setLiveData] = useState<LivePartnerData[]>([]);

  useEffect(() => {
    const calculateLiveData = () => {
        const approvedPartners = getPartners().filter(p => p.approved);
        const data = approvedPartners.map(partner => {
            const todaysAttendance = getTodaysAttendance(partner.id)
                .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());
            
            const firstCheckInRecord = todaysAttendance[0] ?? null;
            const lastRecord = todaysAttendance[todaysAttendance.length - 1] ?? null;

            const status = lastRecord && !lastRecord.checkOut ? 'In' : 'Out';
            const checkInTime = firstCheckInRecord ? formatTime(firstCheckInRecord.checkIn) : 'N/A';
            
            const punctuality = getAttendanceStatus(todaysAttendance, partner.shiftStartTime);

            const { penalty } = calculateLatePenalty(todaysAttendance, partner.shiftStartTime || '09:00');
            const { incentive } = calculateOvertimeIncentive(todaysAttendance, partner.shiftEndTime || '17:00');

            const dailySalary = (partner.baseSalary ?? 0) / 30;
            const netPay = (todaysAttendance.length === 0) ? 0 : dailySalary - penalty + incentive;
            
            return {
                id: partner.id,
                username: partner.username,
                status,
                checkInTime,
                punctuality,
                deductions: penalty,
                incentives: incentive,
                netPay: netPay,
            };
        });
        setLiveData(data);
    };

    calculateLiveData();
    const intervalId = setInterval(calculateLiveData, 5000); 

    return () => clearInterval(intervalId);
  }, [getPartners, getTodaysAttendance]);

  const handleApprove = (partnerId: string) => {
    const baseSalary = parseFloat(salary);
    if (isNaN(baseSalary) || baseSalary <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Salary', description: 'Please enter a valid positive number for the base salary.' });
      return;
    }
     if (!shiftStartTime || !shiftEndTime) {
      toast({ variant: 'destructive', title: 'Invalid Shift Times', description: 'Please set both check-in and check-out times.' });
      return;
    }

    const success = approvePartner(partnerId, baseSalary, shiftStartTime, shiftEndTime);
    if (success) {
      toast({ title: 'Partner Approved', description: 'The partner can now log in and use the system.' });
      setPartners(getPartners());
      setPendingPartners(getPendingPartners());
      setSalary('');
      setShiftStartTime('09:00');
      setShiftEndTime('17:00');
    } else {
      toast({ variant: 'destructive', title: 'Approval Failed', description: 'Something went wrong. Please try again.' });
    }
  };

  const handleUpdateDetails = () => {
    if (!editingPartner) return;

    const baseSalary = parseFloat(salary);
    if (isNaN(baseSalary) || baseSalary <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Salary', description: 'Please enter a valid positive number for the base salary.' });
      return;
    }
    if (!shiftStartTime || !shiftEndTime) {
      toast({ variant: 'destructive', title: 'Invalid Shift Times', description: 'Please set both check-in and check-out times.' });
      return;
    }

    const success = updatePartnerDetails(editingPartner.id, { baseSalary, shiftStartTime, shiftEndTime });
    if (success) {
        toast({ title: 'Partner Updated', description: `${editingPartner.username}'s details have been updated.` });
        setPartners(getPartners());
        setEditingPartner(null); // Close dialog
    } else {
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Something went wrong. Please try again.' });
    }
  };

  const openEditDialog = (partner: Partner) => {
      setEditingPartner(partner);
      setSalary(partner.baseSalary?.toString() ?? '');
      setShiftStartTime(partner.shiftStartTime ?? '09:00');
      setShiftEndTime(partner.shiftEndTime ?? '17:00');
  };

  const resetApprovalState = () => {
    setSalary('');
    setShiftStartTime('09:00');
    setShiftEndTime('17:00');
  }

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
                        <AlertDialog onOpenChange={(open) => !open && resetApprovalState()}>
                          <AlertDialogTrigger asChild>
                            <Button size="sm">Approve</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Approve {partner.username}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Set the base monthly salary and shift timings for this partner.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-4 py-4">
                                <div>
                                  <Label htmlFor="salary">Base Salary (per month)</Label>
                                  <Input
                                    id="salary"
                                    type="number"
                                    placeholder="e.g., 50000"
                                    value={salary}
                                    onChange={(e) => setSalary(e.target.value)}
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="check-in">Set Check-in Time</Label>
                                        <Input
                                            id="check-in"
                                            type="time"
                                            value={shiftStartTime}
                                            onChange={(e) => setShiftStartTime(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="check-out">Set Check-out Time</Label>
                                        <Input
                                            id="check-out"
                                            type="time"
                                            value={shiftEndTime}
                                            onChange={(e) => setShiftEndTime(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
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
            <CardDescription>View and manage all registered partners.</CardDescription>
          </CardHeader>
          <CardContent>
             {partners.filter(p => p.approved).length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.filter(p => p.approved).map(partner => (
                    <TableRow key={partner.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={partner.photoUrl ?? undefined} alt={partner.username} />
                                <AvatarFallback><UserIcon className="h-4 w-4" /></AvatarFallback>
                            </Avatar>
                            <span>{partner.username}</span>
                        </div>
                      </TableCell>
                      <TableCell>{partner.phoneNumber ?? 'N/A'}</TableCell>
                      <TableCell>{formatCurrency(partner.baseSalary ?? 0)}</TableCell>
                      <TableCell>{partner.shiftStartTime ?? 'N/A'} - {partner.shiftEndTime ?? 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(partner)}>
                            <Edit className="h-4 w-4" />
                        </Button>
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

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Eye /> Live Partner Monitoring</CardTitle>
          <CardDescription>Real-time status of all active partners.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Punctuality</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Incentives</TableHead>
                <TableHead className="text-right">Today's Net Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liveData.length > 0 ? (
                liveData.map(partner => (
                  <TableRow key={partner.id}>
                    <TableCell className="font-medium">{partner.username}</TableCell>
                    <TableCell>
                      <Badge variant={partner.status === 'In' ? 'default' : 'secondary'}>
                        {partner.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{partner.checkInTime}</TableCell>
                    <TableCell>
                      <StatusIndicator status={partner.punctuality} />
                    </TableCell>
                    <TableCell className="text-red-600">{formatCurrency(partner.deductions)}</TableCell>
                    <TableCell className="text-green-600">{formatCurrency(partner.incentives)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(partner.netPay)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No approved partners to monitor.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

       {editingPartner && (
        <AlertDialog open={!!editingPartner} onOpenChange={(isOpen) => !isOpen && setEditingPartner(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Edit Details for {editingPartner.username}</AlertDialogTitle>
                    <AlertDialogDescription>
                        Update the base salary and shift timings for this partner.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                 <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="edit-salary">Base Salary (per month)</Label>
                        <Input
                            id="edit-salary"
                            type="number"
                            placeholder="e.g., 50000"
                            value={salary}
                            onChange={(e) => setSalary(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="edit-check-in">Check-in Time</Label>
                            <Input
                                id="edit-check-in"
                                type="time"
                                value={shiftStartTime}
                                onChange={(e) => setShiftStartTime(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-check-out">Check-out Time</Label>
                            <Input
                                id="edit-check-out"
                                type="time"
                                value={shiftEndTime}
                                onChange={(e) => setShiftEndTime(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setEditingPartner(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleUpdateDetails}>
                        Save Changes
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )}
    </div>
  );
}
