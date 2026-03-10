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
  getAttendanceStatus
} from '@/lib/calculations';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { exportToCsv } from '@/lib/csv';
import { Download, FileText } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval } from 'date-fns';

type ReportRow = {
  srNo: number;
  date: string;
  day: string;
  isWeekend: boolean;
  partnerName: string;
  destination: string;
  assignedStartTime: string;
  actualCheckIn: string; // or "Absent" / "Week Off"
  lateMinutes: number;
  lateCount: number;
  assignedEndTime: string;
  actualCheckOut: string;
  extraMinutes: number;
  status: 'green' | 'yellow' | 'red' | 'gray';
};

export default function AdminReportsPage() {
  const { getPartners, getPartnerAttendance } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState('monthly');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    return { from: startOfMonth(today), to: endOfMonth(today) };
  });

  const allPartners = useMemo(() => getPartners().filter(p => p.approved), [getPartners]);

  const reportData: ReportRow[] = useMemo(() => {
    if (!selectedPartnerId || !dateRange?.from || !dateRange.to) return [];

    const partner = allPartners.find(p => p.id === selectedPartnerId);
    if (!partner) return [];

    const attendance = getPartnerAttendance(partner.id);
    const recordsByDateStr = attendance.reduce((acc, record) => {
      const date = format(new Date(record.checkIn), 'yyyy-MM-dd');
      if (!acc[date]) acc[date] = [];
      acc[date].push(record);
      return acc;
    }, {} as Record<string, AttendanceRecord[]>);

    const intervalDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    
    return intervalDays.map((currentDate, index) => {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dailyRecords = recordsByDateStr[dateStr] || [];
      const dayOfWeek = format(currentDate, 'EEEE');
      const isSunday = currentDate.getDay() === 0;

      if (dailyRecords.length > 0) {
        const firstCheckInRecord = dailyRecords.reduce((earliest, current) => new Date(current.checkIn) < new Date(earliest.checkIn) ? current : earliest);
        const lastCheckOutRecord = dailyRecords.filter(r => r.checkOut).reduce((latest, current) => (!latest || !current.checkOut || new Date(current.checkOut) > new Date(latest.checkOut!)) ? current : latest, null as AttendanceRecord | null);

        const { lateMinutes } = calculateLatePenalty(dailyRecords, partner.shiftStartTime || '09:00');
        const { overtimeMinutes } = calculateOvertimeIncentive(dailyRecords, partner.shiftEndTime || '17:00');
        const status = getAttendanceStatus(dailyRecords, partner.shiftStartTime);

        return {
          srNo: index + 1,
          date: formatDate(currentDate),
          day: dayOfWeek,
          isWeekend: isSunday,
          partnerName: partner.username,
          destination: partner.destination || 'N/A',
          assignedStartTime: partner.shiftStartTime || 'N/A',
          actualCheckIn: formatTime(firstCheckInRecord.checkIn),
          lateMinutes: lateMinutes,
          lateCount: lateMinutes > 10 ? 1 : 0,
          assignedEndTime: partner.shiftEndTime || 'N/A',
          actualCheckOut: lastCheckOutRecord?.checkOut ? formatTime(lastCheckOutRecord.checkOut) : 'N/A',
          extraMinutes: overtimeMinutes,
          status: status,
        };
      } else {
        return {
          srNo: index + 1,
          date: formatDate(currentDate),
          day: dayOfWeek,
          isWeekend: isSunday,
          partnerName: partner.username,
          destination: partner.destination || 'N/A',
          assignedStartTime: partner.shiftStartTime || 'N/A',
          actualCheckIn: isSunday ? 'Week Off' : 'Absent',
          lateMinutes: 0,
          lateCount: 0,
          assignedEndTime: partner.shiftEndTime || 'N/A',
          actualCheckOut: 'N/A',
          extraMinutes: 0,
          status: 'gray',
        };
      }
    });
  }, [selectedPartnerId, allPartners, getPartnerAttendance, dateRange]);

  const summary = useMemo(() => {
    const totalLateMinutes = reportData.reduce((sum, row) => sum + row.lateMinutes, 0);
    const totalLateCount = reportData.reduce((sum, row) => sum + row.lateCount, 0);
    const totalExtraMinutes = reportData.reduce((sum, row) => sum + row.extraMinutes, 0);
    return { totalLateMinutes, totalLateCount, totalExtraMinutes };
  }, [reportData]);

  const handleFilterChange = (value: string) => {
    setFilter(value);
    const today = new Date();
    if (value === 'daily') setDateRange({ from: today, to: today });
    if (value === 'weekly') setDateRange({ from: addDays(today, -6), to: today });
    if (value === 'monthly') setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
    if (value === 'yearly') setDateRange({ from: startOfYear(today), to: endOfYear(today) });
  };

  const handleExportReport = () => {
    if (!selectedPartnerId) {
      toast({ title: 'Select Partner', description: 'Please select a partner to generate a report.' });
      return;
    }
    if (reportData.length === 0) {
      toast({ title: 'No Data', description: 'There is no data to export for the selected partner and period.' });
      return;
    }

    const partner = allPartners.find(p => p.id === selectedPartnerId);

    const dataToExport = reportData.map(row => ({
      'Sr.No': row.srNo,
      'Employee Name': row.partnerName,
      'Destination': row.destination,
      'Date': row.date,
      'Start Time In': row.assignedStartTime,
      'Actual Time': row.actualCheckIn,
      'Late Min. By': row.lateMinutes > 0 ? row.lateMinutes : '-',
      'Late Count': row.lateCount > 0 ? row.lateCount : '-',
      'Day Status': row.isWeekend ? 'Week Off' : (row.actualCheckIn === 'Absent' ? 'Absent' : 'Present'),
      'Time Out': row.assignedEndTime,
      'Actual Time Out': row.actualCheckOut,
      'Extra Min.': row.extraMinutes > 0 ? row.extraMinutes : '-',
    }));

    const summaryRows = [
      {}, // Spacer
      { 'Sr.No': '--- SUMMARY ---' },
      { 'Sr.No': 'Total Late in Minute', 'Employee Name': summary.totalLateMinutes },
      { 'Sr.No': 'Total Late Count', 'Employee Name': summary.totalLateCount },
      { 'Sr.No': 'Total Extra Time (Minutes)', 'Employee Name': summary.totalExtraMinutes },
    ];

    const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
    const toDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';
    exportToCsv(`Prayas_Report_${partner?.username}_${fromDate}_to_${toDate}`, [...dataToExport, ...summaryRows]);
  };
  
  const renderHeaderDateInfo = () => {
    if (!dateRange || !dateRange.from) return null;
    return `Month: ${format(dateRange.from, 'MMMM')} | Year: ${format(dateRange.from, 'yyyy')} | Date Range: ${format(dateRange.from, 'dd')} to ${format(dateRange.to ?? dateRange.from, 'dd')}`;
  }

  const statusColors = {
      green: '',
      yellow: 'text-yellow-600',
      red: 'text-red-600 font-bold',
      gray: 'text-muted-foreground'
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card>
        <CardHeader className="bg-yellow-100/50">
          <CardTitle className="flex items-center gap-2"><FileText/>Payroll Reports</CardTitle>
          <CardDescription className="mt-2 text-black/80 font-medium">
              {renderHeaderDateInfo()}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Select a Partner" />
                  </SelectTrigger>
                  <SelectContent>
                    {allPartners.map(p => <SelectItem key={p.id} value={p.id}>{p.username}</SelectItem>)}
                  </SelectContent>
                </Select>
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
              </div>
              <Button onClick={handleExportReport} disabled={!selectedPartnerId}>
                <Download className="mr-2 h-4 w-4" /> Export Report
              </Button>
          </div>

          <div className="overflow-x-auto">
            <Table className="border-2 border-gray-300">
              <TableHeader className="bg-yellow-100/50">
                <TableRow>
                  <TableHead className="border border-gray-300">Sr.No</TableHead>
                  <TableHead className="border border-gray-300">Employee Name</TableHead>
                  <TableHead className="border border-gray-300">Destination</TableHead>
                  <TableHead className="border border-gray-300">Date</TableHead>
                  <TableHead className="border border-gray-300">Start Time In</TableHead>
                  <TableHead className="border border-gray-300">Actual Time</TableHead>
                  <TableHead className="border border-gray-300">Late Min. By</TableHead>
                  <TableHead className="border border-gray-300">Late Count</TableHead>
                  <TableHead className="border border-gray-300">Day Status</TableHead>
                  <TableHead className="border border-gray-300">Time Out</TableHead>
                  <TableHead className="border border-gray-300">Actual Time Out</TableHead>
                  <TableHead className="border border-gray-300">Extra Min.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.length > 0 ? (
                  reportData.map((row) => (
                    <TableRow key={row.srNo} className={(row.isWeekend || row.actualCheckIn === 'Absent') ? 'bg-yellow-100/30' : ''}>
                      <TableCell className="border border-gray-300">{row.srNo}</TableCell>
                      <TableCell className="border border-gray-300 font-medium">{row.partnerName}</TableCell>
                      <TableCell className="border border-gray-300">{row.destination}</TableCell>
                      <TableCell className="border border-gray-300">{row.date}</TableCell>
                      <TableCell className="border border-gray-300">{row.assignedStartTime}</TableCell>
                      <TableCell className={`border border-gray-300 ${statusColors[row.status]}`}>{row.actualCheckIn}</TableCell>
                      <TableCell className={`border border-gray-300 ${statusColors[row.status]}`}>{row.lateMinutes > 0 ? row.lateMinutes : '-'}</TableCell>
                      <TableCell className={`border border-gray-300 ${row.lateCount > 0 ? 'text-red-600' : ''}`}>{row.lateCount > 0 ? row.lateCount : '-'}</TableCell>
                      <TableCell className="border border-gray-300">{row.isWeekend ? 'Week Off' : row.actualCheckIn === 'Absent' ? 'Absent' : 'Present'}</TableCell>
                      <TableCell className="border border-gray-300">{row.assignedEndTime}</TableCell>
                      <TableCell className={`border border-gray-300 ${row.extraMinutes > 0 ? 'text-green-600' : ''}`}>{row.actualCheckOut}</TableCell>
                      <TableCell className="border border-gray-300 font-medium text-green-600">{row.extraMinutes > 0 ? row.extraMinutes : '-'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={12} className="h-24 text-center border border-gray-300">
                      {selectedPartnerId ? 'No attendance data available for the selected partner and period.' : 'Please select a partner to view their report.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {reportData.length > 0 && (
                  <TableFooter className="bg-yellow-100/50 font-bold">
                      <TableRow>
                          <TableCell colSpan={6} className="text-right border border-gray-300">Summary Totals</TableCell>
                          <TableCell className={`border border-gray-300 ${summary.totalLateMinutes > 0 ? 'text-red-600' : ''}`}>{summary.totalLateMinutes} min</TableCell>
                          <TableCell className={`border border-gray-300 ${summary.totalLateCount > 0 ? 'text-red-600' : ''}`}>{summary.totalLateCount} Days</TableCell>
                          <TableCell colSpan={3} className="text-right border border-gray-300">Total Extra</TableCell>
                          <TableCell className="border border-gray-300 text-green-600">{summary.totalExtraMinutes} min</TableCell>
                      </TableRow>
                  </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
