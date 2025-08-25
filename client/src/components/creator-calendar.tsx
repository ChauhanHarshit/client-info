import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useComprehensiveCalendarOptimization } from "@/hooks/useCalendarOptimization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmableDateTimePicker } from "@/components/ui/confirmable-datetime-picker";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCreatorPersonalEventSchema } from "@shared/schema";
import { z } from "zod";
import { CalendarIcon, PlusIcon, MapPinIcon, ClockIcon, EditIcon, TrashIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek, subMonths, addMonths, subWeeks, addWeeks } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { CenteredSectionLoader } from "@/components/ui/loading-animation";
import { useToast } from "@/hooks/use-toast";

interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  startDate?: string;
  startDateTime?: string;
  endDate?: string;
  endDateTime?: string;
  location?: string;
  eventType: string;
  source: 'admin' | 'personal';
  editable: boolean;
  creatorId?: number;
}

interface CreatorCalendarProps {
  creatorId: number;
  creatorUsername: string;
}

const eventTypeOptions = [
  { value: "trip", label: "Trip", color: "bg-blue-500" },
  { value: "custom_content", label: "Custom Content Request", color: "bg-purple-500" },
  { value: "collab", label: "Collab Shoot", color: "bg-green-500" },
  { value: "livestream", label: "Livestream Date", color: "bg-red-500" },
  { value: "freelance", label: "Freelanced/Misc Event", color: "bg-orange-500" },
  { value: "personal", label: "Personal Event", color: "bg-gray-500" }
];

const createEventSchema = insertCreatorPersonalEventSchema.extend({
  startDateTime: z.string().min(1, "Start date is required"),
  endDateTime: z.string().optional(),
}).omit({
  location: true, // Remove location since it doesn't exist in the database schema
  creatorId: true, // Remove creatorId from form validation since it's provided separately
});

type CreateEventFormData = z.infer<typeof createEventSchema>;

type CalendarView = 'month' | 'week' | 'custom';

