import { useParams } from 'wouter';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreatorAvatar } from '@/components/ui/creator-avatar';
import { Calendar, MapPin, Users, Clock, ArrowLeft, Home, Camera, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useCreatorAuth } from '@/contexts/CreatorAuthContext';

export default function TripInvite() {
  const params = useParams();
  // Extract tripId from URL path (e.g., /trip-invite/2 -> tripId = 2)
  const tripId = window.location.pathname.split('/').pop();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isCreatorAuthenticated, creatorId, creatorUsername } = useCreatorAuth();
  const [isAccepting, setIsAccepting] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Navigation functions for slideshow
  const nextSlide = () => {
    setCurrentSlideIndex(prev => 
      prev === coverPhotos.length - 1 ? 0 : prev + 1
    );
  };

  const prevSlide = () => {
    setCurrentSlideIndex(prev => 
      prev === 0 ? coverPhotos.length - 1 : prev - 1
    );
  };

  // Detect device type
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch trip details for public display
  const { data: trip = {}, isLoading, error } = useQuery({
    queryKey: [`/api/content-trips/${tripId}/public`],
    queryFn: async () => {
      const response = await fetch(`/api/content-trips/${tripId}/public`);
      if (!response.ok) {
        throw new Error('Failed to fetch trip details');
      }
      return response.json();
    },
    enabled: !!tripId,
  });



  // Fetch confirmed attendees
  const { data: attendees = [] } = useQuery({
    queryKey: [`/api/content-trips/${tripId}/attendees`],
    queryFn: async () => {
      const response = await fetch(`/api/content-trips/${tripId}/attendees`);
      if (!response.ok) {
        throw new Error('Failed to fetch attendees');
      }
      return response.json();
    },
    enabled: !!tripId,
  });

  // Mutation for accepting invitation
  const acceptInviteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/content-trips/${tripId}/accept-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to accept invitation');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate and refetch attendees to show updated list
      queryClient.invalidateQueries({ queryKey: [`/api/content-trips/${tripId}/attendees`] });
      queryClient.invalidateQueries({ queryKey: [`/api/content-trips/${tripId}/attendance`] });
      
      toast({
        title: "Success!",
        description: data.message || "Trip invitation accepted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Parse cover photos - handle both string URLs and PhotoItem objects
  const coverPhotos = trip?.cover_photos ? 
    (typeof trip.cover_photos === 'string' ? JSON.parse(trip.cover_photos) : trip.cover_photos) : [];
  
  // Debug logging to understand the trip data structure
  console.log('Trip invite debug data:', {
    trip: trip,
    coverPhotosRaw: trip?.cover_photos,
    coverPhotosParsed: coverPhotos,
    coverPhotosLength: coverPhotos.length
  });
  
  // Extract image URLs from cover photos (handles both string URLs and PhotoItem objects)
  const getCoverPhotoUrl = (photo: any) => {
    let url = '';
    
    if (typeof photo === 'string') {
      url = photo; // Direct URL string
    } else if (photo && typeof photo === 'object') {
      url = photo.croppedSrc || photo.src; // PhotoItem object
    } else {
      url = photo; // Fallback
    }
    
    // Ensure URL is properly formatted for public access
    if (url && !url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('blob:')) {
      // Ensure proper leading slash for static file serving
      if (!url.startsWith('/')) {
        url = `/${url}`;
      }
      
      // If URL doesn't start with /uploads/, add it
      if (!url.startsWith('/uploads/') && !url.startsWith('uploads/')) {
        // Remove any existing leading slash and add proper uploads prefix
        const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
        url = `/uploads/${cleanUrl}`;
      }
    }
    
    console.log('Trip invite image URL resolution:', {
      original: photo,
      resolved: url,
      type: typeof photo
    });
    return url;
  };

  // Auto-advance slideshow
  useEffect(() => {
    if (coverPhotos.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % coverPhotos.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [coverPhotos.length]);

  const handleAcceptInvite = async () => {
    if (!isCreatorAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to your creator account first, then return to this page to accept the invitation.",
        variant: "destructive",
      });
      return;
    }
    
    acceptInviteMutation.mutate();
  };

  // Check if the current creator is already attending this trip
  const isCurrentCreatorAttending = isCreatorAuthenticated && attendees.some(attendee => 
    attendee.creator_username === creatorUsername || 
    attendee.creator_name === creatorUsername ||
    attendee.creator_email === creatorUsername
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!trip || Object.keys(trip).length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Trip Not Found</h2>
            <p className="text-gray-600">This trip invitation link is invalid or has expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get device-specific background
  const getBackgroundStyle = () => {
    if (isMobile && trip?.invite_background_ios) {
      return {
        backgroundImage: `url(${trip.invite_background_ios})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    } else if (!isMobile && trip?.invite_background_pc) {
      return {
        backgroundImage: `url(${trip.invite_background_pc})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    }
    return {};
  };

  return (
    <div className="min-h-screen relative" style={getBackgroundStyle()}>
      {/* Background overlay for better readability */}
      <div className="absolute inset-0 bg-black/30"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">You're Invited!</h1>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column - Cover Photo Slideshow */}
            <div className="space-y-6">
              {coverPhotos.length > 0 && (
                <Card className="shadow-2xl">
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Camera className="h-5 w-5" style={{ color: '#FF69B4' }} />
                        <h3 className="font-semibold">Trip Preview</h3>
                      </div>
                      {coverPhotos.length > 1 && (
                        <div className="flex gap-1">
                          {coverPhotos.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentSlideIndex(index)}
                              className={`w-2 h-2 rounded-full transition-colors ${
                                index === currentSlideIndex ? 'bg-gray-300' : 'bg-gray-300'
                              }`}
                              style={index === currentSlideIndex ? { backgroundColor: '#FF69B4' } : {}}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="relative aspect-video overflow-hidden rounded-b-lg">
                      <img
                        src={getCoverPhotoUrl(coverPhotos[currentSlideIndex])}
                        alt={`Trip preview ${currentSlideIndex + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Enhanced error handling for debugging
                          const target = e.target as HTMLImageElement;
                          console.error('Public trip invite image failed to load:', {
                            url: target.src,
                            originalPhoto: coverPhotos[currentSlideIndex],
                            error: e
                          });
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                        onLoad={() => {
                          console.log('Public trip invite image loaded successfully:', getCoverPhotoUrl(coverPhotos[currentSlideIndex]));
                        }}
                      />
                      {/* Fallback display for broken images */}
                      <div className="hidden w-full h-full bg-gray-100 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <Camera className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">Image not available</p>
                        </div>
                      </div>
                      
                      {/* Arrow Navigation */}
                      {coverPhotos.length > 1 && (
                        <>
                          <button
                            onClick={prevSlide}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                            aria-label="Previous photo"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          <button
                            onClick={nextSlide}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                            aria-label="Next photo"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      
                      {/* Photo Counter */}
                      {coverPhotos.length > 1 && (
                        <div className="absolute bottom-4 right-4 bg-black/50 text-white text-sm px-2 py-1 rounded">
                          {currentSlideIndex + 1} / {coverPhotos.length}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}


            </div>

            {/* Right Column - Trip Details */}
            <div className="space-y-6">
              
              {/* Main Trip Info Card */}
              <Card className="shadow-2xl">
                <CardHeader className="text-white" style={{ background: 'linear-gradient(to right, #FF69B4, #FF1493)' }}>
                  <CardTitle className="text-2xl">{trip?.title || 'Content Trip'}</CardTitle>
                  <CardDescription className="text-pink-100">
                    {trip?.location || 'Amazing Location'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    
                    {/* Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5" style={{ color: '#FF69B4' }} />
                        <div>
                          <p className="font-medium text-gray-900">Start Date</p>
                          <p className="text-gray-600">
                            {trip?.start_date ? new Date(trip.start_date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            }) : 'TBD'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5" style={{ color: '#FF69B4' }} />
                        <div>
                          <p className="font-medium text-gray-900">End Date</p>
                          <p className="text-gray-600">
                            {trip?.end_date ? new Date(trip.end_date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            }) : 'TBD'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5" style={{ color: '#FF69B4' }} />
                      <div>
                        <p className="font-medium text-gray-900">Location</p>
                        <p className="text-gray-600">{trip?.location || 'Location TBD'}</p>
                      </div>
                    </div>

                    {/* House Link */}
                    {trip?.house_link && (
                      <div className="flex items-center gap-3">
                        <Home className="h-5 w-5" style={{ color: '#FF69B4' }} />
                        <div>
                          <p className="font-medium text-gray-900">Accommodation</p>
                          <a 
                            href={trip.house_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="underline"
                            style={{ color: '#FF69B4' }}
                            onMouseEnter={(e) => e.target.style.color = '#FF1493'}
                            onMouseLeave={(e) => e.target.style.color = '#FF69B4'}
                          >
                            View Property Details
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Cost */}
                    {trip?.trip_cost && (
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5" style={{ color: '#FF69B4' }} />
                        <div>
                          <p className="font-medium text-gray-900">Total Cost</p>
                          <p className="text-gray-600">${trip.trip_cost}</p>
                        </div>
                      </div>
                    )}

                    {/* Creators Attending */}
                    {attendees.length > 0 && (
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-3 mb-3">
                          <Users className="h-5 w-5 text-green-600" />
                          <p className="font-medium text-gray-900">Creators Attending ({attendees.length})</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {attendees.map((attendee, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                              <CreatorAvatar 
                                creator={attendee} 
                                size="md" 
                                fallbackClassName="bg-green-600 text-white"
                              />
                              <span className="text-sm font-medium text-green-800 truncate">
                                {attendee.creator_name || attendee.creator_username || attendee.creator_email}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </CardContent>
              </Card>

              {/* Content Goals */}
              {trip?.content_goals && (
                <Card className="shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-lg">Content Goals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{trip.content_goals}</p>
                  </CardContent>
                </Card>
              )}

              {/* Call to Action */}
              <Card className="shadow-xl bg-gradient-to-r from-green-50 to-pink-50">
                <CardContent className="p-6 text-center">
                  {isCurrentCreatorAttending ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-2 text-3xl">
                        <span>✅</span>
                        <span className="text-2xl font-bold text-green-700">See you there!</span>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>Logged in as {creatorUsername}</span>
                      </div>
                      <p className="text-gray-600 font-medium">
                        You've already accepted this trip invitation.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold text-gray-900">Ready to Join?</h3>
                      
                      {isCreatorAuthenticated ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                            <User className="h-4 w-4" />
                            <span>Logged in as {creatorUsername}</span>
                          </div>
                          <Button 
                            onClick={handleAcceptInvite}
                            disabled={acceptInviteMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg w-full sm:w-auto"
                          >
                            {acceptInviteMutation.isPending ? 'Accepting...' : 'Accept Invitation'}
                          </Button>
                          <p className="text-sm text-gray-600">
                            Click to confirm your attendance for this amazing trip!
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Button 
                            onClick={handleAcceptInvite}
                            className="text-white px-8 py-3 text-lg w-full sm:w-auto"
                            style={{ backgroundColor: '#FF69B4' }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#FF1493'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#FF69B4'}
                          >
                            Accept Invitation
                          </Button>
                          <p className="text-sm text-gray-600">
                            You'll need to log in to your creator account first
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}