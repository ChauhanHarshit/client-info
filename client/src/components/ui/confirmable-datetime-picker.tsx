import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ConfirmableDateTimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ConfirmableDateTimePicker({
  value,
  onChange,
  placeholder = "Select date and time",
  disabled = false,
  className,
}: ConfirmableDateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date | undefined>();
  const [tempTime, setTempTime] = useState("09:00");

  // Parse current value
  const currentValue = value ? new Date(value) : undefined;

  // Initialize temp values when opening
  useEffect(() => {
    if (isOpen) {
      if (currentValue) {
        setTempDate(currentValue);
        setTempTime(format(currentValue, "HH:mm"));
      } else {
        setTempDate(undefined);
        setTempTime("09:00");
      }
    }
  }, [isOpen, currentValue]);

  const handleConfirm = () => {
    if (tempDate) {
      const [hours, minutes] = tempTime.split(':');
      const combined = new Date(tempDate);
      combined.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      onChange(combined.toISOString());
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setIsOpen(false);
  };

  // Generate time options
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push(timeString);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "w-full justify-start text-left font-normal",
          !value && "text-muted-foreground",
          className
        )}
        disabled={disabled}
        onClick={() => setIsOpen(true)}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {currentValue ? (
          format(currentValue, "MMM d, yyyy 'at' h:mm a")
        ) : (
          <span>{placeholder}</span>
        )}
      </Button>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" 
          onClick={handleCancel}
        >
          <div 
            className="bg-white rounded-lg shadow-xl border p-4 max-w-sm w-full mx-4 space-y-4" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Calendar */}
            <Calendar
              mode="single"
              selected={tempDate}
              onSelect={setTempDate}
              initialFocus
            />
            
            {/* Time Picker */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Time</span>
              </div>
              <Select value={tempTime} onValueChange={setTempTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {format(new Date(`1970-01-01T${time}:00`), "h:mm a")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button
                onClick={handleConfirm}
                disabled={!tempDate}
                className="w-full"
              >
                Confirm
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClear}
                  className="flex-1"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}