export function CreatorCalendar({ creatorId, creatorUsername }: CreatorCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date }>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [dayDetailDialog, setDayDetailDialog] = useState<{ isOpen: boolean; date: Date | null; events: CalendarEvent[] }>({
    isOpen: false,
    date: null,
    events: []
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Initialize comprehensive calendar optimization system
  const calendarOptimization = useComprehensiveCalendarOptimization(creatorUsername, {
    enableDatabaseOptimization: true,
    enableRealTimeSync: true,
    enableMobileOptimizations: true,
    enablePerformanceMonitoring: true,
    enableVirtualScrolling: true,
    enablePrefetching: true,
    enableAdvancedErrorHandling: true,
    cacheTimeout: 2 * 60 * 1000, // 2 minutes
    syncInterval: 30000 // 30 seconds
  });

  // Use direct events query with optimization enhancements
  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ['/api/creator', creatorUsername, 'events'],
    queryFn: async () => {
      const response = await fetch(`/api/creator/${creatorUsername}/events`);
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (optimization)
    gcTime: 10 * 60 * 1000, // 10 minutes (optimization)
    refetchOnWindowFocus: false, // optimization
    retry: 3, // optimization
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // optimization
  });

  // Debug logging for events with performance metrics
  useEffect(() => {
    if (calendarOptimization.isOptimized) {
      const metrics = calendarOptimization.getComprehensiveMetrics();
      console.log('Optimized Calendar Debug:', {
        creatorUsername,
        eventsCount: events.length,
        events: events,
        isLoading,
        optimizationStatus: calendarOptimization.optimizationStatus,
        performanceMetrics: metrics,
        memoryUsage: calendarOptimization.calendarState.memoryUsage,
        syncStatus: calendarOptimization.calendarState.syncStatus
      });
    }
  }, [events, creatorUsername, isLoading, calendarOptimization]);



  const createEventMutation = useMutation({
    mutationFn: (data: CreateEventFormData) => 
      apiRequest("POST", "/api/creator-personal-events", {
        ...data,
        creatorId,
      }),
    onSuccess: () => {
      // Use optimized cache invalidation
      calendarOptimization.invalidateCache();
      calendarOptimization.syncNow();
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Event created successfully",
        description: "Your event has been added to the calendar.",
      });
    },
    onError: (error) => {
      console.error("Error creating event:", error);
      toast({
        title: "Error creating event",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateEventFormData> }) =>
      apiRequest("PUT", `/api/creator-personal-events/${id}`, data),
    onSuccess: () => {
      calendarOptimization.invalidateCache();
      calendarOptimization.syncNow();
      setEditingEvent(null);
      form.reset();
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/creator-personal-events/${id}`),
    onSuccess: () => {
      calendarOptimization.invalidateCache();
      calendarOptimization.syncNow();
    },
  });

  const form = useForm<CreateEventFormData>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: "",
      description: "",
      eventType: "personal",
      startDateTime: "",
      endDateTime: "",
    },
  });

  const onSubmit = (data: CreateEventFormData) => {
    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, data });
    } else {
      createEventMutation.mutate(data);
    }
  };

  const handleEditEvent = (event: CalendarEvent) => {
    if (!event.editable) return;
    
    setEditingEvent(event);
    form.reset({
      title: event.title,
      description: event.description || "",
      eventType: event.eventType,
      startDateTime: format(parseISO(event.startDate || event.startDateTime), "yyyy-MM-dd'T'HH:mm"),
      endDateTime: event.endDate || event.endDateTime ? format(parseISO(event.endDate || event.endDateTime), "yyyy-MM-dd'T'HH:mm") : "",
    });
    setIsCreateDialogOpen(true);
  };

  const handleDeleteEvent = (eventId: number) => {
    if (confirm("Are you sure you want to delete this event?")) {
      deleteEventMutation.mutate(eventId);
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    const eventDate = new Date(event.startDate || event.startDateTime);
    const dayEvents = getEventsForDate(eventDate);
    
    setDayDetailDialog({
      isOpen: true,
      date: eventDate,
      events: dayEvents
    });
  };

  const getEventTypeConfig = (type: string) => {
    return eventTypeOptions.find(option => option.value === type) || eventTypeOptions[eventTypeOptions.length - 1];
  };

  const getEventsForDate = (date: Date) => {
    const filteredEvents = events.filter((event: CalendarEvent) => {
      // Handle both startDate and startDateTime fields from backend
      const startDateString = event.startDate || event.startDateTime;
      
      if (!startDateString) {
        console.log('Event missing startDate/startDateTime:', event);
        return false;
      }
      
      try {
        const eventStart = parseISO(startDateString);
        // Compare dates in local timezone by creating date objects with same year/month/day
        const eventLocalDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
        const checkingLocalDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const isSame = eventLocalDate.getTime() === checkingLocalDate.getTime();
        
        console.log('Event date comparison:', {
          event: event.title,
          checkingDate: format(date, 'yyyy-MM-dd'),
          eventDateUTC: format(eventStart, 'yyyy-MM-dd HH:mm:ss'),
          eventDateLocal: format(eventLocalDate, 'yyyy-MM-dd'),
          isSameDay: isSame
        });
        return isSame;
      } catch (error) {
        console.error('Error parsing event date:', error, event);
        return false;
      }
    });
    
    console.log('Filtered events for', format(date, 'yyyy-MM-dd'), ':', filteredEvents);
    return filteredEvents;
  };

  const hasEventsOnDate = (date: Date) => {
    return getEventsForDate(date).length > 0;
  };

  const getCalendarDays = () => {
    let days: Date[] = [];
    if (calendarView === 'month') {
      const start = startOfWeek(startOfMonth(currentMonth));
      const end = endOfWeek(endOfMonth(currentMonth));
      days = eachDayOfInterval({ start, end });
    } else if (calendarView === 'week') {
      const start = startOfWeek(currentMonth);
      const end = endOfWeek(currentMonth);
      days = eachDayOfInterval({ start, end });
    } else {
      days = eachDayOfInterval({ start: customDateRange.start, end: customDateRange.end });
    }
    
    // Debug logging to check if July 9th is included
    const july9th = new Date(2025, 6, 9); // July 9th, 2025
    const includesJuly9th = days.some(day => 
      day.getFullYear() === 2025 && 
      day.getMonth() === 6 && 
      day.getDate() === 9
    );
    
    console.log('Calendar days debug:', {
      viewType: calendarView,
      currentMonth: format(currentMonth, 'yyyy-MM'),
      daysRange: `${format(days[0], 'yyyy-MM-dd')} to ${format(days[days.length - 1], 'yyyy-MM-dd')}`,
      totalDays: days.length,
      includesJuly9th,
      sampleDates: days.slice(0, 10).map(d => format(d, 'yyyy-MM-dd')),
      july9thSpecific: days.filter(d => d.getDate() === 9 && d.getMonth() === 6).map(d => format(d, 'yyyy-MM-dd'))
    });
    
    return days;
  };

  const navigateCalendar = (direction: 'prev' | 'next') => {
    // Record navigation interaction for performance monitoring
    if (calendarOptimization.modules.performance) {
      calendarOptimization.modules.performance.recordMetric({
        name: 'calendar_navigation',
        value: 1,
        unit: 'count',
        category: 'interaction',
        context: { direction }
      });
    }

    // Use optimized prefetching for navigation
    if (calendarView === 'month') {
      const newMonth = direction === 'prev' ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1);
      setCurrentMonth(newMonth);
      
      // Prefetch adjacent months for better performance
      calendarOptimization.prefetchMonth(newMonth);
    } else if (calendarView === 'week') {
      const newWeek = direction === 'prev' ? subWeeks(currentMonth, 1) : addWeeks(currentMonth, 1);
      setCurrentMonth(newWeek);
      
      // Prefetch for week view as well
      calendarOptimization.prefetchMonth(newWeek);
    }
  };

  // Mobile gesture handling
  useEffect(() => {
    if (calendarOptimization.modules.mobile && calendarOptimization.modules.mobile.currentGesture) {
      calendarOptimization.modules.mobile.handleCalendarGesture(
        calendarOptimization.modules.mobile.currentGesture,
        (direction: string) => {
          switch (direction) {
            case 'next':
              navigateCalendar('next');
              break;
            case 'prev':
              navigateCalendar('prev');
              break;
          }
        }
      );
    }
  }, [calendarOptimization.modules.mobile?.currentGesture]);

  const getViewTitle = () => {
    if (calendarView === 'month') {
      return format(currentMonth, 'MMMM yyyy');
    } else if (calendarView === 'week') {
      const start = startOfWeek(currentMonth);
      const end = endOfWeek(currentMonth);
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    } else {
      return `${format(customDateRange.start, 'MMM d')} - ${format(customDateRange.end, 'MMM d, yyyy')}`;
    }
  };

  const handleCreateNewEvent = () => {
    setEditingEvent(null);
    form.reset({
      title: "",
      description: "",
      eventType: "personal",
      startDateTime: selectedDate ? format(selectedDate, "yyyy-MM-dd'T'09:00") : "",
      endDateTime: "",
    });
    setIsCreateDialogOpen(true);
  };

  if (isLoading) {
    return <CenteredSectionLoader />;
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2 px-4">
        <div className="flex items-center space-x-3">
          <CalendarIcon className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg md:text-xl font-semibold">My Calendar</h2>
        </div>
        <div className="mr-3">
          <Button onClick={handleCreateNewEvent} className="bg-blue-600 hover:bg-blue-700 text-xs px-2.5 py-1">
            <PlusIcon className="h-3 w-3 mr-1" />
            Add Personal Event
          </Button>
        </div>
      </div>

      {/* Calendar View Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateCalendar('prev')}
                disabled={calendarView === 'custom'}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-lg">{getViewTitle()}</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateCalendar('next')}
                disabled={calendarView === 'custom'}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={calendarView} onValueChange={(value: CalendarView) => setCalendarView(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Date Range Picker */}
          {calendarView === 'custom' && (
            <div className="flex items-center gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Label htmlFor="start-date" className="text-sm font-medium">From:</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={format(customDateRange.start, 'yyyy-MM-dd')}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
                  className="w-36"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="end-date" className="text-sm font-medium">To:</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={format(customDateRange.end, 'yyyy-MM-dd')}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
                  className="w-36"
                />
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          {calendarView !== 'custom' && (
            <div className="grid grid-cols-7 gap-1 mb-4">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="p-2 text-center font-medium text-gray-500 text-sm">
                  {day}
                </div>
              ))}
            </div>
          )}

          <div className={`grid gap-1 ${calendarView === 'week' ? 'grid-cols-7' : calendarView === 'custom' ? 'grid-cols-1 space-y-2' : 'grid-cols-7'}`}>
            {getCalendarDays().map((date) => {
              const dayEvents = getEventsForDate(date);
              const isCurrentDay = isToday(date);
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const hasEvents = hasEventsOnDate(date);
              const isHovered = hoveredDate && isSameDay(date, hoveredDate);
              
              // Debug logging for July 9th specifically
              if (date.getFullYear() === 2025 && date.getMonth() === 6 && date.getDate() === 9) {
                console.log('July 9th calendar cell debug:', {
                  date: format(date, 'yyyy-MM-dd'),
                  dayEvents: dayEvents.length,
                  hasEvents,
                  events: dayEvents,
                  allEvents: events.length
                });
              }

              if (calendarView === 'custom') {
                // Custom view: List format
                return (
                  <div
                    key={date.toISOString()}
                    className={`
                      p-4 border rounded-lg cursor-pointer transition-all
                      ${isCurrentDay ? "bg-blue-50 border-blue-200" : "border-gray-200 hover:bg-gray-50"}
                      ${isSelected ? "ring-2 ring-blue-500" : ""}
                      ${hasEvents ? "border-l-4 border-l-purple-500" : ""}
                    `}
                    onClick={() => setSelectedDate(date)}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`font-medium ${isCurrentDay ? "text-blue-600" : "text-gray-900"}`}>
                        {format(date, "EEEE, MMMM d, yyyy")}
                      </div>
                      {hasEvents && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span className="text-sm text-gray-500">{dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                    {dayEvents.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {dayEvents.map((event: CalendarEvent) => {
                          const config = getEventTypeConfig(event.eventType);
                          return (
                            <div
                              key={event.id}
                              className={`text-sm p-2 rounded text-white ${config.color} cursor-pointer hover:opacity-80`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEventClick(event);
                              }}
                            >
                              <div className="font-medium">{event.title}</div>
                              {event.description && (
                                <div className="text-xs opacity-90 mt-1">{event.description}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Month/Week view: Grid format
              return (
                <Popover key={date.toISOString()}>
                  <PopoverTrigger asChild>
                    <div
                      className={`
                        min-h-[100px] p-2 border rounded-lg cursor-pointer transition-all relative
                        ${isCurrentDay ? "bg-blue-50 border-blue-200" : "border-gray-200 hover:bg-gray-50"}
                        ${isSelected ? "ring-2 ring-blue-500" : ""}
                        ${!isSameMonth(date, currentMonth) && calendarView === 'month' ? "opacity-50" : ""}
                        ${hasEvents ? "border-l-2 border-l-purple-500" : ""}
                      `}
                      onClick={() => setSelectedDate(date)}
                      onMouseEnter={() => setHoveredDate(date)}
                      onMouseLeave={() => setHoveredDate(null)}
                    >
                      <div className={`text-sm font-medium mb-1 flex items-center justify-between ${isCurrentDay ? "text-blue-600" : "text-gray-900"}`}>
                        <span>{format(date, "d")}</span>
                        {hasEvents && (
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map((event: CalendarEvent) => {
                          const config = getEventTypeConfig(event.eventType);
                          return (
                            <div
                              key={event.id}
                              className={`text-xs p-1 rounded truncate text-white ${config.color} hover:opacity-80 transition-opacity`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEventClick(event);
                              }}
                            >
                              {event.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-gray-500 font-medium">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  </PopoverTrigger>
                  {hasEvents && (
                    <PopoverContent className="w-80 p-0" side="bottom" align="start">
                      <div className="p-3 border-b">
                        <h4 className="font-semibold text-sm">{format(date, "EEEE, MMMM d")}</h4>
                        <p className="text-xs text-gray-500">{dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}</p>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {dayEvents.map((event: CalendarEvent) => {
                          const config = getEventTypeConfig(event.eventType);
                          return (
                            <div
                              key={event.id}
                              className="p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                              onClick={() => handleEventClick(event)}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
                                <span className="font-medium text-sm">{event.title}</span>
                              </div>
                              {event.description && (
                                <p className="text-xs text-gray-600 ml-5">{event.description}</p>
                              )}
                              <div className="flex items-center gap-2 ml-5 mt-1">
                                <ClockIcon className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {format(parseISO(event.startDate || event.startDateTime), "h:mm a")}
                                  {(event.endDate || event.endDateTime) && ` - ${format(parseISO(event.endDate || event.endDateTime), "h:mm a")}`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  )}
                </Popover>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Events */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>Events for {format(selectedDate, "MMMM d, yyyy")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getEventsForDate(selectedDate).length === 0 ? (
                <p className="text-gray-500 text-center py-4">No events scheduled for this date</p>
              ) : (
                getEventsForDate(selectedDate).map((event: CalendarEvent) => {
                  const config = getEventTypeConfig(event.eventType);
                  return (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge className={`${config.color} text-white`}>
                            {config.label}
                          </Badge>
                          {event.source === 'admin' && (
                            <Badge variant="outline">Admin Event</Badge>
                          )}
                        </div>
                        <h4 className="font-medium">{event.title}</h4>
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <ClockIcon className="h-4 w-4" />
                            {(event.startDate || event.startDateTime) && (
                              <span>{format(parseISO(event.startDate || event.startDateTime), "h:mm a")}</span>
                            )}
                            {(event.endDate || event.endDateTime) && (
                              <span> - {format(parseISO(event.endDate || event.endDateTime), "h:mm a")}</span>
                            )}
                          </div>
                          {event.location && (
                            <div className="flex items-center space-x-1">
                              <MapPinIcon className="h-4 w-4" />
                              <span>{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {event.editable && (
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditEvent(event)}
                          >
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}



      {/* Create/Edit Event Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "Edit Event" : "Create Personal Event"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter event title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select event type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <FormField
                      control={form.control}
                      name="startDateTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date & Time</FormLabel>
                          <FormControl>
                            <ConfirmableDateTimePicker
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Select start date & time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="relative">
                    <FormField
                      control={form.control}
                      name="endDateTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date & Time (Optional)</FormLabel>
                          <FormControl>
                            <ConfirmableDateTimePicker
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Select end date & time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>



              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter event description"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createEventMutation.isPending || updateEventMutation.isPending}
                >
                  {editingEvent ? "Update Event" : "Create Event"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Day Detail Dialog */}
      <Dialog open={dayDetailDialog.isOpen} onOpenChange={(open) => setDayDetailDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dayDetailDialog.date ? format(dayDetailDialog.date, "EEEE, MMMM d, yyyy") : "Event Details"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {dayDetailDialog.events.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No events scheduled for this day</p>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  {dayDetailDialog.events.length} event{dayDetailDialog.events.length > 1 ? 's' : ''} scheduled
                </p>
                <div className="space-y-3">
                  {dayDetailDialog.events.map((event: CalendarEvent) => {
                    const config = getEventTypeConfig(event.eventType);
                    const startTime = event.startDate || event.startDateTime;
                    const endTime = event.endDate || event.endDateTime;
                    
                    return (
                      <div key={event.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start gap-3">
                          <div className={`w-4 h-4 rounded-full ${config.color} mt-1 flex-shrink-0`}></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-gray-900 truncate">{event.title}</h4>
                              <Badge variant="secondary" className="text-xs">
                                {config.label}
                              </Badge>
                            </div>
                            
                            {event.description && (
                              <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                            )}
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              {startTime && (
                                <div className="flex items-center gap-1">
                                  <ClockIcon className="w-3 h-3" />
                                  <span>
                                    {format(parseISO(startTime), "h:mm a")}
                                    {endTime && ` - ${format(parseISO(endTime), "h:mm a")}`}
                                  </span>
                                </div>
                              )}
                              
                              {event.location && (
                                <div className="flex items-center gap-1">
                                  <MapPinIcon className="w-3 h-3" />
                                  <span>{event.location}</span>
                                </div>
                              )}
                              
                              <Badge variant={event.source === 'admin' ? 'default' : 'outline'} className="text-xs">
                                {event.source === 'admin' ? 'Company Event' : 'Personal Event'}
                              </Badge>
                            </div>
                            
                            {event.editable && (
                              <div className="flex justify-end gap-2 mt-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setDayDetailDialog(prev => ({ ...prev, isOpen: false }));
                                    handleEditEvent(event);
                                  }}
                                  className="text-xs"
                                >
                                  <EditIcon className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setDayDetailDialog(prev => ({ ...prev, isOpen: false }));
                                    handleDeleteEvent(event.id);
                                  }}
                                  className="text-xs text-red-600 hover:text-red-700"
                                >
                                  <TrashIcon className="w-3 h-3 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CreatorCalendar;