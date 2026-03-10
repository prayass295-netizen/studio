import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNowStrict } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateReferralCode(): string {
  return Math.random().toString().substring(2, 8);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateDuration(startTime: string, endTime?: string): string {
  if (!startTime) return "0s";
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  
  let diff = Math.abs(end.getTime() - start.getTime()) / 1000;

  const hours = Math.floor(diff / 3600);
  diff %= 3600;
  const minutes = Math.floor(diff / 60);
  const seconds = Math.floor(diff % 60);

  const hStr = hours > 0 ? `${hours}h ` : '';
  const mStr = minutes > 0 ? `${minutes}m ` : '';
  const sStr = `${seconds}s`;

  const result = `${hStr}${mStr}${sStr}`.trim();
  if (result === "0s" && !endTime) return "Live";
  if (!result) return "0s";
  return result;
}

export function formatTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDeadline(deadline: string): string {
  const d = new Date(deadline);
  const now = new Date();
  if (d < now) {
    return `${formatDistanceToNowStrict(d, { addSuffix: true })}`;
  }
  return `Due in ${formatDistanceToNowStrict(d)}`;
}

export function compressImage(file: File, options: { maxSizeMB: number; maxWidthOrHeight: number }): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const { width, height } = img;
                let newWidth = width;
                let newHeight = height;

                if (width > height) {
                    if (width > options.maxWidthOrHeight) {
                        newHeight = height * (options.maxWidthOrHeight / width);
                        newWidth = options.maxWidthOrHeight;
                    }
                } else {
                    if (height > options.maxWidthOrHeight) {
                        newWidth = width * (options.maxWidthOrHeight / height);
                        newHeight = options.maxWidthOrHeight;
                    }
                }

                canvas.width = newWidth;
                canvas.height = newHeight;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Failed to get canvas context'));
                }
                ctx.drawImage(img, 0, 0, newWidth, newHeight);

                let quality = 0.9;
                let dataUrl = canvas.toDataURL('image/jpeg', quality);

                while (dataUrl.length / 1024 / 1024 > options.maxSizeMB && quality > 0.1) {
                    quality -= 0.1;
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                }

                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

    