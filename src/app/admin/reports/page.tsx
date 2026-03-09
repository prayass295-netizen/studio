"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/date-range-picker'; // Assuming this component exists
import type { Partner, AttendanceRecord } from '@/lib/types';
import { calculateLatePenalty, calculateOvertimeIncentive, calculateTotalActiveTime } from '@/lib/calculations';
import { formatCurrency, calculateDuration, formatDate } from '@/lib/utils';
import { exportToCsv } from '@/lib/csv';
import { Download, FileText } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';

type ReportRow = {
  name: string;
  date: string;
  totalTime: string;
  baseSalary: string;
  deductions: string;
  incentives: string;
  netPayable: string;
};

export default function AdminReportsPage() {
  const { getPartners, getPartnerAttendance } = useAuth();
  const [filter, setFilter] = useState('daily');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });

  const allPartners = getPartners().filter(p => p.approved);

  const reportData = useMemo(() => {
    const data: ReportRow[] = [];
    
    allPartners.forEach(partner => {
      const attendance = getPartnerAttendance(partner.id);
      
      const recordsByDate = attendance.reduce((acc, record) => {
        const date = format(new Date(record.checkIn), 'yyyy-MM-dd');
        if (!acc[date]) acc[date] = [];
        acc[date].push(record);
        return acc;
      }, {} as Record<string, AttendanceRecord[]>);

      Object.entries(recordsByDate).forEach(([date, dailyRecords]) => {
        const recordDate = new Date(date);
        recordDate.setHours(12); // avoid timezone issues
        
        if (dateRange?.from && dateRange?.to) {
          if (recordDate >= dateRange.from && recordDate <= dateRange.to) {
            const totalMs = calculateTotalActiveTime(dailyRecords);
            const { penalty } = calculateLatePenalty(dailyRecords);
            const { incentive } = calculateOvertimeIncentive(dailyRecords);
            
            // For simplicity, prorating monthly salary to daily
            const dailySalary = (partner.baseSalary ?? 0) / 30;
            const netPayable = dailySalary - penalty + incentive;

            data.push({
              name: partner.username,
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
    });
    return data;
  }, [allPartners, getPartnerAttendance, dateRange]);

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
    if (value === 'yearly') setDateRange({ from: new Date(today.getFullYear(), 0, 1), to: new Date(today.getFullYear(), 11, 31) });
  };
  
  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2"><FileText/>Payroll Reports</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={filter} onValueChange={handleFilterChange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Filter" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                </Select>
                 <Button onClick={() => exportToCsv(`Prayas_Report_${format(new Date(), 'yyyy-MM-dd')}`, reportData)} variant="outline">
                  <Download className="mr-2 h-4 w-4" /> Export to CSV
                </Button>
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total Time</TableHead>
                <TableHead>Base Salary</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Incentives</TableHead>
                <TableHead className="text-right">Net Payable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length > 0 ? (
                reportData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.name}</TableCell>
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
                  <TableCell colSpan={7} className="h-24 text-center">
                    No data available for the selected period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={6} className="text-right font-bold text-lg">Grand Total Payable</TableCell>
                    <TableCell className="text-right font-bold text-lg">{formatCurrency(totalPayable)}</TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
// Note: DatePickerWithRange is a complex component. For this sample, we're assuming it exists
// or would be built based on shadcn documentation. The core logic here is what matters.
