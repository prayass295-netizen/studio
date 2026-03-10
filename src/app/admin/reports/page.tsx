
"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Partner, AttendanceRecord } from '@/lib/types';
import { 
  calculateLatePenalty, 
  calculateOvertimeIncentive, 
  calculateLiveOvertimeIncentive,
  calculateTotalActiveTimeForLiveReport,
  getAttendanceStatus
} from '@/lib/calculations';
import { formatCurrency, calculateDuration, formatDate, formatTime } from '@/lib/utils';
import { exportToCsv } from '@/lib/csv';
import { Download, FileText, Wifi } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

type ReportRow = {
  srNo: number;
  partnerName: string;
  date: string;
  assignedStartTime: string;
  actualCheckIn: string;
  lateMinutes: number;
  lateCount: number;
  status: 'green' | 'yellow' | 'red' | 'gray';
  assignedEndTime: string;
  actualCheckOut: string;
  extraMinutes: number;
  // For footer calcs
  penalty: number;
  incentive: number;
  baseSalary: number;
};

export default function AdminReportsPage() {
  const { getPartners, getPartnerAttendance, getTodaysAttendance } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState('monthly');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    return { from: startOfMonth(today), to: endOfMonth(today) };
  });

  const allPartners = useMemo(() => getPartners().filter(p => p.approved), [getPartners]);

  const reportData: ReportRow[] = useMemo(() => {
    const data: ReportRow[] = [];
    
    allPartners.forEach(partner => {
      if (!partner.baseSalary) return; // Skip partners without salary info

      const attendance = getPartnerAttendance(partner.id);
      
      const recordsByDate = attendance.reduce((acc, record) => {
        const date = format(new Date(record.checkIn), 'yyyy-MM-dd');
        if (!acc[date]) acc[date] = [];
        acc[date].push(record);
        return acc;
      }, {} as Record<string, AttendanceRecord[]>);

      Object.entries(recordsByDate).forEach(([date, dailyRecords]) => {
        const recordDate = new Date(date);
        recordDate.setUTCHours(12, 0, 0, 0);
        
        const from = dateRange?.from ? new Date(dateRange.from) : new Date();
        from.setUTCHours(0,0,0,0);
        const to = dateRange?.to ? new Date(dateRange.to) : new Date();
        to.setUTCHours(23,59,59,999);

        if (recordDate >= from && recordDate <= to) {
            const firstCheckInRecord = dailyRecords.reduce((earliest, current) => new Date(current.checkIn) < new Date(earliest.checkIn) ? current : earliest);
            const lastCheckOutRecord = dailyRecords.filter(r => r.checkOut).reduce((latest, current) => (!latest || !current.checkOut || new Date(current.checkOut) > new Date(latest.checkOut!)) ? current : latest, null as AttendanceRecord | null);
            
            const { penalty, lateMinutes } = calculateLatePenalty(dailyRecords, partner.shiftStartTime || '09:00');
            const { incentive, overtimeMinutes } = calculateOvertimeIncentive(dailyRecords, partner.shiftEndTime || '17:00');
            
            const dailySalary = (partner.baseSalary ?? 0) / 30;
            const status = getAttendanceStatus(dailyRecords, partner.shiftStartTime);

            data.push({
              srNo: 0, // will be set later
              partnerName: partner.username,
              date: formatDate(recordDate),
              assignedStartTime: partner.shiftStartTime || 'N/A',
              actualCheckIn: formatTime(firstCheckInRecord.checkIn),
              lateMinutes: lateMinutes,
              lateCount: lateMinutes > 10 ? 1 : 0, // Count only if penalty applies
              status: status,
              assignedEndTime: partner.shiftEndTime || 'N/A',
              actualCheckOut: lastCheckOutRecord?.checkOut ? formatTime(lastCheckOutRecord.checkOut) : 'N/A',
              extraMinutes: overtimeMinutes,
              penalty: penalty,
              incentive: incentive,
              baseSalary: dailySalary,
            });
        }
      });
    });
    // Sort and add Sr.No
    return data
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.partnerName.localeCompare(b.partnerName))
      .map((row, index) => ({ ...row, srNo: index + 1 }));
  }, [allPartners, getPartnerAttendance, dateRange]);

  const summary = useMemo(() => {
      const totalLateMinutes = reportData.reduce((sum, row) => sum + row.lateMinutes, 0);
      const totalExtraMinutes = reportData.reduce((sum, row) => sum + row.extraMinutes, 0);
      const totalLateCount = reportData.reduce((sum, row) => sum + row.lateCount, 0);
      const totalBaseSalary = reportData.reduce((sum, row) => sum + row.baseSalary, 0);
      const totalPenalty = reportData.reduce((sum, row) => sum + row.penalty, 0);
      const totalIncentive = reportData.reduce((sum, row) => sum + row.incentive, 0);
      const finalSalaryPayable = totalBaseSalary - totalPenalty + totalIncentive;
      
      return {
          totalLateMinutes,
          totalExtraMinutes,
          totalLateCount,
          totalBaseSalary,
          totalPenalty,
          totalIncentive,
          finalSalaryPayable
      }
  }, [reportData]);

  const handleFilterChange = (value: string) => {
    setFilter(value);
    const today = new Date();
    if (value === 'daily') setDateRange({ from: today, to: today });
    if (value === 'weekly') setDateRange({ from: addDays(today, -6), to: today });
    if (value === 'monthly') setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
    if (value === 'yearly') setDateRange({ from: startOfYear(today), to: endOfYear(today) });
  };
  
  const handleExportLiveStatus = () => {
    const liveReportData: any[] = [];
    
    allPartners.forEach(partner => {
        const todaysAttendance = getTodaysAttendance(partner.id);
        
        if (todaysAttendance.length > 0) {
            const lastRecord = [...todaysAttendance].sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime())[0];
            
            if (lastRecord && !lastRecord.checkOut) {
                const firstCheckIn = [...todaysAttendance].sort((a,b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())[0];
                const { penalty } = calculateLatePenalty(todaysAttendance, partner.shiftStartTime || '09:00');
                const { incentive } = calculateLiveOvertimeIncentive(todaysAttendance, partner.shiftEndTime || '17:00');
                const totalMs = calculateTotalActiveTimeForLiveReport(todaysAttendance);
                
                const dailySalary = (partner.baseSalary ?? 0) / 30;
                const netPayable = dailySalary - penalty + incentive;
                const punctualityStatus = getAttendanceStatus(todaysAttendance, partner.shiftStartTime);
                const statusText = {
                    green: 'On Time',
                    yellow: 'Late',
                    red: 'Very Late',
                    gray: 'N/A'
                };

                liveReportData.push({
                    "Partner Name": partner.username,
                    "Status": "Checked-In",
                    "Check-in Time": formatTime(firstCheckIn.checkIn),
                    "Punctuality": statusText[punctualityStatus],
                    "Current Duration": calculateDuration(new Date(0).toISOString(), new Date(totalMs).toISOString()),
                    "Fine": formatCurrency(penalty),
                    "Live Incentive": formatCurrency(incentive),
                    "Current Net Payable": formatCurrency(netPayable),
                });
            }
        }
    });

    if (liveReportData.length === 0) {
        toast({
            title: "No Live Data",
            description: "No partners are currently checked in.",
        });
        return;
    }

    exportToCsv(`Prayas_Live_Status_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}`, liveReportData);
  };
  
  const handleExportReport = () => {
    if (reportData.length === 0) {
        toast({ title: 'No Data', description: 'There is no data to export for the selected period.' });
        return;
    }

    const dataToExport = reportData.map(row => ({
        'Sr.No': row.srNo,
        'Partner Name': row.partnerName,
        'Date': row.date,
        'Assigned Start Time': row.assignedStartTime,
        'Actual Check-in': row.actualCheckIn,
        'Late Minutes': row.lateMinutes,
        'Late Count': row.lateCount,
        'Assigned End Time': row.assignedEndTime,
        'Actual Check-out': row.actualCheckOut,
        'Extra Minutes (Incentive)': row.extraMinutes,
    }));
    
    // Add summary rows for context in the CSV
    const summaryRows = [
        {}, // Spacer
        { 'Sr.No': '--- SUMMARY ---' },
        { 'Sr.No': 'Total Late Minutes', 'Partner Name': summary.totalLateMinutes },
        { 'Sr.No': 'Total Extra Minutes', 'Partner Name': summary.totalExtraMinutes },
        { 'Sr.No': 'Total Late Entries', 'Partner Name': summary.totalLateCount },
        { 'Sr.No': 'Total Base Salary', 'Partner Name': formatCurrency(summary.totalBaseSalary) },
        { 'Sr.No': 'Total Fine', 'Partner Name': formatCurrency(summary.totalPenalty) },
        { 'Sr.No': 'Total Incentive', 'Partner Name': formatCurrency(summary.totalIncentive) },
        { 'Sr.No': 'Final Salary Payable', 'Partner Name': formatCurrency(summary.finalSalaryPayable) },
    ];

    const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
    const toDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';
    exportToCsv(`Prayas_Report_${fromDate}_to_${toDate}`, [...dataToExport, ...summaryRows]);
  };

  const renderDateRange = () => {
      if (!dateRange || !dateRange.from) return null;
      if (!dateRange.to || format(dateRange.from, 'yyyy-MM-dd') === format(dateRange.to, 'yyyy-MM-dd')) {
          return format(dateRange.from, 'MMMM do, yyyy');
      }
      return `${format(dateRange.from, 'MMM do')} - ${format(dateRange.to, 'MMM do, yyyy')}`;
  };

  const statusColors = {
      green: '',
      yellow: 'text-yellow-600',
      red: 'text-red-600 font-medium',
      gray: 'text-muted-foreground'
  }
  
  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2"><FileText/>Payroll Reports</CardTitle>
                <CardDescription className="mt-2">
                    {renderDateRange()}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={filter} onValueChange={handleFilterChange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Filter" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">This Week</SelectItem>
                        <SelectItem value="monthly">This Month</SelectItem>
                        <SelectItem value="yearly">This Year</SelectItem>
                    </SelectContent>
                </Select>
                 <Button onClick={handleExportLiveStatus} variant="outline">
                  <Wifi className="mr-2 h-4 w-4" /> Export Live Status
                </Button>
                 <Button onClick={handleExportReport}>
                  <Download className="mr-2 h-4 w-4" /> Export Report
                </Button>
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Sr.No</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Assigned In</TableHead>
                <TableHead>Actual In</TableHead>
                <TableHead>Late (min)</TableHead>
                <TableHead>Late Count</TableHead>
                <TableHead>Assigned Out</TableHead>
                <TableHead>Actual Out</TableHead>
                <TableHead>Extra (min)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length > 0 ? (
                reportData.map((row) => (
                  <TableRow key={row.srNo}>
                    <TableCell>{row.srNo}</TableCell>
                    <TableCell className="font-medium">{row.partnerName}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.assignedStartTime}</TableCell>
                    <TableCell className={statusColors[row.status]}>{row.actualCheckIn}</TableCell>
                    <TableCell className={statusColors[row.status]}>{row.lateMinutes > 0 ? row.lateMinutes : '-'}</TableCell>
                    <TableCell className={row.lateCount > 0 ? 'text-red-600' : ''}>{row.lateCount > 0 ? row.lateCount : '-'}</TableCell>
                    <TableCell>{row.assignedEndTime}</TableCell>
                    <TableCell className={row.extraMinutes > 0 ? 'text-green-600' : ''}>{row.actualCheckOut}</TableCell>
                    <TableCell className="font-medium text-green-600">{row.extraMinutes > 0 ? row.extraMinutes : '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
                    No attendance data available for the selected period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {reportData.length > 0 && (
                <TableFooter>
                    <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={5} className="text-right">Summary Totals</TableCell>
                        <TableCell className={summary.totalLateMinutes > 0 ? 'text-red-600' : ''}>{summary.totalLateMinutes} min</TableCell>
                        <TableCell className={summary.totalLateCount > 0 ? 'text-red-600' : ''}>{summary.totalLateCount} Days</TableCell>
                        <TableCell colSpan={2} className="text-right">Total Extra</TableCell>
                        <TableCell className="text-green-600">{summary.totalExtraMinutes} min</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={9} className="text-right font-medium">Total Base Salary for Period</TableCell>
                        <TableCell className="text-right">{formatCurrency(summary.totalBaseSalary)}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={9} className="text-right font-medium text-red-600">Total Fines (Deductions)</TableCell>
                        <TableCell className="text-right text-red-600">{formatCurrency(summary.totalPenalty)}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={9} className="text-right font-medium text-green-600">Total Incentives (Bonus)</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(summary.totalIncentive)}</TableCell>
                    </TableRow>
                    <TableRow className="border-t-2 border-primary">
                        <TableCell colSpan={9} className="text-right font-bold text-lg">Final Salary Payable</TableCell>
                        <TableCell className="text-right font-bold text-lg">{formatCurrency(summary.finalSalaryPayable)}</TableCell>
                    </TableRow>
                </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

    