import { useCrmAuth } from "@/contexts/CrmAuthContext";

export default function Home() {
  const { employee } = useCrmAuth();

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <img 
            src="https://tastyyyy-videos.s3.amazonaws.com/uploads/media-1749948677284-706490840-1753430841331.gif" 
            alt="Welcome to Tasty CRM" 
            className="w-32 h-32"
          />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Welcome to Tasty's CRM
        </h1>
        {employee && (
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Hello, {employee.firstName} {employee.lastName}!
          </p>
        )}
        <p className="text-gray-500 dark:text-gray-500 max-w-md mx-auto">
          Use the navigation menu on the left to access your team's tools and content management features.
        </p>
      </div>
    </div>
  );
}