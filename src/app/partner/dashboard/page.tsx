"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusIndicator } from '@/components/status-indicator';
import type { AttendanceRecord, Partner } from '@/lib/types';
import { calculateTotalActiveTime, getAttendanceStatus } from '@/lib/calculations';
import { formatTime, formatDate, calculateDuration } from '@/lib/utils';
import { Clock, Sun, Moon, CalendarDays, Timer } from 'lucide-react';

export default function PartnerDashboard() {
  const { currentUser, getTodaysAttendance, addAttendanceRecord, updateAttendanceRecord, getPartnerAttendance } = useAuth();
  const [todaysRecords, setTodaysRecords] = useState<AttendanceRecord[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [totalTime, setTotalTime] = useState(0);

  const partner = currentUser as Partner;

  useEffect(() => {
    if (currentUser) {
      const today = getTodaysAttendance(currentUser.id);
      setTodaysRecords(today);
      setAllRecords(getPartnerAttendance(currentUser.id).sort((a,b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime()));
    }
  }, [currentUser, getTodaysAttendance, getPartnerAttendance]);

  useEffect(() => {
     if (currentUser) {
      const interval = setInterval(() => {
        // Recalculate based on potentially new records if user checked in/out
        setTotalTime(calculateTotalActiveTime(getTodaysAttendance(currentUser.id)));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentUser, getTodaysAttendance]);

  const lastRecord = useMemo(() => {
    // We need to get the latest records from state as it's more up-to-date
    const currentDayRecords = getTodaysAttendance(currentUser!.id);
    if (currentDayRecords.length === 0) return null;
    return currentDayRecords.sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime())[0];
  }, [todaysRecords, currentUser, getTodaysAttendance]);

  const canCheckIn = !lastRecord || !!lastRecord.checkOut;
  const canCheckOut = lastRecord && !lastRecord.checkOut;

  const handleCheckIn = () => {
    if (currentUser) {
      addAttendanceRecord(currentUser.id);
      const updatedRecords = getTodaysAttendance(currentUser.id);
      setTodaysRecords(updatedRecords); // Refresh state
      setAllRecords(getPartnerAttendance(currentUser.id).sort((a,b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime()));
    }
  };

  const handleCheckOut = () => {
    if (currentUser && lastRecord) {
      updateAttendanceRecord(lastRecord.id);
      const updatedRecords = getTodaysAttendance(currentUser.id);
      setTodaysRecords(updatedRecords); // Refresh state
      setAllRecords(getPartnerAttendance(currentUser.id).sort((a,b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime()));
    }
  };

  const status = getAttendanceStatus(todaysRecords, partner?.shiftStartTime);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Partner Dashboard</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Clock />Attendance Control</CardTitle>
                    <CardDescription>Clock in to start your work day and clock out for breaks or at the end of the day.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                    <Button onClick={handleCheckIn} disabled={!canCheckIn} size="lg" className="w-full sm:w-auto">
                        <Sun className="mr-2 h-5 w-5"/> Check In
                    </Button>
                    <Button onClick={handleCheckOut} disabled={!canCheckOut} variant="outline" size="lg" className="w-full sm:w-auto">
                        <Moon className="mr-2 h-5 w-5"/> Check Out
                    </Button>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CalendarDays />Today's Log</CardTitle>
                    <CardDescription>A summary of your attendance for today, {formatDate(new Date())}.</CardDescription>
                </CardHeader>
                <CardContent>
                    {todaysRecords.length > 0 ? (
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Check In</TableHead>
                                <TableHead>Check Out</TableHead>
                                <TableHead className="text-right">Duration</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {todaysRecords.map(rec => (
                                <TableRow key={rec.id}>
                                <TableCell>{formatTime(rec.checkIn)}</TableCell>
                                <TableCell>{rec.checkOut ? formatTime(rec.checkOut) : 'In Progress...'}</TableCell>
                                <TableCell className="text-right">{calculateDuration(rec.checkIn, rec.checkOut)}</TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-muted-foreground text-center py-4">You haven't checked in today.</p>
                    )}
                </CardContent>
            </Card>
        </div>
        <div className="space-y-8">
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Timer />Today's Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Assigned Shift</span>
                     <span className="font-semibold">{partner.shiftStartTime && partner.shiftEndTime ? `${partner.shiftStartTime} - ${partner.shiftEndTime}` : 'Not Set'}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Punctuality</span>
                    <StatusIndicator status={status} showText />
                </div>
                 <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Active Time</span>
                    <span className="font-semibold text-lg">
                        {Math.floor(totalTime / 3600000)}h {Math.floor((totalTime % 3600000) / 60000)}m
                    </span>
                </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {allRecords.slice(0, 10).map(rec => (
                        <div key={rec.id} className="text-sm flex justify-between items-center p-2 rounded-md hover:bg-muted">
                            <div>
                                <p className="font-medium">{formatDate(rec.checkIn)}</p>
                                <p className="text-muted-foreground">{formatTime(rec.checkIn)} - {rec.checkOut ? formatTime(rec.checkOut) : 'Now'}</p>
                            </div>
                             <div className="font-mono text-xs">{calculateDuration(rec.checkIn, rec.checkOut)}</div>
                        </div>
                    ))}
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
