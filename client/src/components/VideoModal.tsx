import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VideoModal = ({ isOpen, onClose }: VideoModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[80vh] p-0 overflow-hidden bg-black [&>button]:hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Prospectly Demo Video</DialogTitle>
        </DialogHeader>

        <div className="relative w-full aspect-video bg-black">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Demo Video */}
          <div className="w-full h-full flex items-center justify-center">
            <iframe
              src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&modestbranding=1"
              title="Prospectly Platform Demo"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Fallback for when iframe doesn't load */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-600/20 backdrop-blur-sm">
            <div className="text-center text-white p-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
                <div className="w-0 h-0 border-l-[12px] border-l-white border-y-[8px] border-y-transparent ml-1"></div>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Prospectly Platform Demo
              </h3>
              <p className="text-white/80 mb-4">
                See how Prospectly transforms your sales process with AI-powered
                prospecting
              </p>
              <div className="space-y-2 text-sm text-white/70">
                <p>• Multi-channel outreach AI automation</p>
                <p>• AI-powered lead qualification</p>
                <p>• Real-time analytics and reporting</p>
                <p>• Seamless CRM integration</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoModal;
