"use client";

import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import type { Partner, Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDeadline, formatCurrency } from '@/lib/utils';
import { ClipboardList, PlusCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().min(1, 'Description is required.'),
  partnerId: z.string().min(1, 'Please select a partner.'),
  deadline: z.string().min(1, 'Deadline is required.'),
  incentive: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().positive('Incentive must be a positive number.')
  ),
});

export default function AdminTasksPage() {
  const { getPartners, createTask, getAllTasks, approveTask, updateTask } = useAuth();
  const { toast } = useToast();

  const [openCreate, setOpenCreate] = useState(false);
  
  const partners = useMemo(() => getPartners().filter(p => p.approved), [getPartners]);
  const allTasks = useMemo(() => getAllTasks(), [getAllTasks]);

  const taskForm = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '', description: '', partnerId: '', incentive: 0 },
  });

  const onCreateSubmit = (values: z.infer<typeof taskSchema>) => {
    createTask(values);
    taskForm.reset();
    setOpenCreate(false);
  };

  const handleApprove = (taskId: string) => {
    approveTask(taskId);
  };
  
  const handleReject = (taskId: string) => {
    updateTask(taskId, { status: 'Rejected' });
    toast({ variant: 'destructive', title: 'Task Rejected' });
  };

  const getPartnerUsername = (partnerId: string) => {
      return partners.find(p => p.id === partnerId)?.username ?? 'Unknown';
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2"><ClipboardList/> Task Management</h1>
        <div className="flex gap-2">
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4"/>Create Task</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle>Create a new task</DialogTitle>
                </DialogHeader>
                <form onSubmit={taskForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div>
                    <Label htmlFor="partnerId">Assign to</Label>
                    <Controller
                        control={taskForm.control}
                        name="partnerId"
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a partner" />
                            </SelectTrigger>
                            <SelectContent>
                                {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.username}</SelectItem>)}
                            </SelectContent>
                            </Select>
                        )}
                    />
                    {taskForm.formState.errors.partnerId && <p className="text-destructive text-sm mt-1">{taskForm.formState.errors.partnerId.message}</p>}
                </div>
                <div>
                    <Label htmlFor="title">Task Title</Label>
                    <Input id="title" {...taskForm.register('title')} />
                    {taskForm.formState.errors.title && <p className="text-destructive text-sm mt-1">{taskForm.formState.errors.title.message}</p>}
                </div>
                <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" {...taskForm.register('description')} />
                    {taskForm.formState.errors.description && <p className="text-destructive text-sm mt-1">{taskForm.formState.errors.description.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input id="deadline" type="datetime-local" {...taskForm.register('deadline')} />
                    {taskForm.formState.errors.deadline && <p className="text-destructive text-sm mt-1">{taskForm.formState.errors.deadline.message}</p>}
                    </div>
                    <div>
                    <Label htmlFor="incentive">Incentive (₹)</Label>
                    <Input id="incentive" type="number" {...taskForm.register('incentive')} />
                    {taskForm.formState.errors.incentive && <p className="text-destructive text-sm mt-1">{taskForm.formState.errors.incentive.message}</p>}
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                    <Button type="submit">Create Task</Button>
                </DialogFooter>
                </form>
            </DialogContent>
            </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Master Task Sheet</CardTitle>
            <CardDescription>View and manage all tasks assigned to partners.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-6">
                {allTasks.length > 0 ? allTasks.map(task => (
                    <div key={task.id} className="p-4 border rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                                <Badge variant={task.status === 'Completed' ? 'default' : 'secondary'}>{task.status}</Badge>
                                <p className="font-semibold">{task.title}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pt-1">
                                <span>Assigned to: <span className="font-medium text-foreground">{getPartnerUsername(task.partnerId)}</span></span>
                                <span>Deadline: <span className="font-medium text-foreground">{formatDeadline(task.deadline)}</span></span>
                                <span>Incentive: <span className="font-medium text-green-600">{formatCurrency(task.incentive)}</span></span>
                            </div>
                        </div>
                         {task.status === 'Completed' && (
                            <div className="flex gap-2 self-end md:self-center">
                                <Button size="sm" variant="outline" onClick={() => handleReject(task.id)}><XCircle className="h-4 w-4 mr-1"/>Reject</Button>
                                <Button size="sm" onClick={() => handleApprove(task.id)}><CheckCircle className="h-4 w-4 mr-1"/>Approve</Button>
                            </div>
                        )}
                        {task.status === 'InProgress' && (
                            <Badge variant="outline" className="flex items-center gap-1 self-end md:self-center">
                                <Clock className="h-3 w-3"/>
                                In Progress
                            </Badge>
                        )}
                    </div>
                )) : (
                    <p className="text-center text-muted-foreground py-8">No tasks created yet.</p>
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
