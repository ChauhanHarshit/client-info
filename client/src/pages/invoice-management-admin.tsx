import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { 
  FileText, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Upload, 
  Download, 
  RefreshCw, 
  Plus,
  Edit,
  Trash2,
  Eye,
  Filter
} from "lucide-react";
import { LoadingAnimation } from "@/components/ui/loading-animation";

// Form schemas
const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  clientId: z.number().min(1, "Client is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  weekStartDate: z.string().optional(),
  weekEndDate: z.string().optional(),
  amount: z.string().min(1, "Amount is required"),
  currency: z.string().default("USD"),
  status: z.string().default("unpaid"),
  dueDate: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  createdBy: z.string().min(1, "Created by is required"),
});

const statusUpdateSchema = z.object({
  status: z.string().min(1, "Status is required"),
  reason: z.string().optional(),
});

type InvoiceForm = z.infer<typeof invoiceSchema>;
type StatusUpdateForm = z.infer<typeof statusUpdateSchema>;

export default function InvoiceManagementAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("invoices");
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterClient, setFilterClient] = useState<string>("");

  // Data queries
  const { data: invoices = [], isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ['/api/invoices', { status: filterStatus === "all" ? "" : filterStatus, clientId: filterClient }],
  });

  const { data: creators = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ['/api/creators'],
  });

  const { data: invoiceStats = {}, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/invoices/analytics/stats'],
  });

  const { data: syncLogs = [], isLoading: syncLogsLoading } = useQuery({
    queryKey: ['/api/invoices/sync/logs'],
  });

  const { data: syncStatus = {}, isLoading: syncStatusLoading } = useQuery({
    queryKey: ['/api/invoices/sync/status'],
  });

  // Forms
  const invoiceForm = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      currency: "USD",
      status: "unpaid",
      createdBy: "admin"
    },
  });

  const statusForm = useForm<StatusUpdateForm>({
    resolver: zodResolver(statusUpdateSchema),
  });

  // Mutations
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceForm) => {
      return await apiRequest('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/analytics/stats'] });
      setShowInvoiceDialog(false);
      invoiceForm.reset();
      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InvoiceForm> }) => {
      return await apiRequest(`/api/invoices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/analytics/stats'] });
      setShowInvoiceDialog(false);
      setEditingInvoice(null);
      invoiceForm.reset();
      toast({
        title: "Success",
        description: "Invoice updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: StatusUpdateForm }) => {
      return await apiRequest(`/api/invoices/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/analytics/stats'] });
      setShowStatusDialog(false);
      setSelectedInvoice(null);
      statusForm.reset();
      toast({
        title: "Success",
        description: "Invoice status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update invoice status",
        variant: "destructive",
      });
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/invoices/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/analytics/stats'] });
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    },
  });

  const syncInvoicesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/invoices/sync', {
        method: 'POST',
        body: JSON.stringify({ syncType: 'manual' }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/sync/logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/sync/status'] });
      toast({
        title: "Sync Complete",
        description: `Updated ${data.updatedInvoices} invoices`,
      });
    },
    onError: () => {
      toast({
        title: "Sync Failed",
        description: "Failed to sync with Google Sheets",
        variant: "destructive",
      });
    },
  });

  // Event handlers
  const onInvoiceSubmit = (data: InvoiceForm) => {
    if (editingInvoice) {
      updateInvoiceMutation.mutate({ id: editingInvoice.id, data });
    } else {
      createInvoiceMutation.mutate(data);
    }
  };

  const onStatusSubmit = (data: StatusUpdateForm) => {
    if (selectedInvoice) {
      updateStatusMutation.mutate({ id: selectedInvoice.id, data });
    }
  };

  const handleEditInvoice = (invoice: any) => {
    setEditingInvoice(invoice);
    invoiceForm.reset({
      invoiceNumber: invoice.invoiceNumber,
      clientId: invoice.clientId,
      invoiceDate: format(new Date(invoice.invoiceDate), 'yyyy-MM-dd'),
      weekStartDate: invoice.weekStartDate ? format(new Date(invoice.weekStartDate), 'yyyy-MM-dd') : undefined,
      weekEndDate: invoice.weekEndDate ? format(new Date(invoice.weekEndDate), 'yyyy-MM-dd') : undefined,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      dueDate: invoice.dueDate ? format(new Date(invoice.dueDate), 'yyyy-MM-dd') : undefined,
      description: invoice.description || '',
      notes: invoice.notes || '',
      fileUrl: invoice.fileUrl || '',
      fileName: invoice.fileName || '',
      createdBy: invoice.createdBy
    });
    setShowInvoiceDialog(true);
  };

  const handleUpdateStatus = (invoice: any) => {
    setSelectedInvoice(invoice);
    statusForm.reset({
      status: invoice.status
    });
    setShowStatusDialog(true);
  };

  const handleDeleteInvoice = (id: number) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      deleteInvoiceMutation.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500';
      case 'overdue':
        return 'bg-red-500';
      case 'unpaid':
      default:
        return 'bg-yellow-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4" />;
      case 'unpaid':
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getClientName = (clientId: number) => {
    const creator = creators.find((c: any) => c.id === clientId);
    return creator ? creator.displayName || creator.username : `Client ${clientId}`;
  };

  if (invoicesLoading || creatorsLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Invoice Management</h1>
          <p className="text-muted-foreground">
            Manage client invoices, track payments, and sync with accounting systems
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => syncInvoicesMutation.mutate()}
            disabled={syncInvoicesMutation.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {syncInvoicesMutation.isPending ? "Syncing..." : "Sync with Sheets"}
          </Button>
          <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingInvoice ? "Edit Invoice" : "Create New Invoice"}
                </DialogTitle>
                <DialogDescription>
                  {editingInvoice ? "Update invoice details" : "Add a new invoice to the system"}
                </DialogDescription>
              </DialogHeader>
              <Form {...invoiceForm}>
                <form onSubmit={invoiceForm.handleSubmit(onInvoiceSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={invoiceForm.control}
                      name="invoiceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Number</FormLabel>
                          <FormControl>
                            <Input placeholder="INV-001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={invoiceForm.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select client" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {creators.map((creator: any) => (
                                <SelectItem key={creator.id} value={creator.id.toString()}>
                                  {creator.displayName || creator.username}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={invoiceForm.control}
                      name="invoiceDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={invoiceForm.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={invoiceForm.control}
                      name="weekStartDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Week Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={invoiceForm.control}
                      name="weekEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Week End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={invoiceForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={invoiceForm.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="GBP">GBP</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={invoiceForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="unpaid">Unpaid</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="overdue">Overdue</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={invoiceForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Weekly services for..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={invoiceForm.control}
                      name="fileUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>File URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://drive.google.com/..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={invoiceForm.control}
                      name="fileName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>File Name</FormLabel>
                          <FormControl>
                            <Input placeholder="invoice.pdf" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={invoiceForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional notes..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowInvoiceDialog(false);
                        setEditingInvoice(null);
                        invoiceForm.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createInvoiceMutation.isPending || updateInvoiceMutation.isPending}>
                      {editingInvoice ? "Update" : "Create"} Invoice
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoiceStats.totalInvoices || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Invoices</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoiceStats.paidInvoices || 0}</div>
            <p className="text-xs text-muted-foreground">
              ${invoiceStats.paidAmount || '0'} collected
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Invoices</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoiceStats.unpaidInvoices || 0}</div>
            <p className="text-xs text-muted-foreground">
              ${invoiceStats.unpaidAmount || '0'} outstanding
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${invoiceStats.totalAmount || '0'}</div>
            <p className="text-xs text-muted-foreground">
              {invoiceStats.overdueInvoices || 0} overdue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="invoices">All Invoices</TabsTrigger>
          <TabsTrigger value="sync">Google Sheets Sync</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Invoice Management</CardTitle>
                  <CardDescription>
                    View, create, and manage client invoices
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilterStatus("");
                      setFilterClient("");
                      refetchInvoices();
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoices.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No invoices found
                  </p>
                ) : (
                  invoices.map((invoice: any) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(invoice.status)}`} />
                        <div>
                          <h3 className="font-medium">{invoice.invoiceNumber}</h3>
                          <p className="text-sm text-muted-foreground">
                            {getClientName(invoice.clientId)} • {format(new Date(invoice.invoiceDate), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-medium">{invoice.currency} {invoice.amount}</p>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(invoice.status)}
                            <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                              {invoice.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {invoice.fileUrl && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={invoice.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(invoice)}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditInvoice(invoice)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteInvoice(invoice.id)}
                            disabled={deleteInvoiceMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Google Sheets Synchronization</CardTitle>
              <CardDescription>
                Sync invoice statuses with your accounting Google Sheet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Sync Status</h3>
                    <p className="text-sm text-muted-foreground">
                      {syncStatus.lastSync ? 
                        `Last synced: ${format(new Date(syncStatus.lastSync.syncStartedAt), "MMM d, yyyy 'at' h:mm a")}` :
                        'Never synced'
                      }
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {syncStatus.nextSyncRecommended && (
                      <Badge variant="secondary">
                        {syncStatus.invoicesNeedingSync} need sync
                      </Badge>
                    )}
                    <Button
                      onClick={() => syncInvoicesMutation.mutate()}
                      disabled={syncInvoicesMutation.isPending}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {syncInvoicesMutation.isPending ? "Syncing..." : "Sync Now"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Recent Sync Logs</h4>
                  {syncLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No sync logs available</p>
                  ) : (
                    syncLogs.map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="text-sm font-medium">
                            {log.syncType} sync - {log.syncStatus}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.syncStartedAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <p>{log.updatedInvoices || 0} updated</p>
                          {log.errorCount > 0 && (
                            <p className="text-red-500">{log.errorCount} errors</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Analytics</CardTitle>
              <CardDescription>
                Overview of invoice performance and payment trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Payment Status Overview</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Paid Invoices</span>
                      <span className="font-medium">{invoiceStats.paidInvoices || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unpaid Invoices</span>
                      <span className="font-medium">{invoiceStats.unpaidInvoices || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Overdue Invoices</span>
                      <span className="font-medium text-red-500">{invoiceStats.overdueInvoices || 0}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Revenue Overview</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Revenue</span>
                      <span className="font-medium">${invoiceStats.totalAmount || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Collected</span>
                      <span className="font-medium text-green-600">${invoiceStats.paidAmount || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Outstanding</span>
                      <span className="font-medium text-orange-500">${invoiceStats.unpaidAmount || '0'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Invoice Status</DialogTitle>
            <DialogDescription>
              Change the status of invoice {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <Form {...statusForm}>
            <form onSubmit={statusForm.handleSubmit(onStatusSubmit)} className="space-y-4">
              <FormField
                control={statusForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={statusForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Reason for status change..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowStatusDialog(false);
                    setSelectedInvoice(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateStatusMutation.isPending}>
                  Update Status
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}