"use client";
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { Task, TaskStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDeadline, formatCurrency } from '@/lib/utils';
import { ClipboardList, CheckCircle, Play, Smile, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const statusConfig: Record<TaskStatus, { color: 'default' | 'secondary' | 'destructive' | 'outline', text: string }> = {
    Pending: { color: 'destructive', text: 'Pending' },
    Acknowledged: { color: 'secondary', text: 'To Do' },
    InProgress: { color: 'outline', text: 'In Progress' },
    Completed: { color: 'default', text: 'Completed' },
    Approved: { color: 'default', text: 'Approved' },
    Rejected: { color: 'destructive', text: 'Rejected' },
};


export default function PartnerTasksPage() {
  const { currentUser, getTasksForPartner, updateTask } = useAuth();
  const { toast } = useToast();

  const myTasks = useMemo(() => {
    if (!currentUser) return [];
    return getTasksForPartner(currentUser.id);
  }, [currentUser, getTasksForPartner]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!currentUser) return;
      
      const unacknowledgedTasks = getTasksForPartner(currentUser.id).filter(
        t => t.status === 'Pending' && !t.acknowledgedAt
      );

      unacknowledgedTasks.forEach(task => {
        const fiveMinutes = 5 * 60 * 1000;
        if (new Date().getTime() - new Date(task.createdAt).getTime() > fiveMinutes) {
          toast({
            variant: 'destructive',
            title: 'Action Required: New Task',
            description: `Please acknowledge the new task: "${task.title}"`,
            duration: 10000,
          });
        }
      });
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, [currentUser, getTasksForPartner, toast]);

  const handleUpdateStatus = (task: Task, status: TaskStatus) => {
    let updates: Partial<Task> = { status };
    if (status === 'Acknowledged') {
        updates.acknowledgedAt = new Date().toISOString();
        toast({ title: 'Task Acknowledged!' });
    }
     if (status === 'Completed') {
        updates.completedAt = new Date().toISOString();
        toast({ title: 'Task Marked as Complete!', description: 'Awaiting admin review.' });
    }
    updateTask(task.id, updates);
  };

  const tasksByStatus = (status: TaskStatus) => myTasks.filter(t => t.status === status);
  const pendingTasks = myTasks.filter(t => t.status === 'Pending' || t.status === 'Acknowledged' || t.status === 'InProgress');
  const finishedTasks = myTasks.filter(t => t.status === 'Completed' || t.status === 'Approved' || t.status === 'Rejected');

  const renderTaskCard = (task: Task) => (
    <Card key={task.id}>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>{task.title}</CardTitle>
                    <CardDescription>{task.description}</CardDescription>
                </div>
                <Badge variant={statusConfig[task.status].color}>{statusConfig[task.status].text}</Badge>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span>Deadline: <span className="font-medium text-foreground">{formatDeadline(task.deadline)}</span></span>
                <span>Incentive: <span className="font-medium text-green-600">{formatCurrency(task.incentive)}</span></span>
            </div>
            {new Date(task.deadline) < new Date() && task.status !== 'Approved' && task.status !== 'Completed' && (
                <p className="text-destructive text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4"/> This task is overdue.
                </p>
            )}
        </CardContent>
        <CardFooter className="flex gap-2">
            {task.status === 'Pending' && <Button onClick={() => handleUpdateStatus(task, 'Acknowledged')}>Acknowledge Task</Button>}
            {task.status === 'Acknowledged' && <Button onClick={() => handleUpdateStatus(task, 'InProgress')}><Play className="h-4 w-4 mr-2"/>Start Progress</Button>}
            {task.status === 'InProgress' && <Button onClick={() => handleUpdateStatus(task, 'Completed')}><CheckCircle className="h-4 w-4 mr-2"/>Mark as Complete</Button>}
        </CardFooter>
    </Card>
  );

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2"><ClipboardList/> My Tasks</h1>
      
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Active Tasks</h2>
            {pendingTasks.length > 0 ? (
                pendingTasks.map(renderTaskCard)
            ) : (
                <Card className="flex flex-col items-center justify-center p-8 text-center">
                    <Smile className="h-12 w-12 text-green-500 mb-4"/>
                    <h3 className="text-xl font-semibold">All caught up!</h3>
                    <p className="text-muted-foreground">You have no pending tasks.</p>
                </Card>
            )}
        </div>
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Completed Tasks</h2>
            {finishedTasks.length > 0 ? (
                finishedTasks.map(renderTaskCard)
            ) : (
                 <Card className="flex flex-col items-center justify-center p-8 text-center">
                    <h3 className="text-xl font-semibold">No completed tasks yet.</h3>
                    <p className="text-muted-foreground">Your finished tasks will appear here.</p>
                </Card>
            )}
        </div>
      </div>
    </div>
  );
}
