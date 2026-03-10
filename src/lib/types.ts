export type UserRole = 'admin' | 'partner';

export interface User {
  id: string;
  username: string;
  password?: string; // Should be hashed in a real app
  role: UserRole;
  approved: boolean;
  baseSalary?: number;
  shiftStartTime?: string; // HH:mm
  shiftEndTime?: string; // HH:mm
  adminReferralCode?: string; // For partners
  photoUrl?: string; // Data URL for the photo
  phoneNumber?: string;
}

export interface Admin extends User {
  role: 'admin';
  referralCode: string;
}

export interface Partner extends User {
  role: 'partner';
  adminReferralCode: string;
}

export type AttendanceRecord = {
  id: string;
  userId: string;
  checkIn: string; // ISO string
  checkOut?: string; // ISO string
};

export type AdminSettings = {
  referralCode: string | null;
};
