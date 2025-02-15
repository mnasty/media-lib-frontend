import { ChevronRight, FolderOpen } from "lucide-react";
import { Button } from "./ui/button";
import { useLocation } from "wouter";

interface NavigationProps {
  currentPath: string;
}

export function Navigation({ currentPath }: NavigationProps) {
  const [, setLocation] = useLocation();

  const pathSegments = currentPath
    .split("/")
    .filter(Boolean)
    .reduce<{ name: string; path: string }[]>((acc, segment, index, arr) => {
      const path = arr.slice(0, index + 1).join("/");
      acc.push({ name: segment, path });
      return acc;
    }, []);

  return (
    <header className="border-b bg-card">
      <div className="container flex h-16 items-center space-x-2 px-4">
        <Button
          variant="ghost"
          className="flex items-center"
          onClick={() => setLocation("/")}
        >
          <FolderOpen className="mr-2 h-4 w-4" />
          Media Library
        </Button>
        {pathSegments.map((segment, index) => (
          <div key={segment.path} className="flex items-center">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Button
              variant="ghost"
              onClick={() => setLocation(`/?path=${encodeURIComponent(segment.path)}`)}
            >
              {segment.name}
            </Button>
          </div>
        ))}
      </div>
    </header>
  );
}
