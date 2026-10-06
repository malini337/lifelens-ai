// Reminders: polls the saved reminders while LifeLens is open and, when one is due, shows a browser
// notification (if the user allowed it) AND an in-app alert. Nothing is sent when the tab is closed -
// a server-side channel (email/push) can be added later without changing this hook's callers.
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';

const CHECK_EVERY_MS = 30000;

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

// Returns 'granted' | 'denied' | 'default' | 'unsupported'.
export function notificationStatus() {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

// Must be called from a user click (browsers block permission prompts otherwise).
export async function requestNotificationPermission() {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch (err) {
    return Notification.permission;
  }
}

export default function useReminders({ enabled, browserAllowed = true }) {
  const [dueReminders, setDueReminders] = useState([]);
  const handled = useRef(new Set());

  const check = useCallback(async () => {
    try {
      const res = await api.get('/reminders');
      const now = Date.now();
      const due = res.data.reminders.filter(
        (r) => r.enabled && !r.notifiedAt && new Date(r.reminderDate).getTime() <= now && !handled.current.has(r._id)
      );

      for (const reminder of due) {
        handled.current.add(reminder._id);
        if (browserAllowed && notificationStatus() === 'granted') {
          try {
            new Notification('LifeLens AI', { body: reminder.title });
          } catch (err) {
            // Some mobile browsers only allow service-worker notifications; the in-app alert still shows.
          }
        }
        // Mark as shown so it does not repeat.
        api.patch(`/reminders/${reminder._id}`, { notified: true }).catch(() => handled.current.delete(reminder._id));
      }

      if (due.length > 0) setDueReminders((current) => [...current, ...due]);
    } catch (err) {
      // Reminder checks are best-effort; stay quiet if the network is down.
    }
  }, [browserAllowed]);

  useEffect(() => {
    if (!enabled) {
      setDueReminders([]);
      handled.current = new Set();
      return undefined;
    }
    check();
    const timer = setInterval(check, CHECK_EVERY_MS);
    return () => clearInterval(timer);
  }, [enabled, check]);

  const dismiss = useCallback((id) => {
    setDueReminders((current) => current.filter((r) => r._id !== id));
  }, []);

  return { dueReminders, dismiss };
}
