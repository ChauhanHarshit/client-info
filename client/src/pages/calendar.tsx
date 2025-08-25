import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreatorAvatar } from "@/components/ui/creator-avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, ChevronLeft, ChevronRight, Check, X, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from "date-fns";
import { useCreatorProfiles } from "@/hooks/useCreatorProfiles";

const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startDateTime: z.string().min(1, "Start date/time is required"),
  endDateTime: z.string().optional(),
  allDay: z.boolean().default(false),
  assignedCreatorIds: z.array(z.number()).default([]),
  link: z.string().optional(),
  eventType: z.string().min(1, "Event type is required"),
  priority: z.string().min(1, "Priority is required"),
});

type EventFormData = z.infer<typeof eventFormSchema>;

interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime?: string;
  allDay: boolean;
  assignedCreatorIds: number[];
  link?: string;
  eventType: string;
  priority: string;
  createdBy: string;
  createdAt: string;
  assignedCreators?: Array<{ id: number; displayName: string; username: string }>;
}

interface Creator {
  id: number;
  displayName: string;
  username: string;
  profileImageUrl?: string;
}

// Type guard to validate CreatorAvatarData has all required Creator fields
function isValidCreator(creator: any): creator is Creator {
  return (
    creator &&
    typeof creator.id === 'number' &&
    typeof creator.displayName === 'string' &&
    typeof creator.username === 'string'
  );
}

