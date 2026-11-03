import { useEffect, useRef, useState } from 'react';
import { HEARTBEAT_SECONDS } from '@learnhub/shared';

// LLD 5, "VideoPlayer component": wraps the YouTube or Vimeo player API, counts real playback (seeking adds nothing)
// and reports it every 10 seconds while playing, and once on pause. The server decides the credit; this only reports.

type YTPlayer = { getCurrentTime(): number; getPlayerState(): number; destroy(): void };
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    o: {
      videoId: string;
      width: string;
      height: string;
      playerVars: Record<string, number>;
      events: { onStateChange: (e: { data: number }) => void };
    },
  ) => YTPlayer;
};
type VimeoPlayer = {
  on(event: string, cb: (d: { seconds: number }) => void): void;
  destroy(): Promise<void>;
};
type VimeoNamespace = {
  Player: new (el: HTMLElement, o: { url: string; responsive: boolean }) => VimeoPlayer;
};
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
    Vimeo?: VimeoNamespace;
  }
}

const scripts = new Map<string, Promise<void>>();
function loadScript(src: string, ready?: (done: () => void) => void): Promise<void> {
  if (!scripts.has(src)) {
    scripts.set(
      src,
      new Promise<void>((resolve, reject) => {
        if (ready) ready(resolve);
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        if (!ready) s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Could not load ${src}`));
        document.head.appendChild(s);
      }),
    );
  }
  return scripts.get(src)!;
}
const loadYouTube = () =>
  window.YT?.Player
    ? Promise.resolve()
    : loadScript('https://www.youtube.com/iframe_api', (done) => {
        const previous = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          previous?.();
          done();
        };
      });
const loadVimeo = () =>
  window.Vimeo?.Player ? Promise.resolve() : loadScript('https://player.vimeo.com/api/player.js');

export const youtubeId = (url: string) =>
  url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/)?.[1] ?? null;
const isVimeo = (url: string) =>
  /(^|\.)vimeo\.com$/i.test(
    (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return '';
      }
    })(),
  );

type Props = { url: string; onHeartbeat: (positionSec: number, watchedSec: number) => void };

export function VideoPlayer({ url, onHeartbeat }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const report = useRef(onHeartbeat);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    report.current = onHeartbeat;
  });

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    let watched = 0; // real playback since the last heartbeat
    let last: number | null = null;
    let position = 0;
    let ticks = 0;
    let playing = false;
    let cancelled = false;
    let timer: number | undefined;
    let cleanup: (() => void) | undefined;
    setFailed(false);
    const fail = () => {
      if (!cancelled) setFailed(true);
    };

    // Called with the player time about once a second. Only small forward steps count, so a seek adds nothing;
    // 2.5 seconds per tick allows 2x playback.
    const feed = (time: number) => {
      if (last !== null) {
        const d = time - last;
        if (d > 0 && d <= 2.5) watched += d;
      }
      last = time;
      position = time;
    };
    const flush = () => {
      if (watched >= 0.5) report.current(Math.floor(position), Math.round(watched * 10) / 10);
      watched = 0;
      ticks = 0;
    };
    const tick = (time: number | null) => {
      if (time !== null) feed(time);
      if (++ticks >= HEARTBEAT_SECONDS) flush();
    };

    const id = youtubeId(url);
    if (id) {
      void loadYouTube()
        .then(() => {
          if (cancelled || !window.YT) return;
          const holder = document.createElement('div');
          el.replaceChildren(holder);
          const player = new window.YT.Player(holder, {
            videoId: id,
            width: '100%',
            height: '100%',
            playerVars: { rel: 0, modestbranding: 1 },
            events: {
              onStateChange: (e) => {
                playing = e.data === 1;
                if (!playing) {
                  last = null;
                  flush();
                }
              },
            },
          });
          timer = window.setInterval(() => {
            if (playing) tick(player.getCurrentTime());
          }, 1000);
          cleanup = () => player.destroy();
        })
        .catch(fail);
    } else if (isVimeo(url)) {
      void loadVimeo()
        .then(() => {
          if (cancelled || !window.Vimeo) return;
          el.replaceChildren();
          const player = new window.Vimeo.Player(el, { url, responsive: true });
          let latest: number | null = null;
          player.on('timeupdate', (d) => {
            latest = d.seconds;
          });
          player.on('play', () => {
            playing = true;
          });
          const stop = () => {
            playing = false;
            last = null;
            flush();
          };
          player.on('pause', stop);
          player.on('ended', stop);
          timer = window.setInterval(() => {
            if (playing) tick(latest);
          }, 1000);
          cleanup = () => {
            void player.destroy();
          };
        })
        .catch(fail);
    }
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      flush();
      cleanup?.();
    };
  }, [url]);

  if (failed) {
    return (
      <div className="grid aspect-video place-items-center rounded-[13px] bg-nv p-6 text-center text-xs text-[#c9c8e0]">
        The video player could not load. Check your internet connection and open the topic again.
      </div>
    );
  }
  if (!youtubeId(url) && !isVimeo(url)) {
    return (
      <div className="grid aspect-video place-items-center rounded-[13px] bg-nv p-6 text-center text-xs text-[#c9c8e0]">
        This video link cannot be played here. Ask your instructor for a YouTube or Vimeo link.
      </div>
    );
  }
  return (
    <div
      ref={mount}
      className="aspect-video w-full overflow-hidden rounded-[13px] bg-nv [&_iframe]:h-full [&_iframe]:w-full"
    />
  );
}
