import { useEffect, useRef } from 'react';

export interface QueueEventPayload {
  type?: string;
  action?: string;
  site_id?: string;
}

export function useQueueEvents(handler: (payload: QueueEventPayload) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const source = new EventSource('/api/queue/events');
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as QueueEventPayload;
        if (payload.type && payload.type !== 'ping') {
          handlerRef.current(payload);
        }
      } catch {
        return;
      }
    };
    return () => source.close();
  }, []);
}
