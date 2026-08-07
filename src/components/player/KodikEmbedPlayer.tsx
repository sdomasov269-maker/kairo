"use client";

export function KodikEmbedPlayer({ embedUrl, title }: { embedUrl: string; title: string }) {
  return (
    <div className="kairo-player kodik-embed-player">
      <iframe
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
        src={embedUrl}
        title={title}
      />
    </div>
  );
}
