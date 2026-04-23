import { useEffect, useRef, useState, useCallback } from "react";

interface WSMessage {
  type: string;
  data: unknown;
}

interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: WSMessage) => void;
  reconnectInterval?: number;
}

export function useWebSocket(optionsOrUrl: string | UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const options = typeof optionsOrUrl === 'string' 
    ? { url: optionsOrUrl } 
    : optionsOrUrl;
    
  const { url, onMessage, reconnectInterval = 3000 } = options;
  const onMessageRef = useRef(onMessage);

  // Keep onMessage ref updated without triggering reconnect
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log("WebSocket connected to", url);
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          setLastMessage(message);
          onMessageRef.current?.(message);
        } catch {
          console.error("Failed to parse WS message");
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        reconnectTimer.current = setTimeout(connect, reconnectInterval);
      };
    } catch (err) {
      console.error("WebSocket connection error:", err);
      reconnectTimer.current = setTimeout(connect, reconnectInterval);
    }
  }, [url, reconnectInterval]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { isConnected, lastMessage };
}

