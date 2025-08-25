import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  CreatorAvatarData, 
  getCreatorAvatarUrl, 
  getCreatorInitials, 
  getAvatarSizeClasses, 
  getAvatarFallbackClasses 
} from "@/lib/creator-avatar-utils";
import { cn } from "@/lib/utils";

interface CreatorAvatarProps {
  creator: CreatorAvatarData;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  alt?: string;
  fallbackClassName?: string;
}

/**
 * Global Creator Avatar Component
 * 
 * This component provides consistent creator profile picture display across all components.
 * It automatically handles:
 * - Different API response formats (profileImageUrl, profile_image_url, etc.)
 * - Proper URL formatting and static file serving
 * - Consistent fallback initials when no image is available
 * - Consistent gradient styling for fallback avatars
 * - Multiple size options with proper responsive text sizing
 * 
 * Usage:
 * <CreatorAvatar creator={creator} size="md" />
 * <CreatorAvatar creator={creator} size="lg" className="border-2 border-blue-500" />
 */
export function CreatorAvatar({ 
  creator, 
  size = 'md', 
  className, 
  alt, 
  fallbackClassName 
}: CreatorAvatarProps) {
  const avatarUrl = getCreatorAvatarUrl(creator);
  const initials = getCreatorInitials(creator);
  const sizeClasses = getAvatarSizeClasses(size);
  const fallbackClasses = getAvatarFallbackClasses(size);
  
  const displayName = creator.displayName || creator.creator_name || creator.username || creator.creator_username || 'Creator';
  const altText = alt || `${displayName} profile picture`;
  
  return (
    <Avatar className={cn(sizeClasses, className)}>
      <AvatarImage 
        src={avatarUrl} 
        alt={altText}
      />
      <AvatarFallback className={cn(fallbackClasses, fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}