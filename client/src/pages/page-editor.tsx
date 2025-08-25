import { useLocation } from "wouter";
import NotionEditor from "@/components/notion-editor/notion-editor";

interface PageEditorProps {
  pageId?: string;
  creatorId?: string;
}

export default function PageEditor({ pageId, creatorId }: PageEditorProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    setLocation("/");
  };

  return (
    <NotionEditor 
      pageId={pageId} 
      creatorId={creatorId} 
      onBack={handleBack}
    />
  );
}