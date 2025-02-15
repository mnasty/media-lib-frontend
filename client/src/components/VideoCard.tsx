import { Card, CardContent } from "@/components/ui/card";
import { Star, Film } from "lucide-react";
import { type VideoMetadata } from "@shared/schema";
import { useLocation } from "wouter";

interface VideoCardProps {
  video: VideoMetadata;
}

export function VideoCard({ video }: VideoCardProps) {
  const [, setLocation] = useLocation();

  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-transform hover:scale-105"
      onClick={() => setLocation(`/player?video=${encodeURIComponent(video.path)}`)}
    >
      <CardContent className="p-0">
        <div className="relative aspect-video bg-muted">
          {video.poster ? (
            <img
              src={video.poster}
              alt={video.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Film className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          {video.rating && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/75 px-2 py-1 text-xs text-white">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {video.rating}
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold leading-none tracking-tight">
            {video.title}
          </h3>
          {video.year && (
            <p className="text-sm text-muted-foreground">
              {video.year} • {video.genre}
            </p>
          )}
          {video.plot && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {video.plot}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {video.size}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}