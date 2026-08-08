"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { useKodikPlayer } from "./useKodikPlayer";
import type { KodikPlayerHandle, KodikPlayerProps } from "./kodik-player.types";

export const KodikPlayer = forwardRef<KodikPlayerHandle, KodikPlayerProps>(
  function KodikPlayer(
    { src, title = "Kodik player", className, ...callbacks },
    ref,
  ) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const controller = useKodikPlayer({ iframeRef, src, ...callbacks });

    useImperativeHandle(
      ref,
      () => ({
        play: controller.play,
        pause: controller.pause,
        seek: controller.seek,
        setVolume: controller.setVolume,
        mute: controller.mute,
        unmute: controller.unmute,
        changeEpisode: controller.changeEpisode,
        setSpeed: controller.setSpeed,
        enterPip: controller.enterPip,
        exitPip: controller.exitPip,
        getTime: controller.getTime,
      }),
      [controller],
    );

    return (
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        className={className}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
        referrerPolicy="strict-origin-when-cross-origin"
        style={{ width: "100%", height: "100%", border: 0 }}
      />
    );
  },
);
