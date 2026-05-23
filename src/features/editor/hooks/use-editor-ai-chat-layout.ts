"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useState,
} from "react";

const aiPanelWidthStorageKey = "syncdown.aiChatPanelWidth";
const defaultAiPanelWidth = 420;
const minAiPanelWidth = 320;

export function useEditorAiChatLayout() {
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiPanelWidth, setAiPanelWidth] = useState(() => readStoredAiPanelWidth());
  const [isNarrowAiLayout, setIsNarrowAiLayout] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 899px)");
    const syncLayout = () => setIsNarrowAiLayout(mediaQuery.matches);

    syncLayout();
    mediaQuery.addEventListener("change", syncLayout);
    return () => mediaQuery.removeEventListener("change", syncLayout);
  }, []);

  function handleAiPanelResizeStart(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const ownerWindow = event.currentTarget.ownerDocument.defaultView ?? window;

    function handlePointerMove(moveEvent: PointerEvent) {
      const nextWidth = clampAiPanelWidth(ownerWindow.innerWidth - moveEvent.clientX);
      setAiPanelWidth(nextWidth);
      ownerWindow.localStorage.setItem(aiPanelWidthStorageKey, String(nextWidth));
    }

    function handlePointerUp() {
      ownerWindow.removeEventListener("pointermove", handlePointerMove);
      ownerWindow.removeEventListener("pointerup", handlePointerUp);
    }

    ownerWindow.addEventListener("pointermove", handlePointerMove);
    ownerWindow.addEventListener("pointerup", handlePointerUp);
  }

  return {
    aiChatOpen,
    aiPanelWidth,
    handleAiPanelResizeStart,
    isNarrowAiLayout,
    setAiChatOpen,
  };
}

function clampAiPanelWidth(width: number) {
  if (typeof window === "undefined") {
    return defaultAiPanelWidth;
  }

  const maxWidth = Math.min(640, window.innerWidth * 0.5);
  return Math.min(Math.max(width, minAiPanelWidth), maxWidth);
}

function readStoredAiPanelWidth() {
  if (typeof window === "undefined") {
    return defaultAiPanelWidth;
  }

  const storedWidth = Number(window.localStorage.getItem(aiPanelWidthStorageKey));
  return Number.isFinite(storedWidth)
    ? clampAiPanelWidth(storedWidth)
    : defaultAiPanelWidth;
}
