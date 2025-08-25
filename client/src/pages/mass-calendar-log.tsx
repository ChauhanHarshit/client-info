import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Plus, Edit2, Trash2, Filter, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { LoadingAnimation } from "@/components/ui/loading-animation";
import { apiRequest } from "@/lib/queryClient";

const eventSchema = z.object({
  creatorId: z.number(),
  type: z.enum(["custom", "trip", "live"]),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  confirmed: z.boolean().default(false),
  isAllDay: z.boolean().default(false),
  colorCode: z.string().default("#3B82F6"),
});

type EventFormData = z.infer<typeof eventSchema>;

const eventTypeColors = {
  custom: { bg: "bg-blue-500", text: "text-blue-700", border: "border-blue-200" },
  trip: { bg: "bg-green-500", text: "text-green-700", border: "border-green-200" },
  live: { bg: "bg-red-500", text: "text-red-700", border: "border-red-200" }
};

const eventTypeLabels = {
  custom: "Custom Content",
  trip: "Content Trip",
  live: "Live Session"
};

export default function MassCalendarLog() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [filterCreator, setFilterCreator] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      type: "custom",
      confirmed: false,
      isAllDay: false,
      colorCode: "#3B82F6",
    },
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ['/api/calendar/events'],
  });

  const { data: creators = [], isLoading: creatorsLoading } = useQuery<any[]>({
    queryKey: ['/api/creators'],
  });

  const createEventMutation = useMutation({
    mutationFn: (data: EventFormData) => apiRequest('POST', '/api/calendar/events', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EventFormData> }) =>
      apiRequest('PUT', `/api/calendar/events/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      setEditingEvent(null);
      form.reset();
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/calendar/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
    },
  });

  const confirmEventMutation = useMutation({
    mutationFn: (id: number) => apiRequest('PATCH', `/api/calendar/events/${id}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
    },
  });

  const onSubmit = (data: EventFormData) => {
    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, data });
    } else {
      createEventMutation.mutate(data);
    }
  };

  const handleEdit = (event: any) => {
    setEditingEvent(event);
    form.reset({
      creatorId: event.creatorId,
      type: event.type,
      title: event.title,
      description: event.description || "",
      startDate: event.startDate.split('T')[0],
      endDate: event.endDate ? event.endDate.split('T')[0] : "",
      location: event.location || "",
      notes: event.notes || "",
      confirmed: event.confirmed,
      isAllDay: event.isAllDay,
      colorCode: event.colorCode,
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (eventId: number) => {
    if (confirm("Are you sure you want to delete this event?")) {
      deleteEventMutation.mutate(eventId);
    }
  };

  const filteredEvents = events.filter((event: any) => {
    const creatorMatch = !filterCreator || filterCreator === "all" || event.creatorId.toString() === filterCreator;
    const typeMatch = !filterType || filterType === "all" || event.type === filterType;
    return creatorMatch && typeMatch;
  });

  if (eventsLoading || creatorsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingAnimation size="lg" />
      </div>
    );
  }

  return (
    <div className="px-6 pb-6 pt-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Calendars</h1>
            <p className="text-gray-600">Manage content schedules and events</p>
          </div>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingEvent(null);
              form.reset();
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="creatorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Creator</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select creator" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.isArray(creators) && creators.length > 0 ? (
                              creators.map((creator: any) => (
                                <SelectItem key={creator.id} value={creator.id.toString()}>
                                  {creator.displayName || creator.username}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-creators" disabled>
                                No creators available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="custom">Custom Content</SelectItem>
                            <SelectItem value="trip">Content Trip</SelectItem>
                            <SelectItem value="live">Live Session</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date & Time</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local" 
                            placeholder="Select date and time"
                            className="cursor-pointer"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date & Time (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local" 
                            placeholder="Select end date and time"
                            className="cursor-pointer"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Event location" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center space-x-4">
                  <FormField
                    control={form.control}
                    name="confirmed"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Confirmed</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isAllDay"
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
                </div>

                <div className="flex justify-end gap-2">
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
                    {editingEvent ? 'Update Event' : 'Create Event'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="creator-filter">Filter by Creator</Label>
              <Select value={filterCreator} onValueChange={setFilterCreator}>
                <SelectTrigger>
                  <SelectValue placeholder="All creators" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All creators</SelectItem>
                  {creators.map((creator: any) => (
                    <SelectItem key={creator.id} value={creator.id.toString()}>
                      {creator.displayName || creator.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Label htmlFor="type-filter">Filter by Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="custom">Custom Content</SelectItem>
                  <SelectItem value="trip">Content Trip</SelectItem>
                  <SelectItem value="live">Live Session</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Calendar Events ({filteredEvents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No events found. Create your first event to get started.
              </div>
            ) : (
              filteredEvents.map((event: any) => {
                const creator = creators.find((c: any) => c.id === event.creatorId);
                const typeStyle = eventTypeColors[event.type as keyof typeof eventTypeColors];
                
                return (
                  <div
                    key={event.id}
                    className={`p-4 border rounded-lg ${typeStyle.border} bg-white`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{event.title}</h3>
                          <Badge className={`${typeStyle.bg} text-white`}>
                            {eventTypeLabels[event.type as keyof typeof eventTypeLabels]}
                          </Badge>
                          {event.confirmed && (
                            <Badge variant="default">Confirmed</Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div><strong>Creator:</strong> {creator?.displayName || creator?.username}</div>
                          <div><strong>Date:</strong> {format(new Date(event.startDate), 'MMMM d, yyyy')}</div>
                          {event.location && <div><strong>Location:</strong> {event.location}</div>}
                          {event.description && <div><strong>Description:</strong> {event.description}</div>}
                          {event.notes && <div><strong>Notes:</strong> {event.notes}</div>}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!event.confirmed && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => confirmEventMutation.mutate(event.id)}
                            disabled={confirmEventMutation.isPending}
                          >
                            Confirm
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(event)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(event.id)}
                          disabled={deleteEventMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}