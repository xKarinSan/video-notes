import { useEffect } from "react";

interface VideoPlayerProps {
    videoFilePath: string;
    videoRef: React.RefObject<HTMLVideoElement | null>;
}

function VideoPlayer({ videoFilePath, videoRef }: VideoPlayerProps) {
    const handleKeyDown = (event: KeyboardEvent) => {
        const target = e.target as HTMLElement | null;
        const isEditable =
            !!target &&
            (target.closest(
                'input, textarea, [contenteditable=""], [contenteditable="true"]'
            ) ||
                (target as HTMLElement).isContentEditable);

        if (isEditable) return;
        
        const STEP = 5;
        if (!videoRef.current) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            event.stopPropagation();
            const video = videoRef.current;
            const current = video.currentTime;

            if (event.key === "ArrowLeft") {
                video.currentTime = Math.max(0, current - STEP);
            } else if (event.key === "ArrowRight") {
                video.currentTime = Math.min(video.duration, current + STEP);
            }
        }
    };

    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown, { capture: true });
        return () => {
            document.removeEventListener("keydown", handleKeyDown, {
                capture: true,
            });
        };
    }, []);
    return (
        <video
            className="rounded-lg border border-base-300 mt-4"
            ref={videoRef}
            controls
        >
            <source src={videoFilePath} type="video/mp4" />
        </video>
    );
}

export default VideoPlayer;
