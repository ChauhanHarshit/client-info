import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  FileText, 
  Image, 
  Video, 
  Calendar, 
  User, 
  ArrowLeft,
  Eye,
  Download,
  Filter,
  Grid,
  List
} from "lucide-react";

interface ContentItem {
  id: number;
  title: string;
  type: 'image' | 'video' | 'document' | 'text';
  creator: string;
  createdAt: string;
  size?: string;
  url?: string;
  description?: string;
  tags?: string[];
}

export default function ContentViewer() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCreator, setSelectedCreator] = useState<string>('all');

  // Mock data - in real app, this would come from API
  const mockContent: ContentItem[] = [
    {
      id: 1,
      title: "Cherry Blossoms Banner",
      type: "image",
      creator: "Sarah Chen",
      createdAt: "2025-06-10T12:00:00Z",
      size: "2.4 MB",
      url: "https://ik.imagekit.io/tasty/app-assets/cherry-blossoms.svg?tr=f-auto",
      description: "Aesthetic banner for spring content",
      tags: ["banner", "spring", "aesthetic"]
    },
    {
      id: 2,
      title: "Money Symbol",
      type: "image", 
      creator: "Alex Storm",
      createdAt: "2025-06-09T15:30:00Z",
      size: "1.8 MB",
      url: "https://ik.imagekit.io/tasty/app-assets/money.svg?tr=f-auto",
      description: "Money-themed graphic for financial content",
      tags: ["money", "finance", "symbol"]
    },
    {
      id: 3,
      title: "Creator Onboarding Video",
      type: "video",
      creator: "Maya Rivera", 
      createdAt: "2025-06-08T10:15:00Z",
      size: "45.2 MB",
      description: "Training video for new creators",
      tags: ["training", "onboarding", "video"]
    },
    {
      id: 4,
      title: "Content Guidelines Document",
      type: "document",
      creator: "Jordan Kim",
      createdAt: "2025-06-07T14:20:00Z", 
      size: "856 KB",
      description: "Official content creation guidelines",
      tags: ["guidelines", "rules", "documentation"]
    }
  ];

  const { data: creators = [] } = useQuery({
    queryKey: ['/api/creators'],
  });

  const filteredContent = mockContent.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesCreator = selectedCreator === 'all' || item.creator === selectedCreator;
    
    return matchesSearch && matchesType && matchesCreator;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'image': return 'bg-green-100 text-green-800';
      case 'video': return 'bg-blue-100 text-blue-800';
      case 'document': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen p-6">
      {/* Back Button */}
      <div className="mb-8">
        <Button
          variant="outline"
          size="default"
          onClick={() => window.history.back()}
          className="flex items-center space-x-2 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 font-medium shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </Button>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-6 h-6" />
          <h1 className="text-3xl font-bold">Content Viewer</h1>
        </div>
        <p className="text-muted-foreground">
          Browse and manage all content across the platform
        </p>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
          <CardDescription>
            Find specific content using filters and search
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search Content</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by title, description, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Content Type Filter */}
            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="document">Documents</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Creator Filter */}
            <div className="space-y-2">
              <Label>Creator</Label>
              <Select value={selectedCreator} onValueChange={setSelectedCreator}>
                <SelectTrigger>
                  <SelectValue placeholder="All creators" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Creators</SelectItem>
                  {Array.from(new Set(mockContent.map(item => item.creator))).map(creator => (
                    <SelectItem key={creator} value={creator}>{creator}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View Mode */}
            <div className="space-y-2">
              <Label>View Mode</Label>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="flex-1"
                >
                  <Grid className="w-4 h-4 mr-2" />
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="flex-1"
                >
                  <List className="w-4 h-4 mr-2" />
                  List
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Content Library</CardTitle>
              <CardDescription>
                {filteredContent.length} items found
              </CardDescription>
            </div>
            <Badge variant="outline">
              {filteredContent.length} results
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {filteredContent.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No content found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms or filters
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContent.map((item) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(item.type)}
                        <h3 className="font-semibold truncate">{item.title}</h3>
                      </div>
                      <Badge variant="secondary" className={getTypeColor(item.type)}>
                        {item.type}
                      </Badge>
                    </div>
                    
                    {item.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3" />
                        <span>{item.creator}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                      {item.size && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3" />
                          <span>{item.size}</span>
                        </div>
                      )}
                    </div>

                    {item.tags && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {item.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContent.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(item.type)}
                      <Badge variant="secondary" className={getTypeColor(item.type)}>
                        {item.type}
                      </Badge>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{item.title}</h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{item.creator}</span>
                      <span>{formatDate(item.createdAt)}</span>
                      {item.size && <span>{item.size}</span>}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}