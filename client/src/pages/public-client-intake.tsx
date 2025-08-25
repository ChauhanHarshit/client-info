import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { CheckCircle } from 'lucide-react';

export default function PublicClientIntake() {
	const [submitted, setSubmitted] = useState(false);
	const [formData, setFormData] = useState({
		// Basic Information
		clientName: '',
		age: '',
		birthday: '',
		height: '',
		weight: '',
		clothingSizes: '',
		ethnicity: '',
		birthplace: '',
		currentCity: '',
		timezone: '',
		backgroundOverview: '',

		// Personality & Preferences
		favoriteColors: '',
		interests: '',
		personalityType: '',
		lingoKeywords: '',
		preferredEmojis: '',

		// OnlyFans Information
		onlyfansProfile: '',
		onlyfansPagesCount: '',
		onlyfansLogins: '',

		// Content Preferences
		explicitContentCategories: '',
		explicitLimitations: '',
		livestreamSchedule: '',
		mmPrices: '',
		wallRestrictions: '',
		mmRestrictions: '',
		verbiageRestrictions: '',
		bundleClipsOk: '',
		contentPrices: '',
		customVideos: '',
		customPricePerMin: '',
		customRestrictions: '',

		// Sales & Services
		amazonWishlist: '',
		videoCalls: '',
		videoCallPrice: '',
		sellsItems: '',
		itemPrices: '',

		// Social Media
		instagramAccounts: '',
		twitterAccounts: '',
		twitterContentCategories: '',
		facebookAccounts: '',
		tiktokAccounts: '',
		redditAccounts: '',
		otherSocialMedia: '',

		// OFTV
		oftvChannel: '',
		oftvChannelName: '',
		startOftv: '',
		oftvIdeas: '',

		// Follow-up
		followupCall: '',
		followupDate: '',
		callPreferences: '',

		// Contact Info (keeping original fields for compatibility)
		clientEmail: '',
		phoneNumber: ''
	});

	// Submit form mutation
	const submitFormMutation = useMutation({
		mutationFn: (data: typeof formData) =>
			apiRequest('POST', '/api/client-forms/submit', data),
		onSuccess: () => {
			setSubmitted(true);
		},
		onError: () => {
			toast({
				title: 'Error',
				description: 'Failed to submit form. Please try again. some error',
				variant: 'destructive',
			});
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		submitFormMutation.mutate(formData);
	};

	if (submitted) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
				<Card className="max-w-md w-full">
					<CardContent className="text-center py-12">
						<CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
						<h2 className="text-2xl font-bold mb-2">Thank You!</h2>
						<p className="text-gray-600">
							Your information has been submitted successfully.
							We'll be in touch with you soon.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 py-8 px-4">
			<div className="max-w-4xl mx-auto">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">Tasty Client Onboarding Form</h1>
					<p className="text-gray-600">Please provide detailed information to help us serve you better</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Basic Information */}
					<Card>
						<CardHeader>
							<CardTitle>Basic Information</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid md:grid-cols-2 gap-4">
								<div>
									<Label htmlFor="clientName">Full Name *</Label>
									<Input
										id="clientName"
										required
										value={formData.clientName}
										onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
									/>
								</div>
								<div>
									<Label htmlFor="age">Age</Label>
									<Input
										id="age"
										value={formData.age}
										onChange={(e) => setFormData({ ...formData, age: e.target.value })}
									/>
								</div>
								<div>
									<Label htmlFor="birthday">When is your Birthday?</Label>
									<Input
										id="birthday"
										type="date"
										value={formData.birthday}
										onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
									/>
								</div>
								<div>
									<Label htmlFor="height">Height</Label>
									<Input
										id="height"
										value={formData.height}
										onChange={(e) => setFormData({ ...formData, height: e.target.value })}
										placeholder="e.g., 5'6 inches"
									/>
								</div>
								<div>
									<Label htmlFor="weight">Weight</Label>
									<Input
										id="weight"
										value={formData.weight}
										onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
										placeholder="e.g., 130 lbs"
									/>
								</div>
								<div>
									<Label htmlFor="clothingSizes">Clothing Size (bra, shoes, etc.)</Label>
									<Textarea
										id="clothingSizes"
										value={formData.clothingSizes}
										onChange={(e) => setFormData({ ...formData, clothingSizes: e.target.value })}
										placeholder="For both tops + bottom outfits to be bought for you"
										rows={2}
									/>
								</div>
								<div>
									<Label htmlFor="ethnicity">Ethnicity</Label>
									<Input
										id="ethnicity"
										value={formData.ethnicity}
										onChange={(e) => setFormData({ ...formData, ethnicity: e.target.value })}
									/>
								</div>
								<div>
									<Label htmlFor="birthplace">Where is your birthplace?</Label>
									<Input
										id="birthplace"
										value={formData.birthplace}
										onChange={(e) => setFormData({ ...formData, birthplace: e.target.value })}
										placeholder="For chatting purposes"
									/>
								</div>
								<div>
									<Label htmlFor="currentCity">What city do you currently reside in?</Label>
									<Input
										id="currentCity"
										value={formData.currentCity}
										onChange={(e) => setFormData({ ...formData, currentCity: e.target.value })}
										placeholder="For chatting purposes"
									/>
								</div>
								<div>
									<Label htmlFor="timezone">What time zone are you located in?</Label>
									<Input
										id="timezone"
										value={formData.timezone}
										onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
										placeholder="e.g., PST, EST"
									/>
								</div>
							</div>
							<div>
								<Label htmlFor="backgroundOverview">Could you please provide a brief overview of your background?</Label>
								<Textarea
									id="backgroundOverview"
									value={formData.backgroundOverview}
									onChange={(e) => setFormData({ ...formData, backgroundOverview: e.target.value })}
									rows={3}
								/>
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
								<Label htmlFor="favoriteColors">What is your favorite color(s)?</Label>
								<Input
									id="favoriteColors"
									value={formData.favoriteColors}
									onChange={(e) => setFormData({ ...formData, favoriteColors: e.target.value })}
								/>
							</div>
							<div>
								<Label htmlFor="interests">Please list your favorite interest(s)?</Label>
								<Textarea
									id="interests"
									value={formData.interests}
									onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
									placeholder="Movies, snacks, animals, etc."
									rows={2}
								/>
							</div>
							<div>
								<Label htmlFor="personalityType">Personality Insight: Would you describe yourself more submissive or dominant?</Label>
								<Input
									id="personalityType"
									value={formData.personalityType}
									onChange={(e) => setFormData({ ...formData, personalityType: e.target.value })}
								/>
							</div>
							<div>
								<Label htmlFor="lingoKeywords">Lingo & Keywords: Are there specific keywords, phrases, or lingo you commonly use?</Label>
								<Textarea
									id="lingoKeywords"
									value={formData.lingoKeywords}
									onChange={(e) => setFormData({ ...formData, lingoKeywords: e.target.value })}
									placeholder="For chatting purposes"
									rows={2}
								/>
							</div>
							<div>
								<Label htmlFor="preferredEmojis">Preferred Emojis: What are your preferred emojis when engaging with your audience?</Label>
								<Input
									id="preferredEmojis"
									value={formData.preferredEmojis}
									onChange={(e) => setFormData({ ...formData, preferredEmojis: e.target.value })}
								/>
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
								<Label htmlFor="onlyfansProfile">What is your OnlyFans profile?</Label>
								<Input
									id="onlyfansProfile"
									value={formData.onlyfansProfile}
									onChange={(e) => setFormData({ ...formData, onlyfansProfile: e.target.value })}
								/>
							</div>
							<div>
								<Label htmlFor="onlyfansPagesCount">How many OnlyFans pages do you currently have?</Label>
								<Input
									id="onlyfansPagesCount"
									value={formData.onlyfansPagesCount}
									onChange={(e) => setFormData({ ...formData, onlyfansPagesCount: e.target.value })}
								/>
							</div>
							<div>
								<Label htmlFor="onlyfansLogins">What are your OnlyFans logins?</Label>
								<Textarea
									id="onlyfansLogins"
									value={formData.onlyfansLogins}
									onChange={(e) => setFormData({ ...formData, onlyfansLogins: e.target.value })}
									placeholder="Include passwords for accounts requesting management"
									rows={2}
								/>
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
								<Label htmlFor="explicitContentCategories">OnlyFans: Select categories that you are comfortable with creating or have already created</Label>
								<Textarea
									id="explicitContentCategories"
									value={formData.explicitContentCategories}
									onChange={(e) => setFormData({ ...formData, explicitContentCategories: e.target.value })}
									rows={2}
								/>
							</div>
							<div>
								<Label htmlFor="explicitLimitations">Any limitations or notes regarding explicit content?</Label>
								<Textarea
									id="explicitLimitations"
									value={formData.explicitLimitations}
									onChange={(e) => setFormData({ ...formData, explicitLimitations: e.target.value })}
									rows={2}
								/>
							</div>
							<div>
								<Label htmlFor="livestreamSchedule">If open to livestreaming on OnlyFans, please provide the best days and times for your schedule</Label>
								<Textarea
									id="livestreamSchedule"
									value={formData.livestreamSchedule}
									onChange={(e) => setFormData({ ...formData, livestreamSchedule: e.target.value })}
									rows={2}
								/>
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
								<Label htmlFor="mmPrices">What are minimum & general prices for Mass Messages (MM's)?</Label>
								<Input
									id="mmPrices"
									value={formData.mmPrices}
									onChange={(e) => setFormData({ ...formData, mmPrices: e.target.value })}
								/>
							</div>
							<div>
								<Label htmlFor="wallRestrictions">OnlyFans Wall Restrictions: What do you want / not want posted on your Wall?</Label>
								<Textarea
									id="wallRestrictions"
									value={formData.wallRestrictions}
									onChange={(e) => setFormData({ ...formData, wallRestrictions: e.target.value })}
									rows={2}
								/>
							</div>
							<div>
								<Label htmlFor="mmRestrictions">Anything specific you do NOT want to be sent out in your MM's?</Label>
								<Textarea
									id="mmRestrictions"
									value={formData.mmRestrictions}
									onChange={(e) => setFormData({ ...formData, mmRestrictions: e.target.value })}
									rows={2}
								/>
							</div>
							<div>
								<Label htmlFor="verbiageRestrictions">Is there any wording/verbiage you would like us to stay away from in MM's?</Label>
								<Textarea
									id="verbiageRestrictions"
									value={formData.verbiageRestrictions}
									onChange={(e) => setFormData({ ...formData, verbiageRestrictions: e.target.value })}
									rows={2}
								/>
							</div>
							<div>
								<Label htmlFor="bundleClipsOk">Are you comfortable with short clips of long-form content included in bundle unlocks?</Label>
								<Input
									id="bundleClipsOk"
									value={formData.bundleClipsOk}
									onChange={(e) => setFormData({ ...formData, bundleClipsOk: e.target.value })}
								/>
							</div>
							<div>
								<Label htmlFor="contentPrices">What are your minimum prices for BG tapes, fully nude, 🐱, 🍒, etc.?</Label>
								<Textarea
									id="contentPrices"
									value={formData.contentPrices}
									onChange={(e) => setFormData({ ...formData, contentPrices: e.target.value })}
									rows={2}
								/>
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
								<Label htmlFor="customVideos">Are you open to selling custom videos?</Label>
								<Input
									id="customVideos"
									value={formData.customVideos}
									onChange={(e) => setFormData({ ...formData, customVideos: e.target.value })}
								/>
							</div>
							<div>
								<Label htmlFor="customPricePerMin">What is your minimum price per minute for custom videos?</Label>
								<Input
									id="customPricePerMin"
									value={formData.customPricePerMin}
									onChange={(e) => setFormData({ ...formData, customPricePerMin: e.target.value })}
								/>
							</div>
							<div>
								<Label htmlFor="customRestrictions">Is there anything we should not sell for customs and avoid?</Label>
								<Textarea
									id="customRestrictions"
									value={formData.customRestrictions}
									onChange={(e) => setFormData({ ...formData, customRestrictions: e.target.value })}
									rows={2}
								/>
							</div>
							<div>
								<Label htmlFor="amazonWishlist">Do you offer an Amazon Wishlist?</Label>
								<Input
									id="amazonWishlist"
									value={formData.amazonWishlist}
									onChange={(e) => setFormData({ ...formData, amazonWishlist: e.target.value })}
								/>
							</div>
							<div>
								<Label htmlFor="videoCalls">Are you open to video calls?</Label>
								<Input
									id="videoCalls"
									value={formData.videoCalls}
									onChange={(e) => setFormData({ ...formData, videoCalls: e.target.value })}
								/>
							</div>
							<div>
								<Label htmlFor="videoCallPrice">What is your minimum price per minute for video calls and any important info to share regarding them?</Label>
								<Textarea
									id="videoCallPrice"
									value={formData.videoCallPrice}
									onChange={(e) => setFormData({ ...formData, videoCallPrice: e.target.value })}
									rows={2}
								/>
							</div>
							<div>
								<Label htmlFor="sellsItems">Do you sell panties and bras? Any personal clothing items?</Label>
								<Input
									id="sellsItems"
									value={formData.sellsItems}
									onChange={(e) => setFormData({ ...formData, sellsItems: e.target.value })}
								/>
							</div>
							<div>
								<Label htmlFor="itemPrices">If yes, what are your prices for panties, bras, or other items like socks?</Label>
								<Textarea
									id="itemPrices"
									value={formData.itemPrices}
									onChange={(e) => setFormData({ ...formData, itemPrices: e.target.value })}
									rows={2}
								/>
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
								<Label htmlFor="instagramAccounts">What is your Instagram @?</Label>
								<Textarea
									id="instagramAccounts"
									value={formData.instagramAccounts}
									onChange={(e) => setFormData({ ...formData, instagramAccounts: e.target.value })}
									placeholder="Include all accounts and passwords for any you want us to run"
									rows={2}
								/>
							</div>
							<div>
								<Label htmlFor="twitterAccounts">What is your Twitter @?</Label>
								<Textarea
									id="twitterAccounts"
									value={formData.twitterAccounts}
									onChange={(e) => setFormData({ ...formData, twitterAccounts: e.target.value })}
									placeholder="Include all accounts and passwords for any you want us to run"
									rows={2}
								/>
							</div>
							<div>
								<Label htmlFor="twitterContentCategories">Twitter: Select the categories that you are comfortable with creating or have already created</Label>
								<Textarea
									id="twitterContentCategories"
									value={formData.twitterContentCategories}
									onChange={(e) => setFormData({ ...formData, twitterContentCategories: e.target.value })}
									rows={2}
								/>
							</div>
							<div>
								<Label htmlFor="facebookAccounts">What is your Facebook @?</Label>
								<Textarea
									id="facebookAccounts"
									value={formData.facebookAccounts}
									onChange={(e) => setFormData({ ...formData, facebookAccounts: e.target.value })}
									placeholder="Include all accounts and passwords for any you want us to run"
									rows={2}
								/>
							</div>
							<div>
								<Label htmlFor="tiktokAccounts">What is your TikTok @?</Label>
								<Textarea
									id="tiktokAccounts"
									value={formData.tiktokAccounts}
									onChange={(e) => setFormData({ ...formData, tiktokAccounts: e.target.value })}
									placeholder="Include all accounts and passwords for any you want us to run"
									rows={2}
								/>
							</div>
							<div>
								<Label htmlFor="redditAccounts">What is your Reddit @?</Label>
								<Textarea
									id="redditAccounts"
									value={formData.redditAccounts}
									onChange={(e) => setFormData({ ...formData, redditAccounts: e.target.value })}
									placeholder="Include all accounts and passwords for any you want us to run"
									rows={2}
								/>
							</div>
							<div>
								<Label htmlFor="otherSocialMedia">Any other social media accounts?</Label>
								<Textarea
									id="otherSocialMedia"
									value={formData.otherSocialMedia}
									onChange={(e) => setFormData({ ...formData, otherSocialMedia: e.target.value })}
									placeholder="e.g., YouTube, Telegram channel, porn sites, etc. — include passwords for management"
									rows={2}
								/>
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
								<Label htmlFor="oftvChannel">Do you have an OFTV channel?</Label>
								<Input
									id="oftvChannel"
									value={formData.oftvChannel}
									onChange={(e) => setFormData({ ...formData, oftvChannel: e.target.value })}
								/>
							</div>
							<div>
								<Label htmlFor="oftvChannelName">If yes, what is your OFTV channel name?</Label>
								<Input
									id="oftvChannelName"
									value={formData.oftvChannelName}
									onChange={(e) => setFormData({ ...formData, oftvChannelName: e.target.value })}
								/>
							</div>
							<div>
								<Label htmlFor="startOftv">If not, would you like to start one?</Label>
								<Input
									id="startOftv"
									value={formData.startOftv}
									onChange={(e) => setFormData({ ...formData, startOftv: e.target.value })}
								/>
							</div>
							<div>
								<Label htmlFor="oftvIdeas">What OFTV ideas would you be interested in filming?</Label>
								<Textarea
									id="oftvIdeas"
									value={formData.oftvIdeas}
									onChange={(e) => setFormData({ ...formData, oftvIdeas: e.target.value })}
									rows={3}
								/>
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
								<Label htmlFor="clientEmail">Email Address *</Label>
								<Input
									id="clientEmail"
									type="email"
									required
									value={formData.clientEmail}
									onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
								/>
							</div>
							<div>
								<Label htmlFor="phoneNumber">Phone Number</Label>
								<Input
									id="phoneNumber"
									type="tel"
									value={formData.phoneNumber}
									onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
								/>
							</div>
							<div>
								<Label htmlFor="followupCall">Would you like to do a follow-up call with us?</Label>
								<Input
									id="followupCall"
									value={formData.followupCall}
									onChange={(e) => setFormData({ ...formData, followupCall: e.target.value })}
								/>
							</div>
							<div>
								<Label htmlFor="followupDate">If yes, please book a date below for the follow-up call (1–2 weeks after launch)</Label>
								<Input
									id="followupDate"
									type="date"
									value={formData.followupDate}
									onChange={(e) => setFormData({ ...formData, followupDate: e.target.value })}
								/>
							</div>
							<div>
								<Label htmlFor="callPreferences">Please specify your preference of one day and one range of times, as well as the platform to video call on</Label>
								<Textarea
									id="callPreferences"
									value={formData.callPreferences}
									onChange={(e) => setFormData({ ...formData, callPreferences: e.target.value })}
									placeholder="Example: Skype – Wednesdays 4pm–10pm PST"
									rows={2}
								/>
							</div>
						</CardContent>
					</Card>

					<Button
						type="submit"
						className="w-full"
						disabled={submitFormMutation.isPending}
					>
						{submitFormMutation.isPending ? 'Submitting...' : 'Submit Form'}
					</Button>
				</form>
			</div>
		</div>
	);
}
