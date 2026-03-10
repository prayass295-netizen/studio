import type { AttendanceRecord } from "./types";

const LATE_THRESHOLD_MINUTES = 10;
const LATE_PENALTY_PER_MINUTE = 2; // in INR
const OVERTIME_INCENTIVE_PER_MINUTE = 1; // in INR

/**
 * Calculates late penalty based on the first check-in of the day.
 */
export function calculateLatePenalty(dailyAttendance: AttendanceRecord[], shiftStartTimeString: string): { penalty: number; lateMinutes: number } {
  if (dailyAttendance.length === 0 || !shiftStartTimeString) {
    return { penalty: 0, lateMinutes: 0 };
  }

  // Find the earliest check-in for the day
  const firstCheckIn = dailyAttendance.reduce((earliest, current) => {
    return new Date(current.checkIn) < new Date(earliest.checkIn) ? current : earliest;
  });

  const checkInTime = new Date(firstCheckIn.checkIn);
  const shiftStartTime = new Date(checkInTime);
  const [hours, minutes] = shiftStartTimeString.split(':').map(Number);
  shiftStartTime.setHours(hours, minutes, 0, 0);

  const lateMilliseconds = checkInTime.getTime() - shiftStartTime.getTime();
  const lateMinutes = Math.floor(lateMilliseconds / 60000);

  if (lateMinutes > LATE_THRESHOLD_MINUTES) {
    const penalty = (lateMinutes - LATE_THRESHOLD_MINUTES) * LATE_PENALTY_PER_MINUTE;
    return { penalty, lateMinutes };
  }

  return { penalty: 0, lateMinutes: 0 };
}

/**
 * Calculates overtime incentive based on the last check-out of the day.
 */
export function calculateOvertimeIncentive(dailyAttendance: AttendanceRecord[], shiftEndTimeString: string): { incentive: number; overtimeMinutes: number } {
  if (dailyAttendance.length === 0 || !shiftEndTimeString) {
    return { incentive: 0, overtimeMinutes: 0 };
  }
  
  // Find the latest check-out for the day
  const lastCheckOut = dailyAttendance
    .filter(rec => rec.checkOut)
    .reduce((latest, current) => {
      if (!latest.checkOut) return current;
      if (!current.checkOut) return latest;
      return new Date(current.checkOut) > new Date(latest.checkOut) ? current : latest;
    }, { checkOut: undefined } as Partial<AttendanceRecord>);


  if (!lastCheckOut || !lastCheckOut.checkOut) {
    return { incentive: 0, overtimeMinutes: 0 };
  }

  const checkOutTime = new Date(lastCheckOut.checkOut);
  const shiftEndTime = new Date(checkOutTime);
  const [hours, minutes] = shiftEndTimeString.split(':').map(Number);
  shiftEndTime.setHours(hours, minutes, 0, 0);

  const overtimeMilliseconds = checkOutTime.getTime() - shiftEndTime.getTime();
  const overtimeMinutes = Math.floor(overtimeMilliseconds / 60000);

  if (overtimeMinutes > 0) {
    const incentive = overtimeMinutes * OVERTIME_INCENTIVE_PER_MINUTE;
    return { incentive, overtimeMinutes };
  }

  return { incentive: 0, overtimeMinutes: 0 };
}


/**
 * Calculates the total active time for a set of attendance records.
 */
export function calculateTotalActiveTime(attendanceRecords: AttendanceRecord[]): number {
  return attendanceRecords.reduce((total, record) => {
    if (record.checkOut) {
      const start = new Date(record.checkIn).getTime();
      const end = new Date(record.checkOut).getTime();
      return total + (end - start);
    }
    return total;
  }, 0);
}

export function getAttendanceStatus(dailyAttendance: AttendanceRecord[], shiftStartTimeString?: string): 'green' | 'yellow' | 'red' | 'gray' {
    if (dailyAttendance.length === 0 || !shiftStartTimeString) return 'gray';
    
    const { lateMinutes } = calculateLatePenalty(dailyAttendance, shiftStartTimeString);

    if (lateMinutes <= LATE_THRESHOLD_MINUTES) return 'green';
    if (lateMinutes > 10 && lateMinutes <= 20) return 'yellow';
    if (lateMinutes > 20) return 'red';

    return 'gray';
}
