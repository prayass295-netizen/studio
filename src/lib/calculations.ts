import type { AttendanceRecord } from "./types";

const LATE_THRESHOLD_MINUTES = 10;

function getTotalLateMinutes(dailyAttendance: AttendanceRecord[], shiftStartTimeString: string): number {
    if (dailyAttendance.length === 0 || !shiftStartTimeString) {
        return 0;
    }

    const firstCheckIn = dailyAttendance.reduce((earliest, current) => {
        return new Date(current.checkIn) < new Date(earliest.checkIn) ? current : earliest;
    });

    const checkInTime = new Date(firstCheckIn.checkIn);
    const shiftStartTime = new Date(checkInTime);
    const [hours, minutes] = shiftStartTimeString.split(':').map(Number);
    shiftStartTime.setHours(hours, minutes, 0, 0);

    const lateMilliseconds = checkInTime.getTime() - shiftStartTime.getTime();
    return Math.max(0, Math.floor(lateMilliseconds / 60000));
}

/**
 * Calculates late minutes based on the first check-in of the day.
 * Returns total minutes late if it's over the threshold, otherwise 0.
 */
export function calculateLateMinutes(dailyAttendance: AttendanceRecord[], shiftStartTimeString: string): { lateMinutes: number } {
  const totalLateMinutes = getTotalLateMinutes(dailyAttendance, shiftStartTimeString);

  if (totalLateMinutes > LATE_THRESHOLD_MINUTES) {
    return { lateMinutes: totalLateMinutes };
  }

  return { lateMinutes: 0 };
}

/**
 * Calculates overtime minutes based on the last check-out of the day.
 */
export function calculateOvertimeMinutes(dailyAttendance: AttendanceRecord[], shiftEndTimeString: string): { overtimeMinutes: number } {
  if (dailyAttendance.length === 0 || !shiftEndTimeString) {
    return { overtimeMinutes: 0 };
  }
  
  // Find the latest check-out for the day
  const lastCheckOut = dailyAttendance
    .filter(rec => rec.checkOut)
    .reduce((latest, current) => {
      if (!latest || !latest.checkOut) return current;
      if (!current.checkOut) return latest;
      return new Date(current.checkOut) > new Date(latest.checkOut) ? current : latest;
    }, null as AttendanceRecord | null);


  if (!lastCheckOut || !lastCheckOut.checkOut) {
    return { overtimeMinutes: 0 };
  }

  const checkOutTime = new Date(lastCheckOut.checkOut);
  const shiftEndTime = new Date(checkOutTime);
  const [hours, minutes] = shiftEndTimeString.split(':').map(Number);
  shiftEndTime.setHours(hours, minutes, 0, 0);

  const overtimeMilliseconds = checkOutTime.getTime() - shiftEndTime.getTime();
  const overtimeMinutes = Math.floor(overtimeMilliseconds / 60000);

  if (overtimeMinutes > 0) {
    return { overtimeMinutes };
  }

  return { overtimeMinutes: 0 };
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
    
    const totalLateMinutes = getTotalLateMinutes(dailyAttendance, shiftStartTimeString);

    if (totalLateMinutes <= LATE_THRESHOLD_MINUTES) return 'green';
    if (totalLateMinutes > 10 && totalLateMinutes <= 20) return 'yellow';
    if (totalLateMinutes > 20) return 'red';

    return 'gray';
}

/**
 * Calculates total active time for a live report, including ongoing sessions.
 */
export function calculateTotalActiveTimeForLiveReport(attendanceRecords: AttendanceRecord[], now: Date): number {
    return attendanceRecords.reduce((total, record) => {
        const start = new Date(record.checkIn).getTime();
        // If checkOut exists, use it. Otherwise, use the provided `now` Date object.
        const end = record.checkOut ? new Date(record.checkOut).getTime() : now.getTime();
        return total + (end - start);
    }, 0);
}

/**
 * Calculates overtime minutes for a live report, considering the current time if a session is ongoing.
 */
export function calculateLiveOvertimeMinutes(dailyAttendance: AttendanceRecord[], shiftEndTimeString: string, now: Date): { overtimeMinutes: number } {
    if (dailyAttendance.length === 0 || !shiftEndTimeString) {
        return { overtimeMinutes: 0 };
    }

    const sortedRecords = [...dailyAttendance].sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());
    const lastRecord = sortedRecords[sortedRecords.length - 1];

    let effectiveEndTime: Date;

    if (lastRecord && !lastRecord.checkOut) {
        effectiveEndTime = now;
    } else {
        const latestCheckOutTime = Math.max(...dailyAttendance.filter(r => r.checkOut).map(r => new Date(r.checkOut!).getTime()));
        if (latestCheckOutTime === -Infinity) {
            return { overtimeMinutes: 0 };
        }
        effectiveEndTime = new Date(latestCheckOutTime);
    }
    
    const shiftEndTime = new Date(effectiveEndTime);
    const [hours, minutes] = shiftEndTimeString.split(':').map(Number);
    shiftEndTime.setHours(hours, minutes, 0, 0);

    const overtimeMilliseconds = effectiveEndTime.getTime() - shiftEndTime.getTime();
    const overtimeMinutes = Math.floor(overtimeMilliseconds / 60000);

    if (overtimeMinutes > 0) {
        return { overtimeMinutes };
    }

    return { overtimeMinutes: 0 };
}

    