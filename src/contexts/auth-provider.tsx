"use client";

import { createContext, ReactNode, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { Admin, Partner, User, AttendanceRecord, AdminSettings, Task, TaskStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { generateReferralCode } from '@/lib/utils';

interface AuthContextType {
  currentUser: User | null | undefined; // undefined means loading
  login: (username: string, password: string) => User | null;
  logout: () => void;
  registerAdmin: (username: string, password: string) => Admin | null;
  registerPartner: (username: string, password: string, referralCode: string) => Partner | null;
  getPartners: () => Partner[];
  getPendingPartners: () => Partner[];
  approvePartner: (partnerId: string, baseSalary: number, shiftStartTime: string, shiftEndTime: string, destination: string) => boolean;
  updatePartnerDetails: (partnerId: string, details: { baseSalary?: number; shiftStartTime?: string; shiftEndTime?: string; destination?: string }) => boolean;
  getPartnerAttendance: (partnerId: string) => AttendanceRecord[];
  addAttendanceRecord: (userId: string) => AttendanceRecord | null;
  updateAttendanceRecord: (recordId: string) => AttendanceRecord | null;
  getTodaysAttendance: (userId: string) => AttendanceRecord[];
  adminReferralCode: string | null;
  updateUserProfile: (userId: string, data: { photoUrl?: string | null; phoneNumber?: string }) => void;
  getAdminForPartner: (partner: Partner) => Admin | null;
  getPartnerCountForAdmin: (admin: Admin) => number;
  hasAdminAccount: boolean;
  // Task Management
  createTask: (taskData: Omit<Task, 'id' | 'status' | 'createdAt'>) => Task | null;
  updateTask: (taskId: string, updates: Partial<Task>) => Task | null;
  getTasksForPartner: (partnerId: string) => Task[];
  getAllTasks: () => Task[];
  approveTask: (taskId: string) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useLocalStorage<User[]>('prayas_users', []);
  const [attendance, setAttendance] = useLocalStorage<AttendanceRecord[]>('prayas_attendance', []);
  const [tasks, setTasks] = useLocalStorage<Task[]>('prayas_tasks', []);
  const [adminSettings, setAdminSettings] = useLocalStorage<AdminSettings>('prayas_settings', { referralCode: null });
  const [currentUser, setCurrentUser] = useLocalStorage<User | null | undefined>('prayas_currentUser', undefined);
  const router = useRouter();
  const { toast } = useToast();

  const hasAdminAccount = useMemo(() => {
    if (users === undefined) return false;
    return users.some(u => u.role === 'admin');
  }, [users]);

  const registerAdmin = useCallback((username: string, password: string): Admin | null => {
    if (users?.some(u => u.role === 'admin')) {
      toast({ variant: 'destructive', title: 'Error', description: 'An admin already exists.' });
      return null;
    }
    if (users?.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        toast({ variant: 'destructive', title: 'Error', description: 'Username is already taken.' });
        return null;
    }
    const referralCode = generateReferralCode();
    const newAdmin: Admin = {
      id: `admin_${Date.now()}`,
      username,
      password,
      role: 'admin',
      approved: true,
      referralCode,
    };
    setUsers(prev => [...(prev ?? []), newAdmin]);
    setAdminSettings({ referralCode });
    return newAdmin;
  }, [users, setUsers, setAdminSettings, toast]);
  
  const registerPartner = useCallback((username: string, password: string, referralCode: string): Partner | null => {
    if (adminSettings?.referralCode !== referralCode) {
      toast({ variant: 'destructive', title: 'Error', description: 'Invalid referral code.' });
      return null;
    }
     if (users?.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        toast({ variant: 'destructive', title: 'Error', description: 'Username is already taken.' });
        return null;
    }
    const newPartner: Partner = {
      id: `partner_${Date.now()}`,
      username,
      password,
      role: 'partner',
      approved: false,
      adminReferralCode: referralCode,
      walletBalance: 0,
    };
    setUsers(prev => [...(prev ?? []), newPartner]);
    return newPartner;
  }, [users, setUsers, adminSettings, toast]);

  const login = useCallback((username: string, password: string): User | null => {
    const user = users?.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (user) {
      if (!user.approved) {
        toast({ title: 'Pending Approval', description: 'Your account is pending admin approval.' });
        return null;
      }
      setCurrentUser(user);
      return user;
    }
    toast({ variant: 'destructive', title: 'Login Failed', description: 'Invalid username or password.' });
    return null;
  }, [users, setCurrentUser, toast]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    router.push('/');
  }, [setCurrentUser, router]);

  const getPartners = useCallback(() => (users ?? []).filter(u => u.role === 'partner') as Partner[], [users]);
  const getPendingPartners = useCallback(() => (users ?? []).filter(u => u.role === 'partner' && !u.approved) as Partner[], [users]);

  const approvePartner = useCallback((partnerId: string, baseSalary: number, shiftStartTime: string, shiftEndTime: string, destination: string) => {
    let success = false;
    setUsers(prevUsers => {
      const newUsers = (prevUsers ?? []).map(u => {
        if (u.id === partnerId) {
          success = true;
          return { ...u, approved: true, baseSalary, shiftStartTime, shiftEndTime, destination, walletBalance: 0 };
        }
        return u;
      });
      return newUsers;
    });
    return success;
  }, [setUsers]);

  const updatePartnerDetails = useCallback((partnerId: string, details: { baseSalary?: number; shiftStartTime?: string; shiftEndTime?: string; destination?: string }) => {
    let success = false;
    setUsers(prevUsers => {
      const newUsers = (prevUsers ?? []).map(u => {
        if (u.id === partnerId) {
          success = true;
          return { ...u, ...details };
        }
        return u;
      });
      return newUsers;
    });
    return success;
  }, [setUsers]);

  const addAttendanceRecord = useCallback((userId: string) => {
    const newRecord: AttendanceRecord = {
      id: `att_${Date.now()}`,
      userId,
      checkIn: new Date().toISOString(),
    };
    setAttendance(prev => [...(prev ?? []), newRecord]);
    return newRecord;
  }, [setAttendance]);
  
  const updateAttendanceRecord = useCallback((recordId: string) => {
    let updatedRecord: AttendanceRecord | null = null;
    setAttendance(prevAtt => (prevAtt ?? []).map(rec => {
      if (rec.id === recordId) {
        updatedRecord = { ...rec, checkOut: new Date().toISOString() };
        return updatedRecord;
      }
      return rec;
    }));
    return updatedRecord;
  }, [setAttendance]);

  const getPartnerAttendance = useCallback((partnerId: string) => (attendance ?? []).filter(a => a.userId === partnerId), [attendance]);

  const getTodaysAttendance = useCallback((userId: string) => {
    if (!userId || !Array.isArray(attendance)) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return attendance.filter(a => {
        if (!a.checkIn) return false;
        const checkInDate = new Date(a.checkIn);
        checkInDate.setHours(0,0,0,0);
        return a.userId === userId && checkInDate.getTime() === today.getTime();
    });
  }, [attendance]);

  const updateUserProfile = useCallback((userId: string, data: { photoUrl?: string | null; phoneNumber?: string }) => {
    const processUpdate = (user: User) => {
        const updatedUser = { ...user, ...data };
        if (data.photoUrl === null) {
            delete updatedUser.photoUrl;
        }
        return updatedUser;
    };
      
    setUsers(prevUsers => (prevUsers ?? []).map(u => u.id === userId ? processUpdate(u) : u));

    if (currentUser?.id === userId) {
        setCurrentUser(prev => prev ? processUpdate(prev) : null);
    }
    
    toast({ title: 'Profile Saved', description: 'Your photo and details are now saved on this device.' });
  }, [setUsers, currentUser, setCurrentUser, toast]);

  const getAdminForPartner = useCallback((partner: Partner): Admin | null => {
      if (!partner || !users) return null;
      return users.find(u => u.role === 'admin' && (u as Admin).referralCode === partner.adminReferralCode) as Admin | null;
  }, [users]);
  
  const getPartnerCountForAdmin = useCallback((admin: Admin): number => {
      if (!admin || !users) return 0;
      return users.filter(u => u.role === 'partner' && (u as Partner).adminReferralCode === admin.referralCode).length;
  }, [users]);

  // --- Task Management ---

  const createTask = useCallback((taskData: Omit<Task, 'id' | 'status' | 'createdAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: `task_${Date.now()}`,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => [...(prev ?? []), newTask]);
    toast({ title: 'Task Created', description: `Task "${newTask.title}" has been assigned.`});
    return newTask;
  }, [setTasks, toast]);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    let updatedTask: Task | null = null;
    setTasks(prev => (prev ?? []).map(t => {
      if (t.id === taskId) {
        updatedTask = { ...t, ...updates };
        return updatedTask;
      }
      return t;
    }));
    return updatedTask;
  }, [setTasks]);
  
  const approveTask = useCallback((taskId: string) => {
    const task = (tasks ?? []).find(t => t.id === taskId);
    if (!task) {
        toast({ variant: 'destructive', title: 'Error', description: 'Task not found.' });
        return;
    }
    if (task.status === 'Approved') {
        toast({ title: 'Already Approved', description: 'This task has already been approved.' });
        return;
    }

    updateTask(taskId, { status: 'Approved' });
    setUsers(prevUsers => (prevUsers ?? []).map(u => {
        if (u.id === task.partnerId && u.role === 'partner') {
            const partner = u as Partner;
            const newBalance = (partner.walletBalance ?? 0) + task.incentive;
            return { ...partner, walletBalance: newBalance };
        }
        return u;
    }));

    // Update currentUser if the approved task belongs to them
    if (currentUser?.id === task.partnerId) {
        setCurrentUser(prev => {
            if (prev && prev.role === 'partner') {
                 const partner = prev as Partner;
                 const newBalance = (partner.walletBalance ?? 0) + task.incentive;
                 return { ...partner, walletBalance: newBalance };
            }
            return prev;
        });
    }

    toast({ title: 'Task Approved!', description: `Incentive of ${task.incentive} added to partner's wallet.`});
  }, [tasks, updateTask, setUsers, currentUser, setCurrentUser, toast]);

  const getTasksForPartner = useCallback((partnerId: string) => {
    return (tasks ?? []).filter(t => t.partnerId === partnerId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tasks]);

  const getAllTasks = useCallback(() => (tasks ?? []).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [tasks]);

  const value = {
    currentUser,
    login,
    logout,
    registerAdmin,
    registerPartner,
    getPartners,
    getPendingPartners,
    approvePartner,
    updatePartnerDetails,
    getPartnerAttendance,
    addAttendanceRecord,
    updateAttendanceRecord,
    getTodaysAttendance,
    adminReferralCode: adminSettings?.referralCode ?? null,
    updateUserProfile,
    getAdminForPartner,
    getPartnerCountForAdmin,
    hasAdminAccount,
    createTask,
    updateTask,
    getTasksForPartner,
    getAllTasks,
    approveTask,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
