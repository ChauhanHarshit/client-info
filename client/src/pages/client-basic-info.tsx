import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { User, Mail, Phone, Globe, Calendar, MessageSquare, Plus, Edit, DollarSign, Activity, TrendingUp, Upload, Search, Users, Percent } from 'lucide-react';
import { format } from 'date-fns';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Form schema for creating a creator
const createCreatorSchema = z.object({
	username: z.string().min(1, "Username is required"),
	displayName: z.string().min(1, "Display name is required"),
});

type CreateCreatorData = z.infer<typeof createCreatorSchema>;

export default function ClientBasicInfo() {
	const [selectedCreator, setSelectedCreator] = useState<any>(null);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
	const [profileImagePreview, setProfileImagePreview] = useState<string>('');
	const [searchTerm, setSearchTerm] = useState('');
	const [editFormData, setEditFormData] = useState({
		creatorId: '',
		profileImageUrl: '',
		displayName: '',
		internalNotes: ''
	});
	const [newNote, setNewNote] = useState('');

	// Initialize create form
	const createForm = useForm<CreateCreatorData>({
		resolver: zodResolver(createCreatorSchema),
		defaultValues: {
			username: '',
			displayName: '',
		},
	});

	// Handle profile image file selection
	const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			setProfileImageFile(file);
			const reader = new FileReader();
			reader.onload = (e) => {
				setProfileImagePreview(e.target?.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	// Upload image function
	const uploadProfileImage = async (file: File): Promise<string> => {
		const formData = new FormData();
		formData.append('file', file);

		const response = await fetch('/api/upload', {
			method: 'POST',
			body: formData,
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error('Failed to upload image');
		}

		const data = await response.json();
		return data.file?.url || data.url || data.fileUrl;
	};

	// Fetch all creators from /api/creators (same as /clients page)
	const { data: creatorsResponse, isLoading } = useQuery({
		queryKey: ['/api/creators'],
		queryFn: async () => {
			const response = await fetch('/api/creators', {
				credentials: 'include',
			});
			if (!response.ok) {
				throw new Error('Failed to fetch creators');
			}
			return response.json();
		},
		refetchOnWindowFocus: true,
		refetchOnMount: 'always',
		staleTime: 0,
		gcTime: 0,
	});

	// Log to debug the data
	console.log('Client Basic Info - Creators response:', creatorsResponse);
	console.log('Client Basic Info - Is Loading:', isLoading);

	// Ensure creators is an array
	const creatorsList = Array.isArray(creatorsResponse) ? creatorsResponse : [];

	// Filter creators based on search term
	const filteredCreators = creatorsList.filter((creator: any) => {
		const searchLower = searchTerm.toLowerCase();
		const displayName = (creator.displayName || creator.username || '').toLowerCase();
		const username = (creator.username || '').toLowerCase();
		return displayName.includes(searchLower) || username.includes(searchLower);
	});

	// Fetch team notes for selected creator
	const { data: teamNotes = [] } = useQuery({
		queryKey: selectedCreator ? [`/api/client-team-notes/${selectedCreator.id}`] : null,
		enabled: !!selectedCreator?.id,
		queryFn: async () => {
			const response = await fetch(`/api/client-team-notes/${selectedCreator.id}`, {
				credentials: 'include',
			});
			if (!response.ok) {
				if (response.status === 404) return [];
				throw new Error('Failed to fetch client forms');
			}
			return response.json();
		},
	});

	// Fetch client intake form data if available for selected creator
	const { data: clientFormData } = useQuery({
		queryKey: selectedCreator ? [`/api/client-forms/by-client/${selectedCreator.id}`] : null,
		enabled: !!selectedCreator?.id,
		queryFn: async () => {
			const response = await fetch(`/api/client-forms/by-client/${selectedCreator.id}`, {
				credentials: 'include',
			});
			if (!response.ok) {
				if (response.status === 404) return [];
				throw new Error('Failed to fetch client forms');
			}
			return response.json();
		},
	});

	// Create creator mutation
	const createCreatorMutation = useMutation({
		mutationFn: async (data: CreateCreatorData) => {
			let profileImageUrl = '';

			// Upload image if provided
			if (profileImageFile) {
				try {
					profileImageUrl = await uploadProfileImage(profileImageFile);
				} catch (error) {
					console.error('Image upload failed:', error);
				}
			}

			return apiRequest('POST', '/api/creators', { ...data, profileImageUrl });
		},
		onSuccess: () => {
			toast({
				title: 'Success!',
				description: 'Creator added successfully',
			});
			queryClient.invalidateQueries({ queryKey: ['/api/creators'] });
			setIsCreateDialogOpen(false);
			createForm.reset();
			setProfileImageFile(null);
			setProfileImagePreview('');
		},
		onError: (error: any) => {
			toast({
				title: 'Error',
				description: error.message || 'Failed to add creator',
				variant: 'destructive',
			});
		},
	});

	// Save creator info mutation
	const saveCreatorMutation = useMutation({
		mutationFn: (data: typeof editFormData) =>
			apiRequest('POST', '/api/client-basic-info', data),
		onSuccess: () => {
			toast({
				title: 'Success!',
				description: 'Creator information saved successfully',
			});
			queryClient.invalidateQueries({ queryKey: ['/api/creators'] });
			setIsEditDialogOpen(false);
		},
		onError: () => {
			toast({
				title: 'Error',
				description: 'Failed to save creator information',
				variant: 'destructive',
			});
		},
	});

	// Add team note mutation
	const addNoteMutation = useMutation({
		mutationFn: ({ creatorId, note }: { creatorId: number; note: string }) =>
			apiRequest('POST', '/api/client-team-notes', { clientId: creatorId, note }),
		onSuccess: () => {
			toast({
				title: 'Success!',
				description: 'Note added successfully',
			});
			queryClient.invalidateQueries({ queryKey: [`/api/client-team-notes/${selectedCreator?.id}`] });
			setNewNote('');
			setIsNoteDialogOpen(false);
		},
		onError: () => {
			toast({
				title: 'Error',
				description: 'Failed to add note',
				variant: 'destructive',
			});
		},
	});

	const handleEditCreator = (creator: any) => {
		setEditFormData({
			creatorId: creator.id,
			profileImageUrl: creator.profileImageUrl || '',
			displayName: creator.displayName || creator.username || '',
			internalNotes: ''
		});
		setIsEditDialogOpen(true);
	};

	const handleSaveCreator = () => {
		saveCreatorMutation.mutate(editFormData);
	};

	const handleAddNote = () => {
		if (selectedCreator && newNote.trim()) {
			addNoteMutation.mutate({ creatorId: selectedCreator.id, note: newNote });
		}
	};

	return (
		<div className="container max-w-full py-6">
			{/* Page Header */}
			<PageHeader
				title="Client Basic Info"
				description="View and manage client information"
			/>

			{/* Search and Add Button */}
			<div className="flex items-center gap-4 mt-6">
				<div className="relative flex-1 max-w-md">
					<Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
					<Input
						placeholder="Search clients..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
					<Plus className="h-4 w-4 mr-2" />
					Add Client
				</Button>
			</div>

			{/* Client Cards Grid */}
			{isLoading ? (
				<div className="text-center py-12">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
					<p className="text-muted-foreground mt-2">Loading clients...</p>
				</div>
			) : filteredCreators.length === 0 ? (
				<Card className="mt-6">
					<CardContent className="text-center py-12">
						<Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<p className="text-muted-foreground">
							{searchTerm ? 'No clients found matching your search.' : 'No clients found. Click "Add Client" to get started.'}
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-6">
					{filteredCreators.map((creator: any) => (
						<Card
							key={creator.id}
							className="cursor-pointer hover:shadow-md transition-all duration-200 bg-white"
							onClick={() => setSelectedCreator(creator)}
						>
							<CardContent className="p-6">
								<div className="flex items-start gap-4">
									{/* Profile Picture */}
									{creator.profileImageUrl ? (
										<img
											src={creator.profileImageUrl}
											alt={creator.displayName || creator.username}
											className="w-14 h-14 rounded-full object-cover flex-shrink-0"
										/>
									) : (
										<div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
											<User className="w-7 h-7 text-white" />
										</div>
									)}

									{/* Client Info */}
									<div className="flex-1 min-w-0">
										<h3 className="font-semibold text-base truncate">
											{creator.displayName || creator.username}
										</h3>
										<p className="text-sm text-muted-foreground mt-1">@{creator.username}</p>

										{/* Agency Fee */}
										<div className="flex items-center gap-2 mt-3">
											<div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
												<Percent className="h-3 w-3" />
												<span>{creator.agencyFee || 20}% Agency Fee</span>
											</div>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Creator Details Dialog */}
			{selectedCreator && (
				<Dialog open={!!selectedCreator} onOpenChange={(open) => !open && setSelectedCreator(null)}>
					<DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
						<DialogHeader>
							<div className="flex items-center gap-4">
								{selectedCreator.profileImageUrl ? (
									<img
										src={selectedCreator.profileImageUrl}
										alt={selectedCreator.displayName || selectedCreator.username}
										className="w-16 h-16 rounded-full object-cover"
									/>
								) : (
									<div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
										<User className="w-8 h-8 text-white" />
									</div>
								)}
								<div>
									<DialogTitle className="text-xl">{selectedCreator.displayName || selectedCreator.username}</DialogTitle>
									<DialogDescription>@{selectedCreator.username} • Creator Profile & Team Notes</DialogDescription>
								</div>
							</div>
						</DialogHeader>

						<div className="space-y-6">
							{/* Creator Stats */}
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
								{selectedCreator.revenue && (
									<div className="bg-green-50 p-3 rounded-lg">
										<div className="flex items-center gap-2 text-green-600 mb-1">
											<DollarSign className="h-4 w-4" />
											<span className="text-xs font-medium">Revenue</span>
										</div>
										<p className="text-lg font-bold">${selectedCreator.revenue.toLocaleString()}</p>
									</div>
								)}
								{selectedCreator.messageCount && (
									<div className="bg-blue-50 p-3 rounded-lg">
										<div className="flex items-center gap-2 text-blue-600 mb-1">
											<MessageSquare className="h-4 w-4" />
											<span className="text-xs font-medium">Messages</span>
										</div>
										<p className="text-lg font-bold">{selectedCreator.messageCount.toLocaleString()}</p>
									</div>
								)}
								{selectedCreator.responseRate && (
									<div className="bg-purple-50 p-3 rounded-lg">
										<div className="flex items-center gap-2 text-purple-600 mb-1">
											<TrendingUp className="h-4 w-4" />
											<span className="text-xs font-medium">Response Rate</span>
										</div>
										<p className="text-lg font-bold">{selectedCreator.responseRate}%</p>
									</div>
								)}
								{selectedCreator.lastActivity && (
									<div className="bg-orange-50 p-3 rounded-lg">
										<div className="flex items-center gap-2 text-orange-600 mb-1">
											<Activity className="h-4 w-4" />
											<span className="text-xs font-medium">Last Active</span>
										</div>
										<p className="text-sm font-medium">{format(new Date(selectedCreator.lastActivity), 'MMM d, yyyy')}</p>
									</div>
								)}
							</div>

							{/* Creator Details */}
							<div>
								<h3 className="font-medium mb-3">Creator Information</h3>
								<div className="space-y-2 text-sm">
									<p><strong>Username:</strong> @{selectedCreator.username}</p>
									<p><strong>Display Name:</strong> {selectedCreator.displayName || 'Not set'}</p>
									<p><strong>Creator ID:</strong> {selectedCreator.id}</p>
									<p><strong>Has Login:</strong> {selectedCreator.hasLogin ? 'Yes' : 'No'}</p>
									<p><strong>Created:</strong> {format(new Date(selectedCreator.createdAt), 'MMM d, yyyy h:mm a')}</p>
								</div>
							</div>

							{/* Client Form Responses */}
							{clientFormData && clientFormData.length > 0 && (
								<div>
									<h3 className="font-medium mb-3">Form Responses</h3>
									<div className="space-y-3">
										{clientFormData.map((form: any, index: number) => (
											<Card key={form.id || index} className="bg-gray-50">
												<CardContent className="pt-4">
													<div className="space-y-2 text-sm">
														{form.form_data && typeof form.form_data === 'object' &&
															Object.entries(form.form_data).map(([key, value]) => (
																<div key={key} className="flex justify-between py-1 border-b border-gray-200 last:border-0">
																	<span className="font-medium capitalize">
																		{key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}:
																	</span>
																	<span className="text-gray-700">{String(value || 'Not provided')}</span>
																</div>
															))
														}
														{form.created_at && (
															<p className="text-xs text-muted-foreground mt-2">
																Submitted: {format(new Date(form.created_at), 'MMM d, yyyy h:mm a')}
															</p>
														)}
													</div>
												</CardContent>
											</Card>
										))}
									</div>
								</div>
							)}

							{/* Team Notes */}
							<div>
								<div className="flex items-center justify-between mb-3">
									<h3 className="font-medium">Team Notes</h3>
									<Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
										<DialogTrigger asChild>
											<Button size="sm" variant="outline">
												<Plus className="h-4 w-4 mr-1" /> Add Note
											</Button>
										</DialogTrigger>
										<DialogContent>
											<DialogHeader>
												<DialogTitle>Add Team Note</DialogTitle>
												<DialogDescription>Add an internal note about this client</DialogDescription>
											</DialogHeader>
											<div className="space-y-4">
												<Textarea
													placeholder="Enter your note..."
													rows={4}
													value={newNote}
													onChange={(e) => setNewNote(e.target.value)}
												/>
											</div>
											<DialogFooter>
												<Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>
													Cancel
												</Button>
												<Button onClick={handleAddNote} disabled={!newNote.trim() || addNoteMutation.isPending}>
													{addNoteMutation.isPending ? 'Adding...' : 'Add Note'}
												</Button>
											</DialogFooter>
										</DialogContent>
									</Dialog>
								</div>

								{teamNotes.length === 0 ? (
									<p className="text-muted-foreground text-sm">No team notes yet</p>
								) : (
									<div className="space-y-3">
										{teamNotes.map((note: any) => (
											<Card key={note.id}>
												<CardContent className="pt-4">
													<p className="text-sm">{note.note}</p>
													<div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
														<MessageSquare className="h-3 w-3" />
														<span>{note.createdByName}</span>
														<span>•</span>
														{/* <span>{format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}</span> */}
														<span>{note.createdAt}</span>
													</div>
												</CardContent>
											</Card>
										))}
									</div>
								)}
							</div>
						</div>
					</DialogContent>
				</Dialog>
			)}

			{/* Edit Creator Dialog */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Creator Information</DialogTitle>
						<DialogDescription>Update client profile and internal notes</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label htmlFor="displayName">Display Name</Label>
							<Input
								id="displayName"
								value={editFormData.displayName}
								onChange={(e) => setEditFormData({ ...editFormData, displayName: e.target.value })}
							/>
						</div>
						<div>
							<Label htmlFor="profileImageUrl">Profile Image URL</Label>
							<Input
								id="profileImageUrl"
								type="url"
								value={editFormData.profileImageUrl}
								onChange={(e) => setEditFormData({ ...editFormData, profileImageUrl: e.target.value })}
								placeholder="https://example.com/image.jpg"
							/>
						</div>
						<div>
							<Label htmlFor="internalNotes">Internal Notes</Label>
							<Textarea
								id="internalNotes"
								rows={3}
								value={editFormData.internalNotes}
								onChange={(e) => setEditFormData({ ...editFormData, internalNotes: e.target.value })}
								placeholder="Add any internal notes about this client..."
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleSaveCreator} disabled={saveCreatorMutation.isPending}>
							{saveCreatorMutation.isPending ? 'Saving...' : 'Save Changes'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Create Creator Dialog */}
			<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Add New Creator</DialogTitle>
						<DialogDescription>Enter the creator's information below</DialogDescription>
					</DialogHeader>
					<Form {...createForm}>
						<form onSubmit={createForm.handleSubmit((data) => createCreatorMutation.mutate(data))} className="space-y-4">
							{/* Profile Image Upload */}
							<div className="flex flex-col items-center gap-4">
								<div className="relative">
									{profileImagePreview ? (
										<img
											src={profileImagePreview}
											alt="Profile preview"
											className="w-24 h-24 rounded-full object-cover"
										/>
									) : (
										<div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
											<User className="w-12 h-12 text-white" />
										</div>
									)}
									<label
										htmlFor="profileImage"
										className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer hover:bg-primary/90"
									>
										<Upload className="h-4 w-4" />
										<input
											id="profileImage"
											type="file"
											accept="image/*"
											className="hidden"
											onChange={handleImageFileChange}
										/>
									</label>
								</div>
								<p className="text-xs text-muted-foreground">Click to upload profile image</p>
							</div>

							<FormField
								control={createForm.control}
								name="username"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Username</FormLabel>
										<FormControl>
											<Input placeholder="creator_username" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={createForm.control}
								name="displayName"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Display Name</FormLabel>
										<FormControl>
											<Input placeholder="Creator Display Name" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<DialogFooter>
								<Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
									Cancel
								</Button>
								<Button type="submit" disabled={createCreatorMutation.isPending}>
									{createCreatorMutation.isPending ? 'Adding...' : 'Add Creator'}
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
