import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type Video } from "@shared/schema";
import { Link } from "wouter";

export function VideoList() {
  const { data: videos, isLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <Skeleton className="h-[200px]" />
            <CardContent className="p-4">
              <Skeleton className="h-4 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos?.map((video) => (
        <Link key={video.id} href={`/player/${video.id}`}>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <div className="aspect-video">
              <img 
                src={video.thumbnail} 
                alt={video.title}
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-1">{video.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {video.description}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
