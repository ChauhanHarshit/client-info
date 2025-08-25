import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export default function TeamFormStandalone() {
  const [location] = useLocation();
  const [teamData, setTeamData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract team link from URL
  const teamLink = location.split('/team-form/')[1];

  console.log('TeamFormStandalone - Location:', location);
  console.log('TeamFormStandalone - Team Link:', teamLink);

  useEffect(() => {
    if (!teamLink) {
      setError('Invalid team link');
      setLoading(false);
      return;
    }

    // Fetch team data directly with fetch
    fetch(`/api/team-links/${teamLink}`)
      .then(response => {
        console.log('Team link response status:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Team data loaded:', data);
        setTeamData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading team data:', err);
        setError(`Failed to load team data: ${err.message}`);
        setLoading(false);
      });
  }, [teamLink]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading team form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
          <p className="text-gray-600 mb-4">
            Team Link: <code className="bg-gray-100 px-2 py-1 rounded">{teamLink}</code>
          </p>
          <p className="text-gray-600">
            Please check the URL and try again, or contact support if the problem persists.
          </p>
        </div>
      </div>
    );
  }

  if (!teamData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">No team data found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            Team Order Form
          </h1>
          
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h2 className="font-semibold text-green-800 mb-2">
              ✅ Team Form is Working!
            </h2>
            <p className="text-green-700">
              Successfully loaded team data for: <strong>{teamData.creatorDisplayName || teamData.username}</strong>
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Creator Username:
              </label>
              <p className="text-gray-900">{teamData.username}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name:
              </label>
              <p className="text-gray-900">{teamData.creatorDisplayName || 'Not set'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Team Link Token:
              </label>
              <p className="text-gray-900 font-mono text-sm bg-gray-100 p-2 rounded">
                {teamData.teamLinkToken}
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">
              🎉 Success!
            </h3>
            <p className="text-blue-700">
              The team form routing is now working correctly. This page loaded without any authentication issues.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}