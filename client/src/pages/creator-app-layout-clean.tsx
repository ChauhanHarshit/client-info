import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCreatorAuth } from '@/contexts/CreatorAuthContext';
import { CenteredSectionLoader } from '@/components/ui/loading-animation';
import { Home, Play, User, Calendar as CalendarIcon } from 'lucide-react';

export default function CreatorAppLayout() {
  // Get creator authentication data
  const { isCreatorAuthenticated, creatorId, creatorUsername, isLoading } = useCreatorAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'feed' | 'calendar' | 'profile'>('home');

  // Show loading while checking authentication
  if (isLoading) {
    return <CenteredSectionLoader />;
  }

  // Redirect to login if not authenticated
  if (!isCreatorAuthenticated) {
    window.location.href = '/creatorlogin';
    return null;
  }

  // Fetch creator-specific content
  const { data: assignedContent = [] } = useQuery({
    queryKey: [`/api/creator/${creatorUsername}/content`],
    enabled: !!creatorId && !!creatorUsername,
    staleTime: 0,
  });

  // Fetch creator engagements
  const { data: creatorEngagements = [] } = useQuery({
    queryKey: ['/api/creator-auth/engagements'],
    enabled: !!creatorId,
    staleTime: 0,
  });

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Welcome, {creatorUsername}!
            </h1>
            <p className="text-gray-600 mb-6">
              You have {assignedContent.length} content items assigned
            </p>
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              <button
                onClick={() => setActiveTab('feed')}
                className="p-4 bg-pink-100 rounded-lg hover:bg-pink-200 transition-colors"
              >
                <Play className="w-6 h-6 mx-auto mb-2 text-pink-600" />
                <span className="text-sm font-medium">View Feed</span>
              </button>
              <button
                onClick={() => setActiveTab('calendar')}
                className="p-4 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <CalendarIcon className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <span className="text-sm font-medium">Calendar</span>
              </button>
            </div>
          </div>
        );
      
      case 'feed':
        return (
          <div className="flex-1 p-4">
            <h2 className="text-xl font-bold mb-4">Content Feed</h2>
            {assignedContent.length > 0 ? (
              <div className="space-y-4">
                {assignedContent.map((content: any) => (
                  <div key={content.id} className="bg-white rounded-lg shadow-sm border p-4">
                    <h3 className="font-semibold text-gray-800">{content.title}</h3>
                    {content.description && (
                      <p className="text-gray-600 text-sm mt-2">{content.description}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded text-xs">
                        {content.mediaType}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No content assigned yet</p>
              </div>
            )}
          </div>
        );
      
      case 'calendar':
        return (
          <div className="flex-1 p-4">
            <h2 className="text-xl font-bold mb-4">Your Calendar</h2>
            <div className="text-center py-8">
              <p className="text-gray-500">Calendar view coming soon</p>
            </div>
          </div>
        );
      
      case 'profile':
        return (
          <div className="flex-1 p-4">
            <h2 className="text-xl font-bold mb-4">Your Profile</h2>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-pink-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">{creatorUsername}</h3>
                <p className="text-gray-600 text-sm mt-1">Creator ID: {creatorId}</p>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex justify-around items-center">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg ${
              activeTab === 'home'
                ? 'bg-pink-100 text-pink-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs">Home</span>
          </button>
          
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg ${
              activeTab === 'feed'
                ? 'bg-pink-100 text-pink-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Play className="w-5 h-5" />
            <span className="text-xs">Feed</span>
          </button>
          
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg ${
              activeTab === 'calendar'
                ? 'bg-pink-100 text-pink-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <CalendarIcon className="w-5 h-5" />
            <span className="text-xs">Calendar</span>
          </button>
          
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg ${
              activeTab === 'profile'
                ? 'bg-pink-100 text-pink-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}