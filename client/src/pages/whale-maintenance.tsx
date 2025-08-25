import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { LoadingAnimation } from "@/components/ui/loading-animation";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, Download, Eye, EyeOff, Edit, Trash2, Filter, Users, Copy, ChevronDown, Check, ChevronsUpDown, ArrowLeft } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CreatorAvatar } from '@/components/ui/creator-avatar';

interface WhaleSpender {
  id: number;
  creatorId: number;
  rank: number;
  username: string;
  totalSpend: string;
  profileLink?: string;
  source: string;
  notes?: string;
  weekStartDate?: Date;
  monthYear?: string;
  isHidden: boolean;
  lastUpdated: Date;
  createdAt: Date;
  creatorName?: string;
}

interface Creator {
  id: number;
  username: string;
  displayName: string;
}

export default function WhaleMaintenancePage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingWhale, setEditingWhale] = useState<WhaleSpender | null>(null);
  const [filterCreator, setFilterCreator] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("weekly");
  const [showHidden, setShowHidden] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [bulkSelectedCreator, setBulkSelectedCreator] = useState("none");
  const [creatorSearchOpen, setCreatorSearchOpen] = useState(false);
  const [bulkWhales, setBulkWhales] = useState<Array<Partial<WhaleSpender>>>(() => 
    Array.from({ length: 15 }, (_, index) => ({
      rank: index + 1,
      username: '',
      totalSpend: '0.00',
      profileLink: '',
      notes: '',
      source: 'onlyfans',
      isHidden: false,
    }))
  );

  // Form state
  const [formData, setFormData] = useState({
    creatorId: "",
    rank: "",
    username: "",
    totalSpend: "",
    profileLink: "",
    source: "onlyfans",
    notes: "",
    weekStartDate: "",
    monthYear: "",
    isHidden: false,
  });

  // Data fetching
  const { data: whales, isLoading: whalesLoading, refetch: refetchWhales } = useQuery({
    queryKey: ['/api/whale-spenders'],
  });

  const { data: creators, isLoading: creatorsLoading } = useQuery({
    queryKey: ['/api/creators'],
  });

  // Mutations
  const createWhaleMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/whale-spenders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whale-spenders'] });
      toast({ title: "Whale spender added successfully" });
      setIsCreateDialogOpen(false);
      resetForm();
    },
  });

  const updateWhaleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest(`/api/whale-spenders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whale-spenders'] });
      toast({ title: "Whale spender updated successfully" });
      setEditingWhale(null);
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/whale-spenders/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whale-spenders'] });
      toast({ title: "Whale spenders added successfully" });
      setIsBulkAddOpen(false);
      resetBulkForm();
    },
  });

  const deleteWhaleMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/whale-spenders/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whale-spenders'] });
      toast({ title: "Whale spender deleted successfully" });
    },
  });

  const toggleHiddenMutation = useMutation({
    mutationFn: ({ id, isHidden }: { id: number; isHidden: boolean }) => apiRequest(`/api/whale-spenders/${id}/toggle-hidden`, {
      method: 'PATCH',
      body: JSON.stringify({ isHidden }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whale-spenders'] });
      toast({ title: "Visibility updated successfully" });
    },
  });

  const resetForm = () => {
    setFormData({
      creatorId: "",
      rank: "",
      username: "",
      totalSpend: "",
      profileLink: "",
      source: "onlyfans",
      notes: "",
      weekStartDate: "",
      monthYear: "",
      isHidden: false,
    });
  };

  const resetBulkForm = () => {
    setBulkSelectedCreator("none");
    setBulkWhales(Array.from({ length: 15 }, (_, index) => ({
      rank: index + 1,
      username: '',
      totalSpend: '0.00',
      profileLink: '',
      notes: '',
      source: 'onlyfans',
      isHidden: false,
    })));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.creatorId || !formData.username || !formData.totalSpend) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const submitData = {
      ...formData,
      creatorId: parseInt(formData.creatorId),
      rank: parseInt(formData.rank) || 1,
      totalSpend: parseFloat(formData.totalSpend) || 0,
      weekStartDate: filterPeriod === 'weekly' ? formData.weekStartDate : undefined,
      monthYear: filterPeriod === 'monthly' ? formData.monthYear : undefined,
    };

    createWhaleMutation.mutate(submitData);
  };

  const handleEdit = (whale: WhaleSpender) => {
    setEditingWhale(whale);
    setFormData({
      creatorId: whale.creatorId.toString(),
      rank: whale.rank.toString(),
      username: whale.username,
      totalSpend: whale.totalSpend,
      profileLink: whale.profileLink || "",
      source: whale.source,
      notes: whale.notes || "",
      weekStartDate: whale.weekStartDate ? new Date(whale.weekStartDate).toISOString().split('T')[0] : "",
      monthYear: whale.monthYear || "",
      isHidden: whale.isHidden,
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWhale) return;

    const updateData = {
      ...formData,
      creatorId: parseInt(formData.creatorId),
      rank: parseInt(formData.rank) || 1,
      totalSpend: parseFloat(formData.totalSpend) || 0,
      weekStartDate: filterPeriod === 'weekly' ? formData.weekStartDate : undefined,
      monthYear: filterPeriod === 'monthly' ? formData.monthYear : undefined,
    };

    updateWhaleMutation.mutate({ id: editingWhale.id, data: updateData });
  };

  const handleBulkSubmit = () => {
    if (bulkSelectedCreator === "none") {
      toast({ title: "Please select a creator", variant: "destructive" });
      return;
    }

    const validWhales = bulkWhales.filter(whale => whale.username && whale.username.trim() !== '');
    
    if (validWhales.length === 0) {
      toast({ title: "Please add at least one whale spender", variant: "destructive" });
      return;
    }

    const submitData = {
      creatorId: parseInt(bulkSelectedCreator),
      whales: validWhales.map(whale => ({
        ...whale,
        creatorId: parseInt(bulkSelectedCreator),
        totalSpend: parseFloat(whale.totalSpend || '0') || 0,
        weekStartDate: filterPeriod === 'weekly' ? new Date().toISOString().split('T')[0] : undefined,
        monthYear: filterPeriod === 'monthly' ? new Date().toISOString().substring(0, 7) : undefined,
      })),
    };

    bulkCreateMutation.mutate(submitData);
  };

  const updateBulkWhale = (index: number, field: keyof Partial<WhaleSpender>, value: any) => {
    setBulkWhales(prev => prev.map((whale, i) => 
      i === index ? { ...whale, [field]: value } : whale
    ));
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const lines = text.split('\n').filter(line => line.trim());
      
      const newWhales = lines.slice(0, 15).map((line, index) => {
        const parts = line.split('\t');
        return {
          rank: index + 1,
          username: parts[0] || '',
          totalSpend: parts[1] || '0.00',
          profileLink: parts[2] || '',
          notes: parts[3] || '',
          source: 'onlyfans',
          isHidden: false,
        };
      });

      // Fill remaining slots
      while (newWhales.length < 15) {
        newWhales.push({
          rank: newWhales.length + 1,
          username: '',
          totalSpend: '0.00',
          profileLink: '',
          notes: '',
          source: 'onlyfans',
          isHidden: false,
        });
      }

      setBulkWhales(newWhales);
      toast({ title: "Data pasted from clipboard" });
    } catch (error) {
      toast({ title: "Failed to read clipboard", variant: "destructive" });
    }
  };

  const duplicateLastWeek = async () => {
    if (bulkSelectedCreator === "none") {
      toast({ title: "Please select a creator first", variant: "destructive" });
      return;
    }

    try {
      const response = await apiRequest(`/api/whale-spenders/latest/${bulkSelectedCreator}?period=${filterPeriod}`);
      const latestWhales = await response.json();
      
      if (latestWhales && latestWhales.length > 0) {
        const duplicatedWhales = Array.from({ length: 15 }, (_, index) => {
          const existingWhale = latestWhales[index];
          return existingWhale ? {
            rank: index + 1,
            username: existingWhale.username,
            totalSpend: existingWhale.totalSpend,
            profileLink: existingWhale.profileLink || '',
            notes: existingWhale.notes || '',
            source: existingWhale.source,
            isHidden: false,
          } : {
            rank: index + 1,
            username: '',
            totalSpend: '0.00',
            profileLink: '',
            notes: '',
            source: 'onlyfans',
            isHidden: false,
          };
        });
        
        setBulkWhales(duplicatedWhales);
        toast({ title: "Last week's data duplicated" });
      } else {
        toast({ title: "No previous data found for this creator", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Failed to duplicate last week's data", variant: "destructive" });
    }
  };

  const filteredWhales = Array.isArray(whales) ? whales.filter((whale: WhaleSpender) => {
    if (filterCreator !== "all" && whale.creatorId.toString() !== filterCreator) return false;
    if (!showHidden && whale.isHidden) return false;
    return true;
  }) : [];

  // Group whales by creator for summary cards
  const whalesByCreator = filteredWhales.reduce((acc: Record<string, WhaleSpender[]>, whale: WhaleSpender) => {
    const creatorId = whale.creatorId.toString();
    if (!acc[creatorId]) acc[creatorId] = [];
    acc[creatorId].push(whale);
    return acc;
  }, {});

  if (whalesLoading || creatorsLoading) {
    return <LoadingAnimation />;
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
            <h1 className="text-3xl font-bold text-gray-900">Whales</h1>
            <p className="text-gray-600">Track and manage top spenders for each creator</p>
          </div>
        </div>
        
        <div className="flex gap-3 items-center">
          <Dialog open={isBulkAddOpen} onOpenChange={setIsBulkAddOpen}>
            <DialogTrigger asChild>
              <Button className="px-6 py-2.5">
                <Plus className="h-4 w-4 mr-2" />
                Bulk Add (All 15)
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Bulk Add Whale Spenders (All 15 at Once)</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label>Select Creator</Label>
                    <Popover open={creatorSearchOpen} onOpenChange={setCreatorSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={creatorSearchOpen}
                          className="w-full justify-between"
                        >
                          {bulkSelectedCreator !== "none" && Array.isArray(creators)
                            ? creators.find((creator: Creator) => creator.id.toString() === bulkSelectedCreator)?.displayName || "Select creator..."
                            : "Search and select creator..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Type to search creators..." />
                          <CommandEmpty>No creator found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="none"
                              onSelect={() => {
                                setBulkSelectedCreator("none");
                                setCreatorSearchOpen(false);
                              }}
                            >
                              <Check
                                className={bulkSelectedCreator === "none" ? "mr-2 h-4 w-4 opacity-100" : "mr-2 h-4 w-4 opacity-0"}
                              />
                              Choose Creator
                            </CommandItem>
                            {Array.isArray(creators) && creators.map((creator: Creator) => (
                              <CommandItem
                                key={creator.id}
                                value={creator.displayName || creator.username}
                                onSelect={() => {
                                  setBulkSelectedCreator(creator.id.toString());
                                  setCreatorSearchOpen(false);
                                }}
                                className="flex items-center"
                              >
                                <Check
                                  className={bulkSelectedCreator === creator.id.toString() ? "mr-2 h-4 w-4 opacity-100" : "mr-2 h-4 w-4 opacity-0"}
                                />
                                <CreatorAvatar
                                  creator={{
                                    id: creator.id,
                                    username: creator.username,
                                    displayName: creator.displayName,
                                    profileImageUrl: (creator as any).profileImageUrl || null
                                  }}
                                  size="sm"
                                  className="mr-2"
                                />
                                <div>
                                  <div>{creator.displayName}</div>
                                  <div className="text-xs text-muted-foreground">@{creator.username}</div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={pasteFromClipboard}
                    size="sm"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Paste from Excel
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={duplicateLastWeek}
                    size="sm"
                  >
                    Duplicate Last Week
                  </Button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Rank</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead className="w-32">Total Spend</TableHead>
                        <TableHead>Profile Link</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="w-20">Hidden</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkWhales.map((whale, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{whale.rank}</TableCell>
                          <TableCell>
                            <Input
                              value={whale.username || ''}
                              onChange={(e) => updateBulkWhale(index, 'username', e.target.value)}
                              placeholder="Enter username"
                              className="min-w-[150px]"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={whale.totalSpend || '0.00'}
                              onChange={(e) => updateBulkWhale(index, 'totalSpend', e.target.value)}
                              placeholder="0.00"
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={whale.profileLink || ''}
                              onChange={(e) => updateBulkWhale(index, 'profileLink', e.target.value)}
                              placeholder="Profile URL"
                              className="min-w-[200px]"
                            />
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={whale.source || 'onlyfans'} 
                              onValueChange={(value) => updateBulkWhale(index, 'source', value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="onlyfans">OnlyFans</SelectItem>
                                <SelectItem value="fansly">Fansly</SelectItem>
                                <SelectItem value="chaturbate">Chaturbate</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={whale.notes || ''}
                              onChange={(e) => updateBulkWhale(index, 'notes', e.target.value)}
                              placeholder="Notes"
                              className="min-w-[150px]"
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={whale.isHidden || false}
                              onChange={(e) => updateBulkWhale(index, 'isHidden', e.target.checked)}
                              className="rounded border-gray-300"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsBulkAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleBulkSubmit}
                    disabled={bulkCreateMutation.isPending}
                  >
                    Add All Whale Spenders
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="px-6 py-2.5">
                <Plus className="h-4 w-4 mr-2" />
                Add Single
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Whale Spender</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="creatorId">Creator *</Label>
                    <Select value={formData.creatorId} onValueChange={(value) => setFormData(prev => ({ ...prev, creatorId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select creator" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Choose Creator</SelectItem>
                        {Array.isArray(creators) && creators.map((creator: Creator) => (
                          <SelectItem key={creator.id} value={creator.id.toString()}>
                            {creator.displayName || creator.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="rank">Rank</Label>
                    <Input
                      id="rank"
                      type="number"
                      value={formData.rank}
                      onChange={(e) => setFormData(prev => ({ ...prev, rank: e.target.value }))}
                      placeholder="1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Enter username"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="totalSpend">Total Spend *</Label>
                  <Input
                    id="totalSpend"
                    type="number"
                    step="0.01"
                    value={formData.totalSpend}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalSpend: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="profileLink">Profile Link</Label>
                  <Input
                    id="profileLink"
                    value={formData.profileLink}
                    onChange={(e) => setFormData(prev => ({ ...prev, profileLink: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <Label htmlFor="source">Source</Label>
                  <Select value={formData.source} onValueChange={(value) => setFormData(prev => ({ ...prev, source: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="onlyfans">OnlyFans</SelectItem>
                      <SelectItem value="fansly">Fansly</SelectItem>
                      <SelectItem value="chaturbate">Chaturbate</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {filterPeriod === 'weekly' && (
                  <div>
                    <Label htmlFor="weekStartDate">Week Start Date</Label>
                    <Input
                      id="weekStartDate"
                      type="date"
                      value={formData.weekStartDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, weekStartDate: e.target.value }))}
                    />
                  </div>
                )}

                {filterPeriod === 'monthly' && (
                  <div>
                    <Label htmlFor="monthYear">Month/Year</Label>
                    <Input
                      id="monthYear"
                      type="month"
                      value={formData.monthYear}
                      onChange={(e) => setFormData(prev => ({ ...prev, monthYear: e.target.value }))}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    id="isHidden"
                    type="checkbox"
                    checked={formData.isHidden}
                    onChange={(e) => setFormData(prev => ({ ...prev, isHidden: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="isHidden">Hidden from public view</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createWhaleMutation.isPending}>
                    Add Whale Spender
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Filter by Creator</Label>
              <Select value={filterCreator} onValueChange={setFilterCreator}>
                <SelectTrigger>
                  <SelectValue placeholder="All creators" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Creators</SelectItem>
                  {Array.isArray(creators) && creators.map((creator: Creator) => (
                    <SelectItem key={creator.id} value={creator.id.toString()}>
                      {creator.displayName || creator.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Label>Period Type</Label>
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button
              variant="outline"
              onClick={() => setShowHidden(!showHidden)}
              className="flex items-center gap-2"
            >
              {showHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {showHidden ? "Hide Hidden" : "Show Hidden"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Creator Summary Cards */}
      {filterCreator !== "all" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {Array.isArray(creators) && creators.find((c: Creator) => c.id.toString() === filterCreator)?.displayName} Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {whales.filter((w: WhaleSpender) => w.creatorId.toString() === filterCreator).length}
                </div>
                <div className="text-sm text-muted-foreground">whale spenders tracked</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ${(() => {
                    const creatorWhales = whales.filter((w: WhaleSpender) => w.creatorId.toString() === filterCreator);
                    return creatorWhales.reduce((sum: number, w: WhaleSpender) => sum + parseFloat(w.totalSpend), 0).toLocaleString();
                  })()}
                </div>
                <div className="text-sm text-muted-foreground">total revenue tracked</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {(() => {
                    const creatorWhales = whales.filter((w: WhaleSpender) => w.creatorId.toString() === filterCreator);
                    const recentUpdates = creatorWhales.filter((w: WhaleSpender) => {
                      const daysSince = Math.floor((Date.now() - new Date(w.lastUpdated).getTime()) / (1000 * 60 * 60 * 24));
                      return daysSince <= 7;
                    });
                    return recentUpdates.length;
                  })()}
                </div>
                <div className="text-sm text-muted-foreground">updated this week</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Whale Spenders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Total Spend</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWhales.map((whale: WhaleSpender) => (
                  <TableRow key={whale.id}>
                    <TableCell>
                      {Array.isArray(creators) && creators.find((c: Creator) => c.id === whale.creatorId)?.displayName || whale.creatorName || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">#{whale.rank}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{whale.username}</TableCell>
                    <TableCell>${whale.totalSpend}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{whale.source}</Badge>
                    </TableCell>
                    <TableCell>
                      {whale.weekStartDate && new Date(whale.weekStartDate).toLocaleDateString()}
                      {whale.monthYear && whale.monthYear}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(whale.lastUpdated).toLocaleDateString()} at {new Date(whale.lastUpdated).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      {whale.isHidden ? (
                        <Badge variant="destructive">Hidden</Badge>
                      ) : (
                        <Badge variant="default">Visible</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleEdit(whale)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleHiddenMutation.mutate({ id: whale.id, isHidden: !whale.isHidden })}>
                            {whale.isHidden ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                            {whale.isHidden ? 'Show' : 'Hide'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteWhaleMutation.mutate(whale.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredWhales.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No whale spenders found. Add some data to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingWhale && (
        <Dialog open={!!editingWhale} onOpenChange={() => setEditingWhale(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Whale Spender</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-creatorId">Creator *</Label>
                  <Select value={formData.creatorId} onValueChange={(value) => setFormData(prev => ({ ...prev, creatorId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select creator" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Choose Creator</SelectItem>
                      {Array.isArray(creators) && creators.map((creator: Creator) => (
                        <SelectItem key={creator.id} value={creator.id.toString()}>
                          {creator.displayName || creator.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="edit-rank">Rank</Label>
                  <Input
                    id="edit-rank"
                    type="number"
                    value={formData.rank}
                    onChange={(e) => setFormData(prev => ({ ...prev, rank: e.target.value }))}
                    placeholder="1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-username">Username *</Label>
                <Input
                  id="edit-username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter username"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-totalSpend">Total Spend *</Label>
                <Input
                  id="edit-totalSpend"
                  type="number"
                  step="0.01"
                  value={formData.totalSpend}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalSpend: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-profileLink">Profile Link</Label>
                <Input
                  id="edit-profileLink"
                  value={formData.profileLink}
                  onChange={(e) => setFormData(prev => ({ ...prev, profileLink: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label htmlFor="edit-source">Source</Label>
                <Select value={formData.source} onValueChange={(value) => setFormData(prev => ({ ...prev, source: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onlyfans">OnlyFans</SelectItem>
                    <SelectItem value="fansly">Fansly</SelectItem>
                    <SelectItem value="chaturbate">Chaturbate</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="edit-isHidden"
                  type="checkbox"
                  checked={formData.isHidden}
                  onChange={(e) => setFormData(prev => ({ ...prev, isHidden: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="edit-isHidden">Hidden from public view</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingWhale(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateWhaleMutation.isPending}>
                  Update Whale Spender
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}