export default function CalendarPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Don't render if not authenticated or still loading
  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Please log in to access the calendar.</div>;
  }

  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [creatorSearchOpen, setCreatorSearchOpen] = useState(false);
  const [creatorSearchValue, setCreatorSearchValue] = useState("");

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      startDateTime: "",
      endDateTime: "",
      allDay: false,
      assignedCreatorIds: [],
      link: "",
      eventType: "",
      priority: "",
    },
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/events"],
    enabled: !!user,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always refetch to ensure fresh data
    queryFn: async () => {
      console.log('Fetching events from API...');
      const response = await fetch('/api/events', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Events received from API:', data);
      return data;
    },
  });

  // Use the new creator profile system
  const { 
    creators, 
    isLoading: creatorsLoading, 
    error: creatorsError,
    getCreatorById,
    getCreatorsByIds
  } = useCreatorProfiles({
    activeOnly: true,
    sortByDisplayName: true
  });

  // Backup query for legacy compatibility
  const { data: legacyCreators, isLoading: legacyLoading } = useQuery({
    queryKey: ["/api/creators"],
    queryFn: async () => {
      const response = await fetch('/api/creators', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!user,
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Filter out any invalid creator entries
  const validCreators: Creator[] = Array.isArray(creators) 
    ? creators.filter(isValidCreator) 
    : [];
  

  

  


  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      return apiRequest("POST", "/api/events", data);
    },
    onSuccess: (result, variables) => {
      // Force immediate cache invalidation and refetch for admin calendar
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.refetchQueries({ queryKey: ["/api/events"] });
      
      // Also invalidate creator calendar cache for all assigned creators
      if (variables.assignedCreatorIds && variables.assignedCreatorIds.length > 0) {
        variables.assignedCreatorIds.forEach(creatorId => {
          const creator = validCreators.find(c => c.id === creatorId);
          if (creator) {
            queryClient.invalidateQueries({ queryKey: [`/api/creator/${creator.username}/events`] });
            queryClient.refetchQueries({ queryKey: [`/api/creator/${creator.username}/events`] });
          }
        });
      }
      
      setIsEventDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Event created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      return apiRequest("PUT", `/api/events/${editingEvent?.id}`, data);
    },
    onSuccess: (result, variables) => {
      // Force immediate cache invalidation and refetch for admin calendar
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      
      // Also invalidate creator calendar cache for all assigned creators
      if (variables.assignedCreatorIds && variables.assignedCreatorIds.length > 0) {
        variables.assignedCreatorIds.forEach(creatorId => {
          const creator = validCreators.find(c => c.id === creatorId);
          if (creator) {
            queryClient.invalidateQueries({ queryKey: [`/api/creator/${creator.username}/events`] });
            queryClient.refetchQueries({ queryKey: [`/api/creator/${creator.username}/events`] });
          }
        });
      }
      
      setIsEventDialogOpen(false);
      setEditingEvent(null);
      form.reset();
      toast({
        title: "Success",
        description: "Event updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      return apiRequest("DELETE", `/api/events/${eventId}`);
    },
    onSuccess: () => {
      // Force immediate cache invalidation and refetch for admin calendar
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      
      // Also invalidate creator calendar cache for all assigned creators (if editingEvent exists)
      if (editingEvent?.assignedCreatorIds && editingEvent.assignedCreatorIds.length > 0) {
        editingEvent.assignedCreatorIds.forEach(creatorId => {
          const creator = validCreators.find(c => c.id === creatorId);
          if (creator) {
            queryClient.invalidateQueries({ queryKey: [`/api/creator/${creator.username}/events`] });
            queryClient.refetchQueries({ queryKey: [`/api/creator/${creator.username}/events`] });
          }
        });
      }
      
      setIsEventDialogOpen(false);
      setEditingEvent(null);
      form.reset();
      toast({
        title: "Success",
        description: "Event deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EventFormData) => {
    if (editingEvent) {
      updateEventMutation.mutate(data);
    } else {
      createEventMutation.mutate(data);
    }
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    form.reset({
      title: event.title,
      description: event.description || "",
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime || "",
      allDay: event.allDay,
      assignedCreatorIds: event.assignedCreatorIds,
      link: event.link || "",
      eventType: event.eventType,
      priority: event.priority,
    });
    setIsEventDialogOpen(true);
  };

  const handleDeleteEvent = () => {
    if (editingEvent) {
      deleteEventMutation.mutate(editingEvent.id);
    }
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(prev => direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Filter upcoming events (next 7 days)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return events.filter((event: CalendarEvent) => {
      const eventDate = new Date(event.startDateTime);
      return eventDate >= now && eventDate <= nextWeek;
    }).sort((a: CalendarEvent, b: CalendarEvent) => {
      return new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime();
    });
  }, [events]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendars"
        description="Schedule and manage events for creators and clients"
        showBackButton={true}
        useBrowserBack={true}
        actions={
          <Button 
            onClick={() => setIsEventDialogOpen(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event</span>
          </Button>
        }
      />
      
      <div className="px-6 pb-6 space-y-6">
        {/* Calendar Navigation */}
        <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-semibold">
              {format(currentDate, "MMMM yyyy")}
            </h2>
            <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="p-2 text-center font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day) => {
              const dayEvents = events.filter((event: CalendarEvent) => {
                const eventDate = new Date(event.startDateTime);
                return format(eventDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
              });

              return (
                <div
                  key={format(day, "yyyy-MM-dd")}
                  className="min-h-[80px] p-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setIsEventDialogOpen(true);
                  }}
                >
                  <div className="font-medium text-sm">
                    {format(day, "d")}
                  </div>
                  <div className="space-y-1 mt-1">
                    {dayEvents.slice(0, 2).map((event: CalendarEvent) => (
                      <div
                        key={event.id}
                        className="text-xs p-1 bg-blue-100 text-blue-800 rounded truncate"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditEvent(event);
                        }}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            {upcomingEvents.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No events scheduled
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event: CalendarEvent) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleEditEvent(event)}
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{event.title}</h3>
                      <p className="text-sm text-gray-600">{event.description}</p>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <span>{format(new Date(event.startDateTime), "MMM d, yyyy 'at' h:mm a")}</span>
                        <span className="capitalize">{event.eventType}</span>
                        <span className="capitalize">{event.priority}</span>  
                      </div>
                      {event.assignedCreators && event.assignedCreators.length > 0 && (
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-sm text-gray-500">Assigned to:</span>
                          <div className="flex space-x-1">
                            {event.assignedCreators.map((creator) => (
                              <span key={creator.id} className="text-sm bg-gray-100 px-2 py-1 rounded">
                                {creator.displayName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Event Dialog */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "Edit Event" : "Create New Event"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Event title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Event description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date/Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date/Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="allDay"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>All Day Event</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
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
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="call">Call</SelectItem>
                          <SelectItem value="content">Content</SelectItem>
                          <SelectItem value="deadline">Deadline</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignedCreatorIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to Creators</FormLabel>
                    <div className="flex flex-col space-y-2">
                      {/* Selected creators display */}
                      {field.value.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-md min-h-[40px]">
                          {field.value.map((creatorId: number) => {
                            const creator = validCreators.find((c: Creator) => c.id === creatorId);
                            if (!creator) return null;
                            return (
                              <Badge key={creatorId} variant="secondary" className="flex items-center gap-1">
                                <CreatorAvatar 
                                  creator={creator} 
                                  size="sm" 
                                  fallbackClassName="text-xs"
                                />
                                <span className="text-xs">{creator.displayName}</span>
                                <X 
                                  className="w-3 h-3 ml-1 cursor-pointer hover:text-red-500" 
                                  onClick={() => {
                                    field.onChange(field.value.filter((id: number) => id !== creatorId));
                                  }}
                                />
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Multi-select dropdown */}
                      <Popover open={creatorSearchOpen} onOpenChange={setCreatorSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            role="combobox" 
                            aria-expanded={creatorSearchOpen}
                            className="justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              <span>
                                {field.value.length === 0 
                                  ? "Select creators..." 
                                  : field.value.length === 1 
                                    ? "1 creator selected" 
                                    : `${field.value.length} creators selected`
                                }
                              </span>
                            </div>
                            <Plus className="w-4 h-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <div className="p-2">
                            <Input
                              placeholder="Search creators..."
                              value={creatorSearchValue}
                              onChange={(e) => setCreatorSearchValue(e.target.value)}
                              className="h-9 mb-2"
                            />
                            <ScrollArea className="h-[200px]">
                              {validCreators
                                .filter(creator => 
                                  creator.displayName?.toLowerCase().includes(creatorSearchValue.toLowerCase()) ||
                                  creator.username?.toLowerCase().includes(creatorSearchValue.toLowerCase())
                                )
                                .map((creator) => (
                                  <div
                                    key={creator.id}
                                    className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer rounded"
                                    onClick={() => {
                                      const isSelected = field.value.includes(creator.id);
                                      if (isSelected) {
                                        field.onChange(field.value.filter((id: number) => id !== creator.id));
                                      } else {
                                        field.onChange([...field.value, creator.id]);
                                      }
                                    }}
                                  >
                                    <CreatorAvatar 
                                      creator={creator} 
                                      size="sm" 
                                      fallbackClassName="text-xs"
                                    />
                                    <div className="flex flex-col flex-1">
                                      <span className="font-medium">{creator.displayName}</span>
                                      <span className="text-xs text-gray-500">@{creator.username}</span>
                                    </div>
                                    <Check 
                                      className={`w-4 h-4 ${
                                        field.value.includes(creator.id) ? "opacity-100" : "opacity-0"
                                      }`} 
                                    />
                                  </div>
                                ))}
                              {validCreators.filter(creator => 
                                creator.displayName?.toLowerCase().includes(creatorSearchValue.toLowerCase()) ||
                                creator.username?.toLowerCase().includes(creatorSearchValue.toLowerCase())
                              ).length === 0 && (
                                <div className="text-center text-gray-500 py-4">
                                  No creators found matching "{creatorSearchValue}"
                                </div>
                              )}
                            </ScrollArea>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-between pt-4">
                <div>
                  {editingEvent && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDeleteEvent}
                      disabled={deleteEventMutation.isPending}
                    >
                      Delete Event
                    </Button>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEventDialogOpen(false);
                      setEditingEvent(null);
                      form.reset();
                    }}
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
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}