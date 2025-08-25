import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Plus, Edit, Trash2, Clock, MapPin, Users, GripVertical } from 'lucide-react';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface ContentTrip {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  location: string;
}

interface Creator {
  id: number;
  displayName: string;
  username: string;
}

interface ScheduleItem {
  id: number;
  tripId: number;
  date: string;
  title: string;
  startTime?: string;
  endTime?: string;
  timeFrame: string;
  notes: string;
  colorCategory: 'shoot' | 'meeting' | 'event' | 'free-time';
  assignedCreators: Creator[];
  isAllCreators: boolean;
  sortOrder: number;
}

interface TripScheduleCalendarProps {
  trip: ContentTrip;
  creators: Creator[];
}

const scheduleItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  notes: z.string().optional(),
  colorCategory: z.enum(['shoot', 'meeting', 'event', 'free-time']).default('shoot'),
  creatorIds: z.array(z.number()).default([]),
  isAllCreators: z.boolean().default(false),
  date: z.string().min(1, 'Date is required'),
});

type ScheduleItemForm = z.infer<typeof scheduleItemSchema>;

// Time options for standardized AM/PM format
const timeOptions = [
  '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM',
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
  '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'
];

const colorCategories = {
  shoot: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  meeting: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  event: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  'free-time': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
};

