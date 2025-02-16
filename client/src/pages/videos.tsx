import { VideoList } from "@/components/video-list";

export default function Videos() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Video Library</h1>
      <VideoList />
    </div>
  );
}
