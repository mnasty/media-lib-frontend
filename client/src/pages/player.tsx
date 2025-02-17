import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { VideoPlayer } from "@/components/video-player";
import { type Video, type Config } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Player() {
  const [, params] = useRoute("/player/:id");
  const videoId = params?.id;
  
  const { data: video, error: videoError } = useQuery<Video>({
    queryKey: ['video', videoId],
    queryFn: async () => {
      const response = await fetch(`/api/videos/${videoId}`);
      if (!response.ok) throw new Error('Video not found');
      return response.json();
    }
  });

  if (videoError) {
    console.error("Video fetch error:", videoError);
    return <div>Error loading video: {videoError.message}</div>;
  }

  if (!video) {
    return <div>Loading video...</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <Link href="/">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Button>
        </Link>
      </div>
      <VideoPlayer video={video} />
    </div>
  );
}
