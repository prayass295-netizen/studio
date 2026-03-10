"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AttendanceRecord, Partner } from '@/lib/types';
import { calculateLatePenalty, calculateOvertimeIncentive, calculateTotalActiveTime } from '@/lib/calculations';
import { formatCurrency, calculateDuration, formatDate } from '@/lib/utils';
import { FileText } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';

type ReportRow = {
  date: string;
  totalTime: string;
  baseSalary: string;
  deductions: string;
  incentives: string;
  netPayable: string;
};

export default function PartnerReportsPage() {
  const { currentUser, getPartnerAttendance } = useAuth();
  const [filter, setFilter] = useState('daily');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });

  const partner = currentUser as Partner;

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
          const { penalty } = calculateLatePenalty(dailyRecords, partner.shiftStartTime || '09:00');
          const { incentive } = calculateOvertimeIncentive(dailyRecords, partner.shiftEndTime || '17:00');
          
          const dailySalary = (partner.baseSalary ?? 0) / 30;
          const netPayable = dailySalary - penalty + incentive;

          data.push({
            date: formatDate(recordDate),
            totalTime: calculateDuration(new Date(0).toISOString(), new Date(totalMs).toISOString()),
            baseSalary: formatCurrency(dailySalary),
            deductions: formatCurrency(penalty),
            incentives: formatCurrency(incentive),
            netPayable: formatCurrency(netPayable),
          });
        }
      }
    });
    return data.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [partner, getPartnerAttendance, dateRange]);

  const totalPayable = useMemo(() => {
    return reportData.reduce((sum, row) => {
      return sum + parseFloat(row.netPayable.replace(/[^0-9.-]+/g,""));
    }, 0);
  }, [reportData]);
  
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
                <CardTitle className="flex items-center gap-2"><FileText/>My Payroll Report</CardTitle>
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
                <TableHead>Base Pay</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Incentives</TableHead>
                <TableHead className="text-right">Net Payable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length > 0 ? (
                reportData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.totalTime}</TableCell>
                    <TableCell>{row.baseSalary}</TableCell>
                    <TableCell className="text-red-600">{row.deductions}</TableCell>
                    <TableCell className="text-green-600">{row.incentives}</TableCell>
                    <TableCell className="text-right font-medium">{row.netPayable}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No attendance data for the selected period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={5} className="text-right font-bold text-lg">Total Payable</TableCell>
                    <TableCell className="text-right font-bold text-lg">{formatCurrency(totalPayable)}</TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
