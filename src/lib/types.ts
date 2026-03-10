export type UserRole = 'admin' | 'partner';

export type TaskStatus = 'Pending' | 'Acknowledged' | 'InProgress' | 'Completed' | 'Approved' | 'Rejected';

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
  destination?: string;
}

export interface Admin extends User {
  role: 'admin';
  referralCode: string;
}

export interface Partner extends User {
  role: 'partner';
  adminReferralCode: string;
  walletBalance?: number;
}

export type AttendanceRecord = {
  id: string;
  userId: string;
  checkIn: string; // ISO string
  checkOut?: string; // ISO string
};

export type Task = {
    id: string;
    partnerId: string;
    title: string;
    description: string;
    incentive: number;
    deadline: string; // ISO string
    status: TaskStatus;
    createdAt: string; // ISO string
    acknowledgedAt?: string; // ISO string
    completedAt?: string; // ISO string
};

export type AdminSettings = {
  referralCode: string | null;
};
