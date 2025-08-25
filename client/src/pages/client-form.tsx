import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { Calendar, Mail, Phone, Globe, DollarSign, Target, Plus, Copy, ExternalLink, Search, UserPlus } from 'lucide-react';
import { format } from 'date-fns';

export default function ClientForm() {
	const [showPublicForm, setShowPublicForm] = useState(false);
	const [copiedLink, setCopiedLink] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [assigningForm, setAssigningForm] = useState<any>(null);
	const [selectedClientId, setSelectedClientId] = useState<string>('');
	const [formData, setFormData] = useState({
		clientName: '',
		clientEmail: '',
		phoneNumber: '',
		businessType: '',
		website: '',
		socialMediaHandles: {
			instagram: '',
			tiktok: '',
			twitter: ''
		},
		monthlyBudget: '',
		goals: '',
		additionalInfo: ''
	});

	// Generate the public form URL
	const publicFormUrl = `${window.location.protocol}//tastyyyy.com/client-intake/public`;

	// Copy to clipboard function
	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(publicFormUrl);
			setCopiedLink(true);
			toast({
				title: "Copied!",
				description: "Public form link copied to clipboard",
			});
			setTimeout(() => setCopiedLink(false), 2000);
		} catch (err) {
			console.error('Failed to copy: ', err);
			toast({
				title: "Error",
				description: "Failed to copy link",
				variant: "destructive",
			});
		}
	};

	// Fetch all client forms
	const { data: forms = [], isLoading } = useQuery({
		queryKey: ['/api/client-forms'],
		queryFn: async () => {
			const res = await fetch('/api/client-forms');
			if (res.ok) {
				return res.json();
			}
		},
	});

	// Fetch all clients for assignment dropdown
	const { data: clients = [] } = useQuery({
		queryKey: ['/api/clients'],
		queryFn: async () => {
			const res = await fetch('/api/clients');
			if (res.ok) {
				return res.json();
			}
		},
	});

	// Filter forms based on search term
	const filteredForms = forms.filter((form: any) => {
		if (!searchTerm) return true;

		const searchLower = searchTerm.toLowerCase();

		// Search in all relevant fields
		return (
			form.clientName?.toLowerCase().includes(searchLower) ||
			form.clientEmail?.toLowerCase().includes(searchLower) ||
			form.phoneNumber?.toLowerCase().includes(searchLower) ||
			form.businessType?.toLowerCase().includes(searchLower) ||
			form.website?.toLowerCase().includes(searchLower) ||
			form.monthlyBudget?.toLowerCase().includes(searchLower) ||
			form.goals?.toLowerCase().includes(searchLower) ||
			form.additionalInfo?.toLowerCase().includes(searchLower) ||
			form.socialMediaHandles?.instagram?.toLowerCase().includes(searchLower) ||
			form.socialMediaHandles?.tiktok?.toLowerCase().includes(searchLower) ||
			form.socialMediaHandles?.twitter?.toLowerCase().includes(searchLower)
		);
	});

	// Submit form mutation
	const submitFormMutation = useMutation({
		mutationFn: (data: typeof formData) =>
			apiRequest('/api/client-forms/submit', {
				method: 'POST',
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			toast({
				title: 'Success!',
				description: 'Client form submitted successfully',
			});
			queryClient.invalidateQueries({ queryKey: ['/api/client-forms'] });
			setShowPublicForm(false);
			setFormData({
				clientName: '',
				clientEmail: '',
				phoneNumber: '',
				businessType: '',
				website: '',
				socialMediaHandles: {
					instagram: '',
					tiktok: '',
					twitter: ''
				},
				monthlyBudget: '',
				goals: '',
				additionalInfo: ''
			});
		},
		onError: () => {
			toast({
				title: 'Error',
				description: 'Failed to submit form',
				variant: 'destructive',
			});
		},
	});

	// Assign form to client mutation
	const assignFormMutation = useMutation({
		mutationFn: ({ formId, clientId }: { formId: string; clientId: string }) =>
			apiRequest('PUT', `/api/client-forms/${formId}/assign`, { clientId }),
		onSuccess: () => {
			toast({
				title: 'Success!',
				description: 'Form assigned to client successfully',
			});
			queryClient.invalidateQueries({ queryKey: ['/api/client-forms'] });
			setAssigningForm(null);
			setSelectedClientId('');
		},
		onError: () => {
			toast({
				title: 'Error',
				description: 'Failed to assign form to client',
				variant: 'destructive',
			});
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		submitFormMutation.mutate(formData);
	};

	const handleAssign = () => {
		if (assigningForm && selectedClientId) {
			assignFormMutation.mutate({
				formId: assigningForm.id,
				clientId: selectedClientId,
			});
		}
	};

	return (
		<div className="container max-w-full py-6">
			<PageHeader
				title="Client Forms"
				description="View submitted client intake forms and collect new client information"
			/>

			<Tabs defaultValue="submissions" className="mt-6">
				<TabsList>
					<TabsTrigger value="submissions">Form Submissions</TabsTrigger>
					<TabsTrigger value="public">Public Form</TabsTrigger>
				</TabsList>

				<TabsContent value="submissions" className="mt-6">
					{/* Search Input */}
					<div className="mb-4">
						<div className="relative max-w-md">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
							<Input
								type="text"
								placeholder="Search by name, email, phone, or any response..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-10"
							/>
						</div>
					</div>

					{isLoading ? (
						<div className="text-center py-8">Loading forms...</div>
					) : forms.length === 0 ? (
						<Card>
							<CardContent className="text-center py-8">
								<p className="text-muted-foreground">No client forms submitted yet</p>
							</CardContent>
						</Card>
					) : filteredForms.length === 0 ? (
						<Card>
							<CardContent className="text-center py-8">
								<p className="text-muted-foreground">No forms match your search</p>
							</CardContent>
						</Card>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
								<thead>
									<tr className="bg-gray-50 border-b">
										<th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Client Name</th>
										<th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Email</th>
										<th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Phone</th>
										<th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Business Type</th>
										<th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Budget</th>
										<th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Status</th>
										<th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Submitted</th>
										<th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Assigned To</th>
										<th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Action</th>
									</tr>
								</thead>
								<tbody>
									{filteredForms.map((form: any) => (
										<tr key={form.id} className="border-b hover:bg-gray-50">
											<td className="px-4 py-3 text-sm">{form.clientName}</td>
											<td className="px-4 py-3 text-sm">{form.clientEmail}</td>
											<td className="px-4 py-3 text-sm">{form.phoneNumber || '-'}</td>
											<td className="px-4 py-3 text-sm">{form.businessType || '-'}</td>
											<td className="px-4 py-3 text-sm">{form.monthlyBudget || '-'}</td>
											<td className="px-4 py-3 text-sm">
												<span className={`px-2 py-1 rounded-full text-xs ${form.status === 'active' ? 'bg-green-100 text-green-800' :
													form.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
														'bg-yellow-100 text-yellow-800'
													}`}>
													{form.status}
												</span>
											</td>
											<td className="px-4 py-3 text-sm">
												{format(new Date(form.submittedAt), 'MMM d, yyyy')}
											</td>
											<td className="px-4 py-3 text-sm">
												{form.assignedClientName || '-'}
											</td>
											<td className="px-4 py-3 text-sm">
												<Button
													size="sm"
													variant="outline"
													onClick={() => setAssigningForm(form)}
													className="flex items-center gap-1"
												>
													<UserPlus className="w-4 h-4" />
													Assign
												</Button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</TabsContent>

				<TabsContent value="public" className="mt-6">
					{/* Public Link Section */}
					<Card className="max-w-2xl mx-auto mb-6">
						<CardHeader>
							<CardTitle>Share Public Form</CardTitle>
							<CardDescription>
								Use this link to share the client intake form with potential clients
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex items-center space-x-2">
								<div className="flex-1">
									<div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
										<span className="font-mono text-sm text-gray-700 flex-1">
											{publicFormUrl}
										</span>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={copyToClipboard}
											className="hover:bg-gray-200"
										>
											{copiedLink ? (
												<span className="text-green-600">Copied!</span>
											) : (
												<Copy className="w-4 h-4" />
											)}
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => window.open(publicFormUrl, '_blank')}
											title="Open in new tab"
											className="hover:bg-gray-200"
										>
											<ExternalLink className="w-4 h-4" />
										</Button>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Form Preview */}
					<div className="max-w-4xl mx-auto space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Tasty Client Onboarding Form</CardTitle>
								<CardDescription>
									Preview of the comprehensive onboarding form that clients will see
								</CardDescription>
							</CardHeader>
						</Card>

						{/* Basic Information */}
						<Card>
							<CardHeader>
								<CardTitle>Basic Information</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid md:grid-cols-2 gap-4">
									<div>
										<Label>Full Name *</Label>
										<Input disabled placeholder="Full Name" />
									</div>
									<div>
										<Label>Age</Label>
										<Input disabled placeholder="Age" />
									</div>
									<div>
										<Label>When is your Birthday?</Label>
										<Input disabled type="date" />
									</div>
									<div>
										<Label>Height</Label>
										<Input disabled placeholder="e.g., 5'6 inches" />
									</div>
									<div>
										<Label>Weight</Label>
										<Input disabled placeholder="e.g., 130 lbs" />
									</div>
									<div>
										<Label>Clothing Size (bra, shoes, etc.)</Label>
										<Textarea disabled placeholder="For both tops + bottom outfits to be bought for you" rows={2} />
									</div>
									<div>
										<Label>Ethnicity</Label>
										<Input disabled placeholder="Ethnicity" />
									</div>
									<div>
										<Label>Where is your birthplace?</Label>
										<Input disabled placeholder="For chatting purposes" />
									</div>
									<div>
										<Label>What city do you currently reside in?</Label>
										<Input disabled placeholder="For chatting purposes" />
									</div>
									<div>
										<Label>What time zone are you located in?</Label>
										<Input disabled placeholder="e.g., PST, EST" />
									</div>
								</div>
								<div>
									<Label>Could you please provide a brief overview of your background?</Label>
									<Textarea disabled rows={3} placeholder="Background overview" />
								</div>
							</CardContent>
						</Card>

						{/* Personality & Preferences */}
						<Card>
							<CardHeader>
								<CardTitle>Personality & Preferences</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<Label>What is your favorite color(s)?</Label>
									<Input disabled placeholder="Favorite colors" />
								</div>
								<div>
									<Label>Please list your favorite interest(s)?</Label>
									<Textarea disabled placeholder="Movies, snacks, animals, etc." rows={2} />
								</div>
								<div>
									<Label>Personality Insight: Would you describe yourself more submissive or dominant?</Label>
									<Input disabled placeholder="Personality type" />
								</div>
								<div>
									<Label>Lingo & Keywords: Are there specific keywords, phrases, or lingo you commonly use?</Label>
									<Textarea disabled placeholder="For chatting purposes" rows={2} />
								</div>
								<div>
									<Label>Preferred Emojis: What are your preferred emojis when engaging with your audience?</Label>
									<Input disabled placeholder="Preferred emojis" />
								</div>
							</CardContent>
						</Card>

						{/* OnlyFans Information */}
						<Card>
							<CardHeader>
								<CardTitle>OnlyFans Information</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<Label>What is your OnlyFans profile?</Label>
									<Input disabled placeholder="OnlyFans profile" />
								</div>
								<div>
									<Label>How many OnlyFans pages do you currently have?</Label>
									<Input disabled placeholder="Number of pages" />
								</div>
								<div>
									<Label>What are your OnlyFans logins?</Label>
									<Textarea disabled placeholder="Include passwords for accounts requesting management" rows={2} />
								</div>
							</CardContent>
						</Card>

						{/* Explicit Content */}
						<Card>
							<CardHeader>
								<CardTitle>Explicit Content</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<Label>OnlyFans: Select categories that you are comfortable with creating or have already created</Label>
									<Textarea disabled placeholder="Content categories" rows={2} />
								</div>
								<div>
									<Label>Any limitations or notes regarding explicit content?</Label>
									<Textarea disabled placeholder="Limitations" rows={2} />
								</div>
								<div>
									<Label>If open to livestreaming on OnlyFans, please provide the best days and times for your schedule</Label>
									<Textarea disabled placeholder="Livestream schedule" rows={2} />
								</div>
							</CardContent>
						</Card>

						{/* Pricing & Content Rules */}
						<Card>
							<CardHeader>
								<CardTitle>Pricing & Content Rules</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<Label>What are minimum & general prices for Mass Messages (MM's)?</Label>
									<Input disabled placeholder="MM prices" />
								</div>
								<div>
									<Label>OnlyFans Wall Restrictions: What do you want / not want posted on your Wall?</Label>
									<Textarea disabled placeholder="Wall restrictions" rows={2} />
								</div>
								<div>
									<Label>Anything specific you do NOT want to be sent out in your MM's?</Label>
									<Textarea disabled placeholder="MM restrictions" rows={2} />
								</div>
								<div>
									<Label>Is there any wording/verbiage you would like us to stay away from in MM's?</Label>
									<Textarea disabled placeholder="Verbiage restrictions" rows={2} />
								</div>
								<div>
									<Label>Are you comfortable with short clips of long-form content included in bundle unlocks?</Label>
									<Input disabled placeholder="Yes/No" />
								</div>
								<div>
									<Label>What are your minimum prices for BG tapes, fully nude, 🐱, 🍒, etc.?</Label>
									<Textarea disabled placeholder="Content prices" rows={2} />
								</div>
							</CardContent>
						</Card>

						{/* Custom Content & Services */}
						<Card>
							<CardHeader>
								<CardTitle>Custom Content & Services</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<Label>Are you open to selling custom videos?</Label>
									<Input disabled placeholder="Yes/No" />
								</div>
								<div>
									<Label>What is your minimum price per minute for custom videos?</Label>
									<Input disabled placeholder="Price per minute" />
								</div>
								<div>
									<Label>Is there anything we should not sell for customs and avoid?</Label>
									<Textarea disabled placeholder="Custom restrictions" rows={2} />
								</div>
								<div>
									<Label>Do you offer an Amazon Wishlist?</Label>
									<Input disabled placeholder="Yes/No" />
								</div>
								<div>
									<Label>Are you open to video calls?</Label>
									<Input disabled placeholder="Yes/No" />
								</div>
								<div>
									<Label>What is your minimum price per minute for video calls and any important info to share regarding them?</Label>
									<Textarea disabled placeholder="Video call pricing and info" rows={2} />
								</div>
								<div>
									<Label>Do you sell panties and bras? Any personal clothing items?</Label>
									<Input disabled placeholder="Yes/No" />
								</div>
								<div>
									<Label>If yes, what are your prices for panties, bras, or other items like socks?</Label>
									<Textarea disabled placeholder="Item prices" rows={2} />
								</div>
							</CardContent>
						</Card>

						{/* Social Media */}
						<Card>
							<CardHeader>
								<CardTitle>Social Media Accounts</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<Label>What is your Instagram @?</Label>
									<Textarea disabled placeholder="Include all accounts and passwords for any you want us to run" rows={2} />
								</div>
								<div>
									<Label>What is your Twitter @?</Label>
									<Textarea disabled placeholder="Include all accounts and passwords for any you want us to run" rows={2} />
								</div>
								<div>
									<Label>Twitter: Select the categories that you are comfortable with creating or have already created</Label>
									<Textarea disabled placeholder="Twitter content categories" rows={2} />
								</div>
								<div>
									<Label>What is your Facebook @?</Label>
									<Textarea disabled placeholder="Include all accounts and passwords for any you want us to run" rows={2} />
								</div>
								<div>
									<Label>What is your TikTok @?</Label>
									<Textarea disabled placeholder="Include all accounts and passwords for any you want us to run" rows={2} />
								</div>
								<div>
									<Label>What is your Reddit @?</Label>
									<Textarea disabled placeholder="Include all accounts and passwords for any you want us to run" rows={2} />
								</div>
								<div>
									<Label>Any other social media accounts?</Label>
									<Textarea disabled placeholder="e.g., YouTube, Telegram channel, porn sites, etc. — include passwords for management" rows={2} />
								</div>
							</CardContent>
						</Card>

						{/* OFTV */}
						<Card>
							<CardHeader>
								<CardTitle>OFTV Channel</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<Label>Do you have an OFTV channel?</Label>
									<Input disabled placeholder="Yes/No" />
								</div>
								<div>
									<Label>If yes, what is your OFTV channel name?</Label>
									<Input disabled placeholder="OFTV channel name" />
								</div>
								<div>
									<Label>If not, would you like to start one?</Label>
									<Input disabled placeholder="Yes/No" />
								</div>
								<div>
									<Label>What OFTV ideas would you be interested in filming?</Label>
									<Textarea disabled placeholder="OFTV content ideas" rows={3} />
								</div>
							</CardContent>
						</Card>

						{/* Follow-up & Contact */}
						<Card>
							<CardHeader>
								<CardTitle>Follow-up & Contact Information</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<Label>Email Address *</Label>
									<Input disabled type="email" placeholder="Email address" />
								</div>
								<div>
									<Label>Phone Number</Label>
									<Input disabled type="tel" placeholder="Phone number" />
								</div>
								<div>
									<Label>Would you like to do a follow-up call with us?</Label>
									<Input disabled placeholder="Yes/No" />
								</div>
								<div>
									<Label>If yes, please book a date below for the follow-up call (1–2 weeks after launch)</Label>
									<Input disabled type="date" />
								</div>
								<div>
									<Label>Please specify your preference of one day and one range of times, as well as the platform to video call on</Label>
									<Textarea disabled placeholder="Example: Skype – Wednesdays 4pm–10pm PST" rows={2} />
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="pt-6">
								<Button type="button" className="w-full" disabled>
									Submit Form
								</Button>
							</CardContent>
						</Card>
					</div>
				</TabsContent>
			</Tabs>

			{/* Assign Form Dialog */}
			<Dialog open={!!assigningForm} onOpenChange={(open) => !open && setAssigningForm(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Assign Form to Client</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div>
							<Label>Select Client</Label>
							<Select value={selectedClientId} onValueChange={setSelectedClientId}>
								<SelectTrigger>
									<SelectValue placeholder="Choose a client..." />
								</SelectTrigger>
								<SelectContent>
									{clients.map((client: any) => (
										<SelectItem key={client.id} value={client.id}>
											{client.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{assigningForm && (
							<div className="text-sm text-gray-600">
								Assigning form from: <strong>{assigningForm.clientName}</strong>
							</div>
						)}
					</div>
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => {
							setAssigningForm(null);
							setSelectedClientId('');
						}}>
							Cancel
						</Button>
						<Button
							onClick={handleAssign}
							disabled={!selectedClientId || assignFormMutation.isPending}
						>
							{assignFormMutation.isPending ? 'Assigning...' : 'Assign'}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
