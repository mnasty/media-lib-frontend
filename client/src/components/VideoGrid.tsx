import { VideoCard } from "./VideoCard";
import { type VideoMetadata } from "@shared/schema";

interface VideoGridProps {
  videos: VideoMetadata[];
}

export function VideoGrid({ videos }: VideoGridProps) {
  // Ensure videos is always an array
  const videoList = Array.isArray(videos) ? videos : [];

  if (videoList.length === 0) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        No videos found in this directory
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {videoList.map((video) => (
        <VideoCard key={video.path} video={video} />
      ))}
    </div>
  );
}