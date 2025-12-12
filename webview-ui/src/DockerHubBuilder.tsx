import { useState, useEffect } from "react";
import {
  Upload,
  CheckCircle,
  Loader2,
  User,
  RefreshCw,
  Image,
} from "lucide-react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";

interface LocalImage {
  repository: string;
  tag: string;
  imageId: string;
  created: string;
  size: string;
}

function DockerHubBuilder() {
  const [currentUser] = useState("docker-user"); // always logged in
  const [localImages, setLocalImages] = useState<LocalImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<LocalImage | null>(null);
  const [customTag, setCustomTag] = useState("latest");
  const [pushLogs, setPushLogs] = useState<string[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

  useEffect(() => {
    loadLocalImages();
  }, []);

  const loadLocalImages = () => {
    setIsLoadingImages(true);
    setPushLogs([]);

    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(msg);
      setPushLogs([...logs]);
    };

    addLog(`[${new Date().toLocaleTimeString()}] Loading local images...`);

    setTimeout(() => {
      const mock: LocalImage[] = [
        { repository: "node-app", tag: "latest", imageId: "abc123", created: "2 days ago", size: "145MB" },
        { repository: "nginx", tag: "alpine", imageId: "def456", created: "1 day ago", size: "23MB" },
        { repository: "python-api", tag: "latest", imageId: "ghi789", created: "5 hours ago", size: "387MB" },
      ];

      setLocalImages(mock);

      addLog(`[${new Date().toLocaleTimeString()}] ✓ Found ${mock.length} images`);
      setIsLoadingImages(false);
    }, 800);
  };

  const handlePush = () => {
    if (!selectedImage) {
      toast.error("Please select an image first.");
      return;
    }

    setIsPushing(true);
    setPushLogs([]);

    const full = `${currentUser}/${selectedImage.repository}:${customTag}`;
    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(msg);
      setPushLogs([...logs]);
    };

    setTimeout(() => addLog(`[${new Date().toLocaleTimeString()}] Tagging image as ${full}`), 400);
    setTimeout(() => addLog(`[${new Date().toLocaleTimeString()}] Uploading layers...`), 900);
    setTimeout(() => {
      addLog(`[${new Date().toLocaleTimeString()}] ✓ Successfully pushed ${full}`);
      toast.success("Image pushed successfully!");
      setIsPushing(false);
    }, 1800);
  };

  return (
    <div className="flex h-full">
      {/* LEFT PANEL */}
      <div className="w-[400px] p-6 border-r border-[#3e3e42] overflow-y-auto">

        {/* Logged In Box */}
        <div className="p-4 bg-green-900/20 border border-green-900/50 rounded mb-4">
          <div className="flex items-center gap-2 text-green-500 mb-2">
            <CheckCircle size={18} />
            <span className="text-sm">Logged in to DockerHub</span>
          </div>

          <div className="flex items-center gap-2 text-[#cccccc] text-sm">
            <User size={14} />
            <span>{currentUser}</span>
          </div>
        </div>

        {/* Local Images */}
        <div className="border border-[#3e3e42] rounded">
          <div className="flex items-center justify-between p-3 bg-[#2d2d2d] border-b border-[#3e3e42]">
            <div className="flex items-center gap-2">
              <Image size={16} className="text-[#cccccc]" />
              <span className="text-sm text-[#cccccc]">Local Images</span>
            </div>

            <Button
              onClick={loadLocalImages}
              disabled={isLoadingImages}
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[#cccccc] hover:bg-[#3c3c3c]"
            >
              <RefreshCw size={14} className={isLoadingImages ? "animate-spin" : ""} />
            </Button>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {localImages.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#999999]">
                <Loader2 size={22} className="mx-auto animate-spin mb-2" />
                Loading images...
              </div>
            ) : (
              <div className="divide-y divide-[#3e3e42]">
                {localImages.map((img, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setSelectedImage(img);
                      setCustomTag(img.tag);
                    }}
                    className={`p-3 cursor-pointer ${
                      selectedImage?.imageId === img.imageId
                        ? "bg-[#094771] border-l-2 border-[#0e639c]"
                        : "hover:bg-[#2a2d2e]"
                    }`}
                  >
                    <div className="text-sm text-[#cccccc] font-mono truncate">
                      {img.repository}:{img.tag}
                    </div>
                    <div className="text-xs text-[#999999]">ID: {img.imageId}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected Image Info */}
        {selectedImage && (
          <div className="p-4 bg-[#2d2d2d] border border-[#3e3e42] rounded mt-4">
            <p className="text-xs text-[#999999] mb-2">Selected Image:</p>

            <p className="text-sm text-[#cccccc] font-mono mb-3">
              {selectedImage.repository}:{selectedImage.tag}
            </p>

            <label className="block text-xs text-[#cccccc] mb-1">
              Custom Tag
            </label>

            <Input
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              className="bg-[#3c3c3c] border-[#3e3e42] text-white text-sm"
            />
          </div>
        )}

        {/* Push Button */}
        <Button
          onClick={handlePush}
          disabled={isPushing || !selectedImage}
          className="w-full bg-[#0e639c] hover:bg-[#1177bb] text-white mt-4"
        >
          {isPushing ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Pushing...
            </>
          ) : (
            <>
              <Upload size={16} className="mr-2" />
              Push to DockerHub
            </>
          )}
        </Button>
      </div>

      {/* RIGHT PANEL (Logs) */}
      <div className="flex-1 p-6 bg-[#1e1e1e]">
        <div className="flex items-center gap-2 mb-3">
          <Upload size={18} className="text-[#cccccc]" />
          <h3 className="text-sm text-[#cccccc]">DockerHub Output</h3>
        </div>

        <div className="bg-[#0c0c0c] border border-[#3e3e42] rounded p-4 h-[calc(100%-3rem)] overflow-auto font-mono text-xs">
          {pushLogs.length === 0 ? (
            <p className="text-[#999999]">Push logs will appear here...</p>
          ) : (
            pushLogs.map((log, i) => (
              <div key={i} className="text-[#cccccc]">{log}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default DockerHubBuilder;