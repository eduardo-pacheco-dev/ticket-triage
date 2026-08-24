import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeaderGlobalAction } from '@carbon/react';
import { Notification as BellIcon } from '@carbon/icons-react';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../lib/api';
import type { AppNotification } from '../lib/types';
import { useQueueEvents } from '../hooks/useQueueEvents';
import { formatEntryTime } from '../lib/duration';

export function NotificationsMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    fetchNotifications()
      .then((data) => {
        setItems(data.items);
        setUnreadCount(data.unreadCount);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useQueueEvents((payload) => {
    if (payload.type !== 'notification') return;
    void refresh();
  });

  function handleItemClick(item: AppNotification) {
    if (!item.read) {
      markNotificationRead(item.id)
        .then(refresh)
        .catch(() => {});
    }
    setOpen(false);
    if (item.protocol) {
      const archived = item.status === 'approved' || item.status === 'rejected';
      navigate(archived ? '/admin/arquivados' : '/admin');
    }
  }

  function handleMarkAll() {
    markAllNotificationsRead()
      .then(refresh)
      .catch(() => {});
  }

  return (
    <div className="notif-root" ref={rootRef}>
      <HeaderGlobalAction
        aria-label="Notificações"
        aria-expanded={open}
        tooltipAlignment="start"
        isActive={open}
        onClick={() => setOpen((value) => !value)}
      >
        <BellIcon size={20} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </HeaderGlobalAction>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notificações">
          <div className="notif-panel-header">
            <span>Notificações</span>
            {unreadCount > 0 && (
              <button type="button" className="notif-mark-all" onClick={handleMarkAll}>
                Marcar todas como lidas
              </button>
            )}
          </div>
          <ul className="notif-list">
            {items.length === 0 ? (
              <li className="notif-empty">Sem notificações por aqui.</li>
            ) : (
              items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`notif-item${item.read ? '' : ' notif-item-unread'}`}
                    onClick={() => handleItemClick(item)}
                  >
                    <span className="notif-item-title">{item.title}</span>
                    <span className="notif-item-body">{item.body}</span>
                    <span className="notif-item-time">
                      {formatEntryTime(item.created_at)}
                      {!item.read && <i className="notif-dot" aria-hidden="true" />}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
