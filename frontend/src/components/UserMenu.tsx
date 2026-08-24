import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logout as LogoutIcon, Settings } from '@carbon/icons-react';
import { useAuthStore } from '../stores/auth';

function initials(username: string): string {
  const parts = username.trim().split(/\s+/);
  const source = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : username.slice(0, 2);
  return source.toUpperCase();
}

export function UserMenu() {
  const navigate = useNavigate();
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  function handleLogout() {
    setOpen(false);
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="user-root" ref={rootRef}>
      <button
        type="button"
        className={`user-trigger${open ? ' user-trigger-open' : ''}`}
        aria-label="Menu do usuário"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="user-avatar" aria-hidden="true">
          {username ? initials(username) : '?'}
        </span>
        <span className="user-name">{username}</span>
      </button>

      {open && (
        <div className="notif-panel user-panel" role="dialog" aria-label="Menu do usuário">
          <div className="user-panel-header">
            <span className="user-avatar user-avatar-lg" aria-hidden="true">
              {username ? initials(username) : '?'}
            </span>
            <div className="user-panel-id">
              <span className="user-panel-title">{username}</span>
              <span className="user-panel-sub">Conta do painel</span>
            </div>
          </div>
          <button
            type="button"
            className="user-panel-item"
            onClick={() => {
              setOpen(false);
              navigate('/admin/configuracoes');
            }}
          >
            <Settings size={16} />
            Configurações
          </button>
          <button type="button" className="user-panel-item" onClick={handleLogout}>
            <LogoutIcon size={16} />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
