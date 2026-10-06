// Loads the user's tasks and reminders once and gives pages helpers to keep the lists in sync
// after a task is edited, completed, or deleted (so no full reload is needed).
import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { getErrorMessage } from '../api/axios';
import { useLanguage } from '../context/LanguageContext';

export default function useTasks() {
  const { t } = useLanguage();
  const [actions, setActions] = useState([]);
  const [reminderList, setReminderList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [actionsRes, remindersRes] = await Promise.all([api.get('/actions'), api.get('/reminders')]);
      setActions(actionsRes.data.actions);
      setReminderList(remindersRes.data.reminders);
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const replaceAction = useCallback((updated) => {
    setActions((current) => current.map((a) => (a._id === updated._id ? updated : a)));
  }, []);

  const removeAction = useCallback((id) => {
    setActions((current) => current.filter((a) => a._id !== id));
    setReminderList((current) => current.filter((r) => r.actionId !== id));
  }, []);

  // Pass a reminder to set/replace it, or null with the actionId to clear it.
  const changeReminder = useCallback((actionId, reminder) => {
    setReminderList((current) => {
      const others = current.filter((r) => r.actionId !== actionId);
      return reminder ? [...others, reminder] : others;
    });
  }, []);

  const reminders = useMemo(() => {
    const map = {};
    reminderList.forEach((r) => {
      map[r.actionId] = r;
    });
    return map;
  }, [reminderList]);

  return { actions, reminders, loading, error, reload: load, replaceAction, removeAction, changeReminder };
}
