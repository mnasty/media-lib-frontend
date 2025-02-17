import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle, PauseCircle, Volume2, VolumeX } from "lucide-react";
import { type Video } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface VideoPlayerProps {
  video: Video;
}

export function VideoPlayer({ video }: VideoPlayerProps) {
  console.log("VideoPlayer rendering with video:", video);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullPath, setFullPath] = useState<string | null>(null);

  const { data: config, isLoading: configLoading, error: configError } = useQuery<{ sambaSharePath: string }>({
    queryKey: ['sambaConfig'],
    queryFn: async () => {
      console.log("Fetching config...");
      const response = await fetch('/api/config');
      const data = await response.json();
      console.log("Config response:", data);
      if (!response.ok) throw new Error('Could not fetch config');
      return data;
    },
  });

  useEffect(() => {
    console.log("First useEffect - Config:", config, "Video:", video);
    if (config && config.sambaSharePath && video) {
      const newPath = `/media/${video.path}`;
      console.log("Setting fullPath to:", newPath);
      setFullPath(newPath);
    }
  }, [config, video]);

  useEffect(() => {
    console.log("Second useEffect - fullPath:", fullPath);
    if (videoRef.current && fullPath) {
      console.log("Setting video src to:", fullPath);
      videoRef.current.src = fullPath;
      videoRef.current.load();

      const handleError = (e: Event) => {
        console.error("Video error event:", e);
        setError("Error loading video. Check console for details.");
      };

      const handleLoadStart = () => {
        console.log("Video load started");
      };

      const handleLoadedData = () => {
        console.log("Video loaded successfully");
      };

      videoRef.current.addEventListener('error', handleError);
      videoRef.current.addEventListener('loadstart', handleLoadStart);
      videoRef.current.addEventListener('loadeddata', handleLoadedData);
      
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('error', handleError);
          videoRef.current.removeEventListener('loadstart', handleLoadStart);
          videoRef.current.removeEventListener('loadeddata', handleLoadedData);
        }
      };
    }
  }, [fullPath]);

  console.log("Before render - configLoading:", configLoading, "error:", error);

  if (configLoading) {
    console.log("Rendering loading state");
    return <div>Loading configuration...</div>;
  }

  if (configError) {
    console.log("Rendering config error:", configError);
    return <div>Error loading config: {configError.message}</div>;
  }

  if (error) {
    console.log("Rendering error state:", error);
    return <div>{error}</div>;
  }

  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  return (
    <Card className="w-full overflow-hidden">
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          controls={false}
        />
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="text-white hover:bg-white/20"
            >
              {playing ? (
                <PauseCircle className="h-6 w-6" />
              ) : (
                <PlayCircle className="h-6 w-6" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-white hover:bg-white/20"
            >
              {muted ? (
                <VolumeX className="h-6 w-6" />
              ) : (
                <Volume2 className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-2">{video.title}</h2>
      </div>
    </Card>
  );
}