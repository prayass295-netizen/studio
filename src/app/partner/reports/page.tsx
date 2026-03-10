"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AttendanceRecord, Partner } from '@/lib/types';
import { calculateLateMinutes, calculateOvertimeMinutes, calculateTotalActiveTime } from '@/lib/calculations';
import { calculateDuration, formatDate } from '@/lib/utils';
import { FileText, Loader } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfMonth, endOfMonth } from 'date-fns';

type ReportRow = {
  date: string;
  totalTime: string;
  lateTime: number;
  extraTime: number;
};

export default function PartnerReportsPage() {
  const { currentUser, getPartnerAttendance } = useAuth();
  const [filter, setFilter] = useState('monthly');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    return { from: startOfMonth(today), to: endOfMonth(today) };
  });

  const partner = useMemo(() => currentUser as Partner | null, [currentUser]);

  const reportData = useMemo(() => {
    if (!partner) return [];

    const data: ReportRow[] = [];
    const attendance = getPartnerAttendance(partner.id);
    
    const recordsByDate = attendance.reduce((acc, record) => {
      const date = format(new Date(record.checkIn), 'yyyy-MM-dd');
      if (!acc[date]) acc[date] = [];
      acc[date].push(record);
      return acc;
    }, {} as Record<string, AttendanceRecord[]>);

    Object.entries(recordsByDate).forEach(([date, dailyRecords]) => {
      const recordDate = new Date(date);
      recordDate.setHours(12);

      if (dateRange?.from && dateRange?.to) {
        if (recordDate >= dateRange.from && recordDate <= dateRange.to) {
          const totalMs = calculateTotalActiveTime(dailyRecords);
          const { lateMinutes } = calculateLateMinutes(dailyRecords, partner.shiftStartTime || '09:00');
          const { overtimeMinutes } = calculateOvertimeMinutes(dailyRecords, partner.shiftEndTime || '17:00');

          data.push({
            date: formatDate(recordDate),
            totalTime: calculateDuration(new Date(0).toISOString(), new Date(totalMs).toISOString()),
            lateTime: lateMinutes,
            extraTime: overtimeMinutes,
          });
        }
      }
    });
    return data.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [partner, getPartnerAttendance, dateRange]);

  const summary = useMemo(() => {
    return reportData.reduce((acc, row) => {
      acc.totalLateTime += row.lateTime;
      acc.totalExtraTime += row.extraTime;
      return acc;
    }, { totalLateTime: 0, totalExtraTime: 0 });
  }, [reportData]);
  
  if (!currentUser || !partner) {
     return (
       <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
     )
  }

  const handleFilterChange = (value: string) => {
    setFilter(value);
    const today = new Date();
    if (value === 'daily') setDateRange({ from: today, to: today });
    if (value === 'weekly') setDateRange({ from: addDays(today, -6), to: today });
    if (value === 'monthly') setDateRange({ from: new Date(today.getFullYear(), today.getMonth(), 1), to: new Date(today.getFullYear(), today.getMonth() + 1, 0) });
  };
  
  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2"><FileText/>My Attendance Report</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Select value={filter} onValueChange={handleFilterChange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Filter" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="daily">Today</SelectItem>
                        <SelectItem value="weekly">This Week</SelectItem>
                        <SelectItem value="monthly">This Month</SelectItem>
                    </SelectContent>
                </Select>
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Total Time</TableHead>
                <TableHead>Late Time</TableHead>
                <TableHead className="text-right">Extra Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length > 0 ? (
                reportData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.totalTime}</TableCell>
                    <TableCell className="text-red-600">{row.lateTime > 0 ? `${row.lateTime} min` : '-'}</TableCell>
                    <TableCell className="text-right text-green-600">{row.extraTime > 0 ? `${row.extraTime} min`: '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No attendance data for the selected period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {reportData.length > 0 && (
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={2} className="text-right font-bold">Totals</TableCell>
                        <TableCell className="font-bold text-red-600">{summary.totalLateTime} min</TableCell>
                        <TableCell className="text-right font-bold text-green-600">{summary.totalExtraTime} min</TableCell>
                    </TableRow>
                </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
