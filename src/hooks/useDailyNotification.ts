import { useState, useEffect, useCallback, useRef } from 'react';
import { getDay, type Verse, type WatchPeriod } from '@/data/lectionary';
import { type LanguageCode } from '@/data/languages';
import { BibleService } from '@/services/BibleService';

/**
 * FIXED: this used to read the verse text from lectionaryTranslations[day % 7]
 * but the reference from getTodaysVerse() (day % lectionary.length). Those
 * agreed only while both tables were 7 days long. With a 365-day plan the
 * notification would have shown one verse's reference beside another verse's
 * text.
 *
 * Text now comes from BibleService in the reader's own language, so there is
 * no second table to keep in sync and every language is covered.
 */
async function getNotificationVerse(
  watch: WatchPeriod,
  language: LanguageCode,
): Promise<Verse> {
  const verse = getDay()[watch];

  if (language === 'kjv') return verse;

  try {
    const result = await BibleService.getVerse(
      verse.book,
      verse.chapter,
      verse.verseStart,
      verse.verseEnd,
      language,
    );
    if (result.source !== 'missing' && result.text) {
      return { ...verse, text: result.text, translation: language.toUpperCase() };
    }
  } catch {
    /* fall through to bundled English */
  }
  return verse;
}

interface NotificationTimes {
  morning: number; // hour in 24h
  afternoon: number;
  evening: number;
}

export function useDailyNotification(
  language: LanguageCode,
  times: NotificationTimes = { morning: 6, afternoon: 12, evening: 18 },
) {
  const [isEnabled, setIsEnabled] = useState(false);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const notify = useCallback(
    async (watch: WatchPeriod) => {
      if (Notification.permission !== 'granted') return;
      const verse = await getNotificationVerse(watch, language);
      new Notification(`📖 ${watch.charAt(0).toUpperCase() + watch.slice(1)} Watch`, {
        body: `${verse.reference}: ${verse.text}`,
        icon: '/favicon.ico',
      });
    },
    [language],
  );

  const scheduleNotifications = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];

    const now = new Date();
    const watches: Array<{ key: WatchPeriod; hour: number }> = [
      { key: 'morning', hour: times.morning },
      { key: 'afternoon', hour: times.afternoon },
      { key: 'evening', hour: times.evening },
    ];

    watches.forEach(({ key, hour }) => {
      const target = new Date(now);
      target.setHours(hour, 0, 0, 0);
      if (now > target) target.setDate(target.getDate() + 1);

      const timeout = setTimeout(() => {
        void notify(key);
        const interval = setInterval(() => void notify(key), 24 * 60 * 60 * 1000);
        timers.current.push(interval);
      }, target.getTime() - now.getTime());

      timers.current.push(timeout);
    });
  }, [times, notify]);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      setIsEnabled(true);
      scheduleNotifications();
      return true;
    }
    setIsEnabled(false);
    return false;
  }, [scheduleNotifications]);

  const toggleNotification = useCallback(async () => {
    if (isEnabled) {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setIsEnabled(false);
      return;
    }
    if (Notification.permission === 'default') {
      await requestPermission();
    } else if (Notification.permission === 'granted') {
      setIsEnabled(true);
      scheduleNotifications();
    }
  }, [isEnabled, requestPermission, scheduleNotifications]);

  useEffect(() => {
    if (isEnabled) scheduleNotifications();
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [isEnabled, scheduleNotifications]);

  return { isEnabled, requestPermission, toggleNotification };
}
