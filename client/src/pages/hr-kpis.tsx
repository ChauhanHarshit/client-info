import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Edit, Trash2, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function HRKPIs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Placeholder KPIs data structure
  const [kpis, setKPIs] = useState<Array<{
    id: number;
    title: string;
    team: string;
    target: string;
    current: string;
    description: string;
    lastUpdated: string;
  }>>([]);

  return (
    <div className="container max-w-full py-6">
      <PageHeader
        title="Key Performance Indicators"
        description="Search, view, edit, and add KPIs for all teams and employees"
      />

      {/* Search and Filter Controls */}
      <div className="mt-6 flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search KPIs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            <SelectItem value="hr">HR</SelectItem>
            <SelectItem value="sales">Sales</SelectItem>
            <SelectItem value="marketing">Marketing</SelectItem>
            <SelectItem value="operations">Operations</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add KPI
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New KPI</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="kpi-title">Title</Label>
                <Input id="kpi-title" placeholder="Enter KPI title" />
              </div>
              <div>
                <Label htmlFor="kpi-team">Team</Label>
                <Select>
                  <SelectTrigger id="kpi-team">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="kpi-target">Target</Label>
                <Input id="kpi-target" placeholder="Enter target value" />
              </div>
              <div>
                <Label htmlFor="kpi-description">Description</Label>
                <Textarea 
                  id="kpi-description" 
                  placeholder="Enter KPI description"
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>
                  Save KPI
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs Grid */}
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {kpis.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <p>No KPIs found. Click "Add KPI" to create your first one.</p>
          </div>
        ) : (
          kpis.map((kpi) => (
            <Card key={kpi.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    {kpi.title}
                  </span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Team: {kpi.team}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Target:</span>
                    <span className="text-sm">{kpi.target}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Current:</span>
                    <span className="text-sm">{kpi.current || 'Not set'}</span>
                  </div>
                  <p className="text-sm">{kpi.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Last updated: {kpi.lastUpdated}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}