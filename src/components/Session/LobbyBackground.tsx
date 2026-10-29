import { useEffect, useRef } from "react";

function LobbyBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video?.pause();
      return;
    }

    let frame = 0;
    const softenLoop = () => {
      if (video && Number.isFinite(video.duration) && video.duration > 0) {
        const fade = 0.35;
        const opacity = Math.min(
          1,
          video.currentTime / fade,
          (video.duration - video.currentTime) / fade,
        );
        video.style.opacity = String(Math.max(0, opacity));
      }
      frame = window.requestAnimationFrame(softenLoop);
    };
    frame = window.requestAnimationFrame(softenLoop);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <video
      ref={videoRef}
      className="wait-background"
      src="/session-waiting.webm"
      autoPlay
      muted
      loop
      playsInline
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}

export default LobbyBackground;
