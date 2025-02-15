import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Player() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const videoPath = new URLSearchParams(location.split("?")[1]).get("video");

  useEffect(() => {
    if (!videoPath) {
      setLocation("/");
    }
  }, [videoPath, setLocation]);

  if (!videoPath) return null;

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-4">
        <Button
          variant="ghost"
          className="mb-4 text-white"
          onClick={() => setLocation("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
      <div className="container mx-auto aspect-video">
        <video
          ref={videoRef}
          className="h-full w-full"
          controls
          autoPlay
          src={`/api/videos/stream/${videoPath}`}
        />
      </div>
    </div>
  );
}
