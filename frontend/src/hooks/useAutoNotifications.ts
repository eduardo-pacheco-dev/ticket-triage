import { useEffect } from 'react';
import {
  getNotificationPermission,
  requestNotificationPermission,
} from '../lib/notifications';

export function useAutoNotifications() {
  useEffect(() => {
    if (getNotificationPermission() !== 'default') return;

    let cancelled = false;
    let detachClick: (() => void) | undefined;

    requestNotificationPermission().then((result) => {
      if (cancelled || result !== 'default') return;
      const onClick = () => {
        detachClick?.();
        void requestNotificationPermission();
      };
      document.addEventListener('click', onClick, { once: true });
      detachClick = () => document.removeEventListener('click', onClick);
    });

    return () => {
      cancelled = true;
      detachClick?.();
    };
  }, []);
}
