import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("animate-pulse rounded-md bg-muted", className)} />
  );
}

// Page-specific skeleton components
export function PageHeaderSkeleton() {
  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-6 w-6" />
          <div className="space-y-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

export function TabsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex space-x-1 rounded-md bg-muted p-1">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-32 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-md border">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <div className="p-4">
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex h-[600px] rounded-lg border">
      <div className="w-1/3 border-r">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center space-x-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={`flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <div className="flex items-end space-x-2">
                {index % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
                <Skeleton className={`h-10 ${index % 2 === 0 ? 'w-48' : 'w-32'} rounded-lg`} />
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}