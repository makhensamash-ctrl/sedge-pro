import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

type VideoModalProps = {
  videoId: string | null;
  title?: string;
  onClose: () => void;
};

const VideoModal = ({ videoId, title, onClose }: VideoModalProps) => {
  const open = Boolean(videoId);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 border-0 bg-black overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>{title ?? "Video player"}</DialogTitle>
        </VisuallyHidden>
        {videoId && (
          <div className="aspect-video w-full">
            <iframe
              key={videoId}
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
              title={title ?? "YouTube video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VideoModal;
