import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function HRSOPs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Placeholder SOPs data structure
  const [sops, setSOPs] = useState<Array<{
    id: number;
    title: string;
    team: string;
    description: string;
    lastUpdated: string;
  }>>([]);

  return (
    <div className="container max-w-full py-6">
      <PageHeader
        title="Standard Operating Procedures"
        description="Search, view, edit, and add SOPs for all teams and employees"
      />

      {/* Search and Filter Controls */}
      <div className="mt-6 flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search SOPs..."
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
              Add SOP
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New SOP</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="sop-title">Title</Label>
                <Input id="sop-title" placeholder="Enter SOP title" />
              </div>
              <div>
                <Label htmlFor="sop-team">Team</Label>
                <Select>
                  <SelectTrigger id="sop-team">
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
                <Label htmlFor="sop-description">Description</Label>
                <Textarea 
                  id="sop-description" 
                  placeholder="Enter SOP description"
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>
                  Save SOP
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* SOPs Grid */}
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sops.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <p>No SOPs found. Click "Add SOP" to create your first one.</p>
          </div>
        ) : (
          sops.map((sop) => (
            <Card key={sop.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span className="text-lg">{sop.title}</span>
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
                  <p className="text-sm text-muted-foreground">Team: {sop.team}</p>
                  <p className="text-sm">{sop.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Last updated: {sop.lastUpdated}
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