import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Task } from "@/types/models";

interface AddTaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (task: Omit<Task, 'taskId'>) => void;
  patients: Array<{ id: string; name: string; }>;
  staff: Array<{ id: string; name: string; }>;
}

export function AddTaskForm({ open, onOpenChange, onSubmit, patients, staff }: AddTaskFormProps) {
  const [formData, setFormData] = useState({
    patientId: "",
    title: "",
    type: "" as Task['type'],
    due: "",
    assigneeId: "",
    priority: "medium" as Task['priority'],
    testType: "",
    medication: "",
    time: ""
  });
  const [selectedDate, setSelectedDate] = useState<Date>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patientId || !formData.title || !formData.type || !formData.assigneeId || !selectedDate || !formData.time) {
      alert('Please fill in all required fields: Patient ID, Task Description, Task Type, Assigned Person, Date and Time');
      return;
    }

    const dueDateTime = selectedDate;
    if (formData.time) {
      const [hours, minutes] = formData.time.split(':');
      dueDateTime.setHours(parseInt(hours), parseInt(minutes));
    }

    const newTask: Omit<Task, 'taskId'> = {
      patientId: formData.patientId,
      title: formData.title,
      type: formData.type,
      due: dueDateTime.toISOString(),
      assigneeId: formData.assigneeId,
      assigneeRole: 'doctor', // Default to doctor, this could be enhanced to determine role based on assigneeId
      status: 'open',
      priority: formData.priority,
      recurring: false
    };

    onSubmit(newTask);
    onOpenChange(false);
    
    // Reset form
    setFormData({
      patientId: "",
      title: "",
      type: "" as Task['type'],
      due: "",
      assigneeId: "",
      priority: "medium",
      testType: "",
      medication: "",
      time: ""
    });
    setSelectedDate(undefined);
  };

  const getTaskTitle = () => {
    if (formData.type === 'lab' && formData.testType) {
      return `Lab Test: ${formData.testType}`;
    }
    if (formData.type === 'medication' && formData.medication) {
      return `Medication: ${formData.medication}`;
    }
    return formData.title;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto w-[95vw]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label htmlFor="patient">Patient ID *</Label>
            <Select value={formData.patientId} onValueChange={(value) => setFormData(prev => ({ ...prev, patientId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.name} ({patient.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Task Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Task Type *</Label>
            <Select value={formData.type} onValueChange={(value: Task['type']) => setFormData(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select task type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lab">Lab Test</SelectItem>
                <SelectItem value="medication">Medication</SelectItem>
                <SelectItem value="procedure">Procedure</SelectItem>
                <SelectItem value="assessment">Assessment</SelectItem>
                <SelectItem value="discharge">Discharge</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Test Type (if lab selected) */}
          {formData.type === 'lab' && (
            <div className="space-y-2">
              <Label htmlFor="testType">Test Type</Label>
              <Input
                id="testType"
                value={formData.testType}
                onChange={(e) => setFormData(prev => ({ ...prev, testType: e.target.value, title: `Lab Test: ${e.target.value}` }))}
                placeholder="e.g., Blood Test, X-Ray, MRI"
              />
            </div>
          )}

          {/* Medication (if medication selected) */}
          {formData.type === 'medication' && (
            <div className="space-y-2">
              <Label htmlFor="medication">Medication</Label>
              <Input
                id="medication"
                value={formData.medication}
                onChange={(e) => setFormData(prev => ({ ...prev, medication: e.target.value, title: `Medication: ${e.target.value}` }))}
                placeholder="e.g., Paracetamol 500mg"
              />
            </div>
          )}

          {/* Task Title (if not auto-generated) */}
          {formData.type && formData.type !== 'lab' && formData.type !== 'medication' && (
            <div className="space-y-2">
              <Label htmlFor="title">Task Description</Label>
              <Textarea
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter task description"
                rows={3}
              />
            </div>
          )}

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          {/* Assigned Person */}
          <div className="space-y-2">
            <Label htmlFor="assignee">Assigned Person *</Label>
            <Select value={formData.assigneeId} onValueChange={(value) => setFormData(prev => ({ ...prev, assigneeId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={formData.priority} onValueChange={(value: Task['priority']) => setFormData(prev => ({ ...prev, priority: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              Submit
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}