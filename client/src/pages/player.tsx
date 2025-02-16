import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { VideoPlayer } from "@/components/video-player";
import { type Video } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Player() {
  const [, params] = useRoute("/player/:id");
  const videoId = params?.id;

  const { data: video, isLoading } = useQuery<Video>({
    queryKey: [`/api/videos/${videoId}`],
    enabled: !!videoId,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!video) {
    return <div>Video not found</div>;
  }

  return (
    <div className="container mx-auto p-6">
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
