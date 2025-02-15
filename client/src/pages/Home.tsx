import { useQuery } from "@tanstack/react-query";
import { VideoGrid } from "@/components/VideoGrid";
import { Navigation } from "@/components/Navigation";
import { Loader2 } from "lucide-react";
import { type VideoMetadata } from "@shared/schema";
import { useLocation } from "wouter";

export default function Home() {
  const [location] = useLocation();
  const path = new URLSearchParams(location.split("?")[1]).get("path") || "";

  const { data: videos, isLoading, error } = useQuery<VideoMetadata[]>({
    queryKey: ["/api/videos", path],
    queryFn: async () => {
      const response = await fetch(`/api/videos?path=${encodeURIComponent(path)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-destructive">
        Failed to load videos. Please try again.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation currentPath={path} />
      <main className="container mx-auto px-4 py-8">
        <VideoGrid videos={videos || []} />
      </main>
    </div>
  );
}