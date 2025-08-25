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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Shield, Plus, Edit, Trash2, Copy, Eye, EyeOff, User } from 'lucide-react';
import { SiOnlyfans, SiInstagram, SiX, SiTiktok, SiYoutube, SiFacebook, SiReddit, SiSnapchat } from 'react-icons/si';

const PLATFORMS = [
	{ value: 'onlyfans', label: 'OnlyFans', icon: SiOnlyfans },
	{ value: 'instagram', label: 'Instagram', icon: SiInstagram },
	{ value: 'twitter', label: 'Twitter/X', icon: SiX },
	{ value: 'tiktok', label: 'TikTok', icon: SiTiktok },
	{ value: 'youtube', label: 'YouTube', icon: SiYoutube },
	{ value: 'facebook', label: 'Facebook', icon: SiFacebook },
	{ value: 'reddit', label: 'Reddit', icon: SiReddit },
	{ value: 'snapchat', label: 'Snapchat', icon: SiSnapchat },
	{ value: 'other', label: 'Other', icon: Shield }
];

const OWNERSHIP_OPTIONS = [
	{ value: 'client', label: 'Client Owned' },
	{ value: 'tasty', label: 'Tasty Owned' }
];

export default function ClientPasswords() {
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedCreator, setSelectedCreator] = useState<any>(null);
	const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [editingCredential, setEditingCredential] = useState<any>(null);
	const [showPasswords, setShowPasswords] = useState<{ [key: number]: boolean }>({});
	const [formData, setFormData] = useState({
		creatorId: '',
		platform: '',
		ownership: '',
		username: '',
		password: '',
		email: '',
		emailPassword: '',
		twoFaSetup: '',
		notes: ''
	});

	// Fetch all creators
	const { data: creatorsResponse, isLoading: creatorsLoading } = useQuery({
		queryKey: ['/api/creators'],
		queryFn: async () => {
			const response = await fetch('/api/creators', {
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			});
			if (!response.ok) {
				// If not authenticated, return empty array instead of throwing
				if (response.status === 401 || response.status === 403) {
					console.log('Not authenticated to fetch creators');
					return [];
				}
				throw new Error('Failed to fetch creators');
			}
			const data = await response.json();
			// Handle the response properly - it might be wrapped in an object
			if (data.message === 'Not authenticated') {
				return [];
			}
			return Array.isArray(data) ? data : data.creators || [];
		},
	});

	const creators = Array.isArray(creatorsResponse) ? creatorsResponse : [];

	// Fetch passwords for selected creator
	const { data: passwords = [], refetch: refetchPasswords } = useQuery({
		queryKey: ['/api/client-passwords', selectedCreator?.id],
		queryFn: async () => {
			if (!selectedCreator?.id) return [];
			const response = await fetch(`/api/client-passwords?creatorId=${selectedCreator.id}`, {
				credentials: 'include',
			});
			if (!response.ok) {
				throw new Error('Failed to fetch passwords');
			}
			return response.json();
		},
		enabled: !!selectedCreator?.id,
	});

	// Save password mutation
	const savePasswordMutation = useMutation({
		mutationFn: async (data: typeof formData) => {
			const url = editingCredential
				? `/api/client-passwords/${editingCredential.id}`
				: '/api/client-passwords';
			const method = editingCredential ? 'PUT' : 'POST';

			return apiRequest(method, url, data);
		},
		onSuccess: () => {
			toast({
				title: 'Success!',
				description: `Password ${editingCredential ? 'updated' : 'saved'} successfully`,
			});
			refetchPasswords();
			setIsAddModalOpen(false);
			setEditingCredential(null);
			resetForm();
		},
		onError: () => {
			toast({
				title: 'Error',
				description: `Failed to ${editingCredential ? 'update' : 'save'} password`,
				variant: 'destructive',
			});
		},
	});

	// Delete password mutation
	const deletePasswordMutation = useMutation({
		mutationFn: (id: number) =>
			apiRequest(`/api/client-passwords/${id}`, {
				method: 'DELETE',
			}),
		onSuccess: () => {
			toast({
				title: 'Success!',
				description: 'Password deleted successfully',
			});
			refetchPasswords();
		},
		onError: () => {
			toast({
				title: 'Error',
				description: 'Failed to delete password',
				variant: 'destructive',
			});
		},
	});

	const resetForm = () => {
		setFormData({
			creatorId: selectedCreator?.id || '',
			platform: '',
			ownership: '',
			username: '',
			password: '',
			email: '',
			emailPassword: '',
			twoFaSetup: '',
			notes: ''
		});
	};

	const handleCreatorClick = (creator: any) => {
		setSelectedCreator(creator);
		setIsCredentialsModalOpen(true);
	};

	const handleAddNew = () => {
		resetForm();
		setEditingCredential(null);
		setIsAddModalOpen(true);
	};

	const handleEdit = (credential: any) => {
		setFormData({
			creatorId: credential.creator_id || selectedCreator?.id || '',
			platform: credential.platform,
			ownership: credential.ownership,
			username: credential.username || '',
			password: credential.password || '',
			email: credential.email || '',
			emailPassword: credential.email_password || '',
			twoFaSetup: credential.two_fa_setup || '',
			notes: credential.notes || ''
		});
		setEditingCredential(credential);
		setIsAddModalOpen(true);
	};

	const handleSave = () => {
		if (!formData.platform || !formData.ownership) {
			toast({
				title: 'Error',
				description: 'Platform and ownership are required',
				variant: 'destructive',
			});
			return;
		}
		savePasswordMutation.mutate(formData);
	};

	const handleDelete = (id: number) => {
		if (confirm('Are you sure you want to delete this credential?')) {
			deletePasswordMutation.mutate(id);
		}
	};

	const togglePasswordVisibility = (id: number) => {
		setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
	};

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		toast({
			title: 'Copied!',
			description: 'Copied to clipboard',
		});
	};

	const getPlatformIcon = (platform: string) => {
		const platformConfig = PLATFORMS.find(p => p.value === platform);
		return platformConfig?.icon || Shield;
	};

	// Filter creators based on search
	const filteredCreators = creators.filter((creator: any) => {
		const searchLower = searchQuery.toLowerCase();
		return (
			creator.username?.toLowerCase().includes(searchLower) ||
			creator.displayName?.toLowerCase().includes(searchLower)
		);
	});

	return (
		<div className="container max-w-full py-6">
			<PageHeader
				title="Client Passwords"
				description="Manage login credentials for all creators"
			/>

			<Alert className="mb-6">
				<Shield className="h-4 w-4" />
				<AlertDescription>
					All passwords are encrypted and stored securely. Only authorized team members can view this information.
				</AlertDescription>
			</Alert>

			{/* Search Bar and Add Button */}
			<div className="mb-6 flex items-center gap-4">
				<div className="relative flex-1 max-w-md">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
					<Input
						placeholder="Search creators by name or username..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-10"
					/>
				</div>
				<Button onClick={() => {
					setSelectedCreator(null);
					handleAddNew();
				}}>
					<Plus className="h-4 w-4 mr-2" /> Add New Login
				</Button>
			</div>

			{/* Creator Cards Grid */}
			{creatorsLoading ? (
				<div className="text-center py-8">Loading creators...</div>
			) : filteredCreators.length === 0 ? (
				<Card>
					<CardContent className="text-center py-8">
						<p className="text-muted-foreground">
							{searchQuery ? 'No creators found matching your search' : 'No creators found. Add creators from the Clients page to get started.'}
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
					{filteredCreators.map((creator: any) => (
						<Card
							key={creator.id}
							className="hover:shadow-lg transition-shadow cursor-pointer"
							onClick={() => handleCreatorClick(creator)}
						>
							<CardContent className="p-6 text-center">
								<Avatar className="w-24 h-24 mx-auto mb-4">
									<AvatarImage src={creator.profileImageUrl} alt={creator.displayName} />
									<AvatarFallback className="text-2xl">
										{creator.displayName?.[0]?.toUpperCase() || creator.username?.[0]?.toUpperCase() || '?'}
									</AvatarFallback>
								</Avatar>
								<h3 className="font-semibold text-lg">{creator.displayName || creator.username}</h3>
								<p className="text-sm text-muted-foreground">@{creator.username}</p>
								<div className="mt-2 text-xs text-muted-foreground">
									Click to view credentials
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Credentials Modal */}
			<Dialog open={isCredentialsModalOpen} onOpenChange={setIsCredentialsModalOpen}>
				<DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-3">
							<Avatar className="w-10 h-10">
								<AvatarImage src={selectedCreator?.profileImageUrl} alt={selectedCreator?.displayName} />
								<AvatarFallback>
									{selectedCreator?.displayName?.[0]?.toUpperCase() || selectedCreator?.username?.[0]?.toUpperCase() || '?'}
								</AvatarFallback>
							</Avatar>
							<div>
								<div>{selectedCreator?.displayName || selectedCreator?.username}</div>
								<div className="text-sm text-muted-foreground font-normal">@{selectedCreator?.username}</div>
							</div>
						</DialogTitle>
						<DialogDescription>
							Manage login credentials for this creator
						</DialogDescription>
					</DialogHeader>

					<div className="mt-4">
						<div className="flex justify-end mb-4">
							<Button onClick={handleAddNew}>
								<Plus className="h-4 w-4 mr-2" /> Add Login
							</Button>
						</div>

						{passwords.length === 0 ? (
							<Card>
								<CardContent className="text-center py-8">
									<p className="text-muted-foreground">No credentials saved for this creator</p>
								</CardContent>
							</Card>
						) : (
							<div className="space-y-4">
								{passwords.map((credential: any) => {
									const Icon = getPlatformIcon(credential.platform);
									return (
										<Card key={credential.id}>
											<CardContent className="p-4">
												<div className="flex items-start justify-between mb-3">
													<div className="flex items-center gap-3">
														<Icon className="h-6 w-6" />
														<div>
															<div className="font-semibold">
																{PLATFORMS.find(p => p.value === credential.platform)?.label || credential.platform}
															</div>
															<div className="text-sm text-muted-foreground">
																{credential.ownership === 'client' ? 'Client Owned' : 'Tasty Owned'}
															</div>
														</div>
													</div>
													<div className="flex gap-2">
														<Button
															size="sm"
															variant="ghost"
															onClick={() => handleEdit(credential)}
														>
															<Edit className="h-4 w-4" />
														</Button>
														<Button
															size="sm"
															variant="ghost"
															onClick={() => handleDelete(credential.id)}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</div>
												</div>

												<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
													{credential.username && (
														<div>
															<Label className="text-xs">Username</Label>
															<div className="flex items-center gap-1 mt-1">
																<Input value={credential.username} readOnly className="text-sm" />
																<Button
																	size="sm"
																	variant="ghost"
																	onClick={() => copyToClipboard(credential.username)}
																>
																	<Copy className="h-3 w-3" />
																</Button>
															</div>
														</div>
													)}

													{credential.password && (
														<div>
															<Label className="text-xs">Password</Label>
															<div className="flex items-center gap-1 mt-1">
																<Input
																	type={showPasswords[credential.id] ? 'text' : 'password'}
																	value={credential.password}
																	readOnly
																	className="font-mono text-sm"
																/>
																<Button
																	size="sm"
																	variant="ghost"
																	onClick={() => togglePasswordVisibility(credential.id)}
																>
																	{showPasswords[credential.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
																</Button>
																<Button
																	size="sm"
																	variant="ghost"
																	onClick={() => copyToClipboard(credential.password)}
																>
																	<Copy className="h-3 w-3" />
																</Button>
															</div>
														</div>
													)}

													{credential.email && (
														<div>
															<Label className="text-xs">Email</Label>
															<div className="flex items-center gap-1 mt-1">
																<Input value={credential.email} readOnly className="text-sm" />
																<Button
																	size="sm"
																	variant="ghost"
																	onClick={() => copyToClipboard(credential.email)}
																>
																	<Copy className="h-3 w-3" />
																</Button>
															</div>
														</div>
													)}

													{credential.email_password && (
														<div>
															<Label className="text-xs">Email Password</Label>
															<div className="flex items-center gap-1 mt-1">
																<Input
																	type={showPasswords[`email_${credential.id}`] ? 'text' : 'password'}
																	value={credential.email_password}
																	readOnly
																	className="font-mono text-sm"
																/>
																<Button
																	size="sm"
																	variant="ghost"
																	onClick={() => togglePasswordVisibility(`email_${credential.id}` as any)}
																>
																	{showPasswords[`email_${credential.id}`] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
																</Button>
																<Button
																	size="sm"
																	variant="ghost"
																	onClick={() => copyToClipboard(credential.email_password)}
																>
																	<Copy className="h-3 w-3" />
																</Button>
															</div>
														</div>
													)}
												</div>

												{credential.two_fa_setup && (
													<div className="mt-3">
														<Label className="text-xs">2FA Code/Setup</Label>
														<div className="mt-1 p-2 bg-muted rounded text-sm">{credential.two_fa_setup}</div>
													</div>
												)}

												{credential.notes && (
													<div className="mt-3">
														<Label className="text-xs">Notes</Label>
														<div className="mt-1 p-2 bg-muted rounded text-sm">{credential.notes}</div>
													</div>
												)}
											</CardContent>
										</Card>
									);
								})}
							</div>
						)}
					</div>
				</DialogContent>
			</Dialog>

			{/* Add/Edit Credential Modal */}
			<Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>{editingCredential ? 'Edit Login' : 'Add New Login'}</DialogTitle>
						<DialogDescription>
							{editingCredential ? 'Update the login credentials' : 'Add new login credentials for this creator'}
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						{!selectedCreator && (
							<div>
								<Label htmlFor="creator">Creator *</Label>
								<Select
									value={formData.creatorId}
									onValueChange={(value) => setFormData({ ...formData, creatorId: value })}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select creator" />
									</SelectTrigger>
									<SelectContent>
										{creators.length === 0 ? (
											<SelectItem value="none" disabled>
												No creators available. Please add creators from the Clients page first.
											</SelectItem>
										) : (
											creators.map((creator: any) => (
												<SelectItem key={creator.id} value={creator.id.toString()}>
													{creator.displayName || creator.username}
												</SelectItem>
											))
										)}
									</SelectContent>
								</Select>
							</div>
						)}

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="platform">Platform *</Label>
								<Select
									value={formData.platform}
									onValueChange={(value) => setFormData({ ...formData, platform: value })}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select platform" />
									</SelectTrigger>
									<SelectContent>
										{PLATFORMS.map((platform) => (
											<SelectItem key={platform.value} value={platform.value}>
												{platform.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div>
								<Label htmlFor="ownership">Ownership *</Label>
								<Select
									value={formData.ownership}
									onValueChange={(value) => setFormData({ ...formData, ownership: value })}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select ownership" />
									</SelectTrigger>
									<SelectContent>
										{OWNERSHIP_OPTIONS.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="username">Username</Label>
								<Input
									id="username"
									value={formData.username}
									onChange={(e) => setFormData({ ...formData, username: e.target.value })}
									placeholder="Enter username"
								/>
							</div>

							<div>
								<Label htmlFor="password">Password</Label>
								<Input
									id="password"
									type="password"
									value={formData.password}
									onChange={(e) => setFormData({ ...formData, password: e.target.value })}
									placeholder="Enter password"
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									value={formData.email}
									onChange={(e) => setFormData({ ...formData, email: e.target.value })}
									placeholder="Enter email"
								/>
							</div>

							<div>
								<Label htmlFor="emailPassword">Email Password</Label>
								<Input
									id="emailPassword"
									type="password"
									value={formData.emailPassword}
									onChange={(e) => setFormData({ ...formData, emailPassword: e.target.value })}
									placeholder="Enter email password"
								/>
							</div>
						</div>

						<div>
							<Label htmlFor="twoFaSetup">2FA Code/Setup</Label>
							<Textarea
								id="twoFaSetup"
								value={formData.twoFaSetup}
								onChange={(e) => setFormData({ ...formData, twoFaSetup: e.target.value })}
								placeholder="Enter 2FA codes or setup instructions"
								rows={2}
							/>
						</div>

						<div>
							<Label htmlFor="notes">Notes</Label>
							<Textarea
								id="notes"
								value={formData.notes}
								onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
								placeholder="Additional notes about this login"
								rows={3}
							/>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleSave} disabled={savePasswordMutation.isPending}>
							{savePasswordMutation.isPending ? 'Saving...' : editingCredential ? 'Update' : 'Save'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
