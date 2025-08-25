import { ReactNode } from 'react';

interface CreatorLayoutProps {
  children: ReactNode;
}

export function CreatorLayout({ children }: CreatorLayoutProps) {
  // Check if this is the Creator App Layout (no header/wrapper needed for fullscreen mobile app)
  const isCreatorApp = window.location.pathname === '/' || window.location.pathname === '/creator-app-layout';
  
  if (isCreatorApp) {
    // Render Creator App Layout without any wrapper constraints
    return (
      <div className="w-full h-full" style={{ margin: 0, padding: 0, maxWidth: 'none' }}>
        {children}
      </div>
    );
  }
  
  // For other creator pages, use the normal layout
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Simple header for creator experience */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Creator Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  // Clear session and redirect to login
                  fetch('/api/creator-auth/logout', { method: 'POST' });
                  window.location.href = '/creatorlogins';
                }}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content area - no sidebar */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}