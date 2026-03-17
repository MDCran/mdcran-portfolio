import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-sm",
        className,
      )}
      style={{ backgroundColor: "color-mix(in srgb, var(--theme-text, #fff) 6%, transparent)" }}
      {...props}
    />
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="rounded-sm border overflow-hidden" style={{ borderColor: "color-mix(in srgb, var(--theme-text, #fff) 7%, transparent)" }}>
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-14 rounded-sm" />
          <Skeleton className="h-5 w-14 rounded-sm" />
        </div>
      </div>
    </div>
  );
}

export function ArticleCardSkeleton() {
  return (
    <div className="rounded-sm border overflow-hidden" style={{ borderColor: "color-mix(in srgb, var(--theme-text, #fff) 7%, transparent)" }}>
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-16 rounded-sm" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function ClientCardSkeleton() {
  return (
    <div className="rounded-sm border p-5 space-y-4" style={{ borderColor: "color-mix(in srgb, var(--theme-text, #fff) 7%, transparent)" }}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-sm shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-sm" />
        <Skeleton className="h-6 w-16 rounded-sm" />
      </div>
      <Skeleton className="h-9 w-full rounded-sm" />
    </div>
  );
}

export function SkeletonGrid({ count = 6, type = "project" }: { count?: number; type?: "project" | "article" | "client" }) {
  const Card = type === "article" ? ArticleCardSkeleton : type === "client" ? ClientCardSkeleton : ProjectCardSkeleton;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} />
      ))}
    </>
  );
}
