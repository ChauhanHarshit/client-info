import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, MapPin, Calendar, User, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started', icon: Clock, color: 'bg-gray-500' },
  { value: 'in_progress', label: 'In Progress', icon: AlertCircle, color: 'bg-yellow-500' },
  { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'bg-green-500' }
];

export default function RoadmapsInternal() {
  const [selectedRoadmap, setSelectedRoadmap] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isRoadmapDialogOpen, setIsRoadmapDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [roadmapFormData, setRoadmapFormData] = useState({
    title: '',
    description: ''
  });
  const [itemFormData, setItemFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    status: 'not_started',
    dueDate: '',
    milestoneTime: ''
  });

  // Fetch all internal roadmaps
  const { data: roadmaps = [], isLoading } = useQuery({
    queryKey: ['/api/roadmaps/internal'],
    queryFn: async () => {
      const response = await fetch('/api/roadmaps/internal', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch roadmaps');
      return response.json();
    },
  });

  // Fetch items for selected roadmap
  const { data: roadmapItems = [], refetch: refetchItems } = useQuery({
    queryKey: ['/api/roadmap-items', selectedRoadmap?.id],
    queryFn: async () => {
      if (!selectedRoadmap?.id) return [];
      const response = await fetch(`/api/roadmap-items/${selectedRoadmap.id}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch roadmap items');
      return response.json();
    },
    enabled: !!selectedRoadmap?.id,
  });

  // Save roadmap mutation
  const saveRoadmapMutation = useMutation({
    mutationFn: async (data: typeof roadmapFormData) => {
      return apiRequest('/api/roadmaps', {
        method: 'POST',
        body: JSON.stringify({ ...data, type: 'internal' }),
      });
    },
    onSuccess: () => {
      toast({ title: 'Success!', description: 'Roadmap created successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/roadmaps/internal'] });
      setIsRoadmapDialogOpen(false);
      setRoadmapFormData({ title: '', description: '' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create roadmap', variant: 'destructive' });
    },
  });

  // Save item mutation
  const saveItemMutation = useMutation({
    mutationFn: async (data: typeof itemFormData) => {
      return apiRequest('/api/roadmap-items', {
        method: 'POST',
        body: JSON.stringify({ 
          ...data, 
          roadmapId: selectedRoadmap.id,
          position: roadmapItems.length + 1
        }),
      });
    },
    onSuccess: () => {
      toast({ title: 'Success!', description: 'Item added successfully' });
      refetchItems();
      setIsItemDialogOpen(false);
      resetItemForm();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to add item', variant: 'destructive' });
    },
  });

  // Update item status mutation
  const updateItemStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest(`/api/roadmap-items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      toast({ title: 'Success!', description: 'Status updated successfully' });
      refetchItems();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    },
  });

  // Delete roadmap mutation
  const deleteRoadmapMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/roadmaps/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast({ title: 'Success!', description: 'Roadmap deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/roadmaps/internal'] });
      setSelectedRoadmap(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete roadmap', variant: 'destructive' });
    },
  });

  const resetItemForm = () => {
    setItemFormData({
      title: '',
      description: '',
      assignedTo: '',
      status: 'not_started',
      dueDate: '',
      milestoneTime: ''
    });
  };

  const handleItemClick = (item: any) => {
    setSelectedItem(item);
    setIsDetailDialogOpen(true);
  };

  const getStatusConfig = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  };

  // Generate winding road path
  const generateRoadPath = () => {
    const itemCount = roadmapItems.length || 1;
    const pathHeight = Math.max(400, itemCount * 120);
    const amplitude = 150;
    const frequency = 0.5;
    
    let path = `M 50,50`;
    for (let i = 0; i <= itemCount; i++) {
      const y = 50 + (i * (pathHeight - 100) / itemCount);
      const x = 200 + Math.sin(i * frequency) * amplitude;
      if (i === 0) {
        path += ` L ${x},${y}`;
      } else {
        const prevY = 50 + ((i - 1) * (pathHeight - 100) / itemCount);
        const prevX = 200 + Math.sin((i - 1) * frequency) * amplitude;
        const controlY = (prevY + y) / 2;
        path += ` Q ${prevX},${controlY} ${x},${y}`;
      }
    }
    return path;
  };

  // Calculate item positions along the road
  const getItemPosition = (index: number) => {
    const totalItems = roadmapItems.length;
    const pathHeight = Math.max(400, totalItems * 120);
    const amplitude = 150;
    const frequency = 0.5;
    
    const progress = (index + 1) / (totalItems + 1);
    const y = 50 + (progress * (pathHeight - 100));
    const x = 200 + Math.sin((index + 1) * frequency) * amplitude;
    
    return { x, y };
  };

  return (
    <div className="container max-w-full py-6">
      <PageHeader
        title="Internal Roadmaps"
        description="Manage internal roadmaps for employees, teams, and operations"
      />

      {/* Roadmap Selector */}
      <div className="mb-6 flex items-center gap-4">
        <Select
          value={selectedRoadmap?.id?.toString() || ''}
          onValueChange={(value) => {
            const roadmap = roadmaps.find((r: any) => r.id.toString() === value);
            setSelectedRoadmap(roadmap);
          }}
        >
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder="Select a roadmap" />
          </SelectTrigger>
          <SelectContent>
            {roadmaps.map((roadmap: any) => (
              <SelectItem key={roadmap.id} value={roadmap.id.toString()}>
                {roadmap.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button onClick={() => setIsRoadmapDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Roadmap
        </Button>
        
        {selectedRoadmap && (
          <>
            <Button onClick={() => setIsItemDialogOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" /> Add Item
            </Button>
            <Button 
              onClick={() => {
                if (confirm('Are you sure you want to delete this roadmap?')) {
                  deleteRoadmapMutation.mutate(selectedRoadmap.id);
                }
              }} 
              variant="destructive"
              size="sm"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Roadmap Display */}
      {selectedRoadmap ? (
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">{selectedRoadmap.title}</h2>
              {selectedRoadmap.description && (
                <p className="text-muted-foreground mt-2">{selectedRoadmap.description}</p>
              )}
            </div>

            {/* Winding Road Visualization */}
            <div className="relative w-full overflow-x-auto">
              <svg 
                width="400" 
                height={Math.max(500, roadmapItems.length * 120 + 100)}
                className="mx-auto"
              >
                {/* Road Path */}
                <path
                  d={generateRoadPath()}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="40"
                  strokeLinecap="round"
                />
                <path
                  d={generateRoadPath()}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="4"
                  strokeDasharray="10 10"
                  strokeLinecap="round"
                />

                {/* Plot Points */}
                {roadmapItems.map((item: any, index: number) => {
                  const pos = getItemPosition(index);
                  const statusConfig = getStatusConfig(item.status);
                  return (
                    <g key={item.id}>
                      {/* Connection line */}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="24"
                        fill="white"
                        stroke="#e5e7eb"
                        strokeWidth="3"
                      />
                      
                      {/* Status indicator */}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="18"
                        className={statusConfig.color}
                        fill="currentColor"
                        onClick={() => handleItemClick(item)}
                        style={{ cursor: 'pointer' }}
                      />
                      
                      {/* Icon */}
                      <MapPin
                        x={pos.x - 10}
                        y={pos.y - 10}
                        width="20"
                        height="20"
                        className="text-white pointer-events-none"
                      />
                      
                      {/* Label */}
                      <text
                        x={pos.x + 35}
                        y={pos.y + 5}
                        className="text-sm font-medium fill-current"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleItemClick(item)}
                      >
                        {item.title}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legend */}
            <div className="mt-6 flex gap-4 justify-center">
              {STATUS_OPTIONS.map((status) => (
                <div key={status.value} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${status.color}`} />
                  <span className="text-sm">{status.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {roadmaps.length === 0 
                ? 'No roadmaps created yet. Click "New Roadmap" to get started.'
                : 'Select a roadmap to view its timeline'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create Roadmap Dialog */}
      <Dialog open={isRoadmapDialogOpen} onOpenChange={setIsRoadmapDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Internal Roadmap</DialogTitle>
            <DialogDescription>
              Create a roadmap for internal processes, launches, or goals
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={roadmapFormData.title}
                onChange={(e) => setRoadmapFormData({ ...roadmapFormData, title: e.target.value })}
                placeholder="Q1 Product Launch"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={roadmapFormData.description}
                onChange={(e) => setRoadmapFormData({ ...roadmapFormData, description: e.target.value })}
                placeholder="Roadmap for Q1 product development and launch..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoadmapDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => saveRoadmapMutation.mutate(roadmapFormData)}
              disabled={!roadmapFormData.title || saveRoadmapMutation.isPending}
            >
              {saveRoadmapMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Roadmap Item</DialogTitle>
            <DialogDescription>
              Add a new milestone or task to the roadmap
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="itemTitle">Title *</Label>
              <Input
                id="itemTitle"
                value={itemFormData.title}
                onChange={(e) => setItemFormData({ ...itemFormData, title: e.target.value })}
                placeholder="Design Review"
              />
            </div>
            <div>
              <Label htmlFor="itemDescription">Description</Label>
              <Textarea
                id="itemDescription"
                value={itemFormData.description}
                onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                placeholder="Review and finalize product designs..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assignedTo">Assigned To</Label>
                <Input
                  id="assignedTo"
                  value={itemFormData.assignedTo}
                  onChange={(e) => setItemFormData({ ...itemFormData, assignedTo: e.target.value })}
                  placeholder="Team or employee name"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={itemFormData.status}
                  onValueChange={(value) => setItemFormData({ ...itemFormData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={itemFormData.dueDate}
                  onChange={(e) => setItemFormData({ ...itemFormData, dueDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="milestoneTime">Milestone Time</Label>
                <Input
                  id="milestoneTime"
                  value={itemFormData.milestoneTime}
                  onChange={(e) => setItemFormData({ ...itemFormData, milestoneTime: e.target.value })}
                  placeholder="Week 3"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => saveItemMutation.mutate(itemFormData)}
              disabled={!itemFormData.title || saveItemMutation.isPending}
            >
              {saveItemMutation.isPending ? 'Adding...' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedItem?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedItem?.description && (
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="mt-1">{selectedItem.description}</p>
              </div>
            )}
            
            {selectedItem?.assigned_to && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Assigned to: {selectedItem.assigned_to}</span>
              </div>
            )}
            
            {selectedItem?.due_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Due: {format(new Date(selectedItem.due_date), 'MMM d, yyyy')}</span>
              </div>
            )}
            
            {selectedItem?.milestone_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Milestone: {selectedItem.milestone_time}</span>
              </div>
            )}
            
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={selectedItem?.status}
                onValueChange={(value) => {
                  updateItemStatusMutation.mutate({ id: selectedItem.id, status: value });
                  setSelectedItem({ ...selectedItem, status: value });
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center gap-2">
                        <status.icon className="h-4 w-4" />
                        {status.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsDetailDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}