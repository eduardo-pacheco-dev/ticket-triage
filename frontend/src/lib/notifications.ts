export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  return isNotificationSupported() ? Notification.permission : 'unsupported';
}

export async function requestNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

interface DesktopNotificationOptions extends NotificationOptions {
  onclick?: (this: Notification, ev: Event) => unknown;
}

export function showDesktopNotification(title: string, body?: string): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  const options = {
    body,
    tag: 'triagem-docs',
  } as DesktopNotificationOptions;

  const notification = new Notification(title, options);
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}