export function TripScheduleCalendar({ trip, creators }: TripScheduleCalendarProps) {
  const [selectedCreator, setSelectedCreator] = useState<number | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  
  const queryClient = useQueryClient();

  // Fetch schedule items
  const { data: scheduleItems = [], isLoading } = useQuery({
    queryKey: ['trip-schedule', trip.id, selectedCreator !== 'all' ? selectedCreator : undefined],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCreator !== 'all') {
        params.append('creatorId', selectedCreator.toString());
      }
      const response = await apiRequest('GET', `/api/content-trips/${trip.id}/schedule?${params}`);
      return response.json();
    },
  });

  // Generate date range for the trip with safe parsing
  const startDate = trip.startDate ? parseISO(trip.startDate) : new Date();
  const endDate = trip.endDate ? parseISO(trip.endDate) : new Date();
  const tripDays = Math.max(1, differenceInDays(endDate, startDate) + 1);
  const tripDateRange = Array.from({ length: tripDays }, (_, i) => 
    format(addDays(startDate, i), 'yyyy-MM-dd')
  );

  // Include any additional dates that have schedule items
  const scheduleItemDates = scheduleItems.map(item => 
    item.date ? format(parseISO(item.date), 'yyyy-MM-dd') : item.date
  ).filter(Boolean);
  
  // Combine trip dates with schedule item dates and sort
  const allDates = [...new Set([...tripDateRange, ...scheduleItemDates])];
  const dateRange = allDates.sort();

  // Group schedule items by date for display
  const groupedItems = scheduleItems.reduce((acc: Record<string, ScheduleItem[]>, item: ScheduleItem) => {
    // Convert ISO timestamp to simple date string to match dateRange format
    const dateKey = item.date ? format(parseISO(item.date), 'yyyy-MM-dd') : item.date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});

  // Sort items within each day by sortOrder (chronological)
  Object.keys(groupedItems).forEach(date => {
    groupedItems[date].sort((a, b) => a.sortOrder - b.sortOrder);
  });

  const form = useForm<ScheduleItemForm>({
    resolver: zodResolver(scheduleItemSchema),
    defaultValues: {
      title: '',
      startTime: '',
      endTime: '',
      notes: '',
      colorCategory: 'shoot',
      creatorIds: [],
      isAllCreators: false,
      date: selectedDate || dateRange[0],
    },
  });

  // Add schedule item mutation
  const addItemMutation = useMutation({
    mutationFn: async (data: ScheduleItemForm) => {
      const response = await apiRequest('POST', `/api/content-trips/${trip.id}/schedule`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-schedule', trip.id] });
      queryClient.invalidateQueries({ queryKey: ['trip-schedule', trip.id, undefined] });
      setIsAddModalOpen(false);
      form.reset();
    },
  });

  // Update schedule item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ScheduleItemForm> }) => {
      const response = await apiRequest('PUT', `/api/content-trips/schedule/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-schedule', trip.id] });
      queryClient.invalidateQueries({ queryKey: ['trip-schedule', trip.id, undefined] });
      setEditingItem(null);
    },
  });

  // Delete schedule item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/content-trips/schedule/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-schedule', trip.id] });
      queryClient.invalidateQueries({ queryKey: ['trip-schedule', trip.id, undefined] });
    },
  });

  // Reorder items mutation
  const reorderMutation = useMutation({
    mutationFn: async ({ creatorId, date, itemOrders }: { 
      creatorId: number; 
      date: string; 
      itemOrders: { id: number; sortOrder: number }[] 
    }) => {
      const response = await apiRequest('POST', `/api/content-trips/${trip.id}/schedule/reorder`, { creatorId, date, itemOrders });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-schedule', trip.id] });
      queryClient.invalidateQueries({ queryKey: ['trip-schedule', trip.id, undefined] });
    },
  });

  const handleAddItem = (data: ScheduleItemForm) => {
    // Create standardized time frame from start and end times
    const timeFrame = data.startTime && data.endTime ? `${data.startTime} - ${data.endTime}` : '';
    
    const submissionData = {
      ...data,
      timeFrame,
      tripId: trip.id,
    };
    
    addItemMutation.mutate(submissionData);
  };

  const handleEditItem = (item: ScheduleItem) => {
    setEditingItem(item);
    
    // Parse time frame back to start/end times for editing
    let startTime = '';
    let endTime = '';
    if (item.timeFrame && item.timeFrame.includes(' - ')) {
      const [start, end] = item.timeFrame.split(' - ');
      startTime = start.trim();
      endTime = end.trim();
    }
    
    form.reset({
      title: item.title,
      startTime: startTime,
      endTime: endTime,
      notes: item.notes || '',
      colorCategory: item.colorCategory,
      creatorIds: item.assignedCreators.map(c => c.id),
      isAllCreators: item.isAllCreators,
      date: item.date,
    });
    setIsAddModalOpen(true);
  };

  const handleUpdateItem = (data: ScheduleItemForm) => {
    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, data });
    }
  };

  const handleDeleteItem = (id: number) => {
    if (confirm('Are you sure you want to delete this schedule item?')) {
      deleteItemMutation.mutate(id);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const [sourceDate, sourceCreatorId] = source.droppableId.split('-');
    const [destDate, destCreatorId] = destination.droppableId.split('-');

    if (sourceDate !== destDate || sourceCreatorId !== destCreatorId) return;

    const items = [...groupedItems[sourceDate][parseInt(sourceCreatorId)]];
    const [reorderedItem] = items.splice(source.index, 1);
    items.splice(destination.index, 0, reorderedItem);

    const itemOrders = items.map((item, index) => ({
      id: item.id,
      sortOrder: index,
    }));

    reorderMutation.mutate({
      creatorId: parseInt(sourceCreatorId),
      date: sourceDate,
      itemOrders,
    });
  };

  const openAddModal = (date: string, creatorId?: number) => {
    setSelectedDate(date);
    setEditingItem(null);
    form.reset({
      title: '',
      startTime: '',
      endTime: '',
      notes: '',
      colorCategory: 'shoot',
      creatorIds: creatorId ? [creatorId] : [],
      isAllCreators: false,
      date: date,
    });
    setIsAddModalOpen(true);
  };

  const filteredCreators = selectedCreator === 'all' ? creators : creators.filter(c => c.id === selectedCreator);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            {trip.title} Schedule
          </h2>
          <p className="text-gray-600 mt-1">
            {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')} • {trip.location}
          </p>
        </div>

        <div className="flex gap-3">
          <Select value={selectedCreator.toString()} onValueChange={(value) => 
            setSelectedCreator(value === 'all' ? 'all' : parseInt(value))
          }>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by creator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Creators</SelectItem>
              {creators.map((creator) => (
                <SelectItem key={creator.id} value={creator.id.toString()}>
                  {creator.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={() => openAddModal(dateRange[0])}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid gap-4">
          {dateRange.map((date) => (
            <Card key={date} className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{format(date ? parseISO(date) : new Date(), 'EEEE, MMM d')}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAddModal(date)}
                    className="h-8"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Display schedule items for this date */}
                <Droppable droppableId={`${date}`}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3 min-h-[60px]"
                    >
                      {groupedItems[date]?.length > 0 ? (
                        groupedItems[date].map((item, index) => (
                          <Draggable
                            key={item.id}
                            draggableId={item.id.toString()}
                            index={index}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`p-3 rounded-lg border ${colorCategories[item.colorCategory]?.bg || colorCategories.shoot.bg} ${colorCategories[item.colorCategory]?.border || colorCategories.shoot.border} group`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div
                                        {...provided.dragHandleProps}
                                        className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <GripVertical className="h-4 w-4 text-gray-400" />
                                      </div>
                                      <h4 className="font-medium">{item.title}</h4>
                                      <Badge variant="secondary" className={`${colorCategories[item.colorCategory]?.text || colorCategories.shoot.text} text-xs`}>
                                        {(item.colorCategory || 'shoot').replace('-', ' ')}
                                      </Badge>
                                    </div>
                                    
                                    {/* Display time - prefer individual start/end times, fallback to timeFrame */}
                                    {(item.startTime && item.endTime) ? (
                                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                                        <Clock className="h-3 w-3" />
                                        <span className="font-medium">{item.startTime} – {item.endTime}</span>
                                      </div>
                                    ) : item.timeFrame ? (
                                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                                        <Clock className="h-3 w-3" />
                                        <span className="font-medium">{item.timeFrame}</span>
                                      </div>
                                    ) : null}
                                    
                                    {item.notes && (
                                      <p className="text-sm text-gray-700">{item.notes}</p>
                                    )}
                                  </div>

                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditItem(item)}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))
                      ) : (
                        <div className="text-center py-4 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                          No activities scheduled for this date
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          ))}
        </div>
      </DragDropContext>

      {/* Add/Edit Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Schedule Item' : 'Add Schedule Item'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(editingItem ? handleUpdateItem : handleAddItem)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Bikini Shoot – Poolside" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Time Selection */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select start time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select end time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="colorCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="shoot">Shoot</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="free-time">Free Time</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Multi-Creator Assignment */}
              <FormField
                control={form.control}
                name="isAllCreators"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="w-4 h-4 mt-1"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Assign to All Creators
                      </FormLabel>
                      <p className="text-sm text-gray-600">
                        Check this for joint shoots or group activities
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select date" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dateRange.map((date) => (
                          <SelectItem key={date} value={date}>
                            {format(date ? parseISO(date) : new Date(), 'EEEE, MMM d')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Bring red outfit, makeup done by 9:30"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addItemMutation.isPending || updateItemMutation.isPending}
                  className="flex-1"
                >
                  {editingItem ? 'Update' : 'Add'} Item
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}