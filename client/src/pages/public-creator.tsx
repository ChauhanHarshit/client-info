import CreatorPageView from "./creator-page-view";

interface PublicCreatorProps {
  token: string;
}

export default function PublicCreator({ token }: PublicCreatorProps) {
  console.log('PublicCreator - Rendering full creator page for token:', token);
  
  // Render the full creator page view with token-based access
  return <CreatorPageView token={token} />;
}