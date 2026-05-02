"use client";

import { useEffect } from "react";
import { getSocket } from "../lib/socket";

export function useSocket(event, handler) {
  useEffect(() => {
    if (!event || !handler) return undefined;

    const socket = getSocket();
    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [event, handler]);

  return getSocket();
}
