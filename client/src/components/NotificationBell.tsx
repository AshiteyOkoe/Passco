import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, Bell, BellOff, Clock, FileText, Loader, Megaphone, X,
  Swords, Check, Ban, Trophy, PlayCircle, Medal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAdminCommandCenter, getAnnouncements, getMyNotifications, markAllNotificationsRead } from '../services/api';
import type { AdminCommandCenter, Announcement, UserNotification } from '../types';
import { useModalA11y } from '../hooks/useModalA11y';
import { useMediaQuery } from '../hooks/useMediaQuery';

export default function NotificationBell() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [open, setOpen] = useState(false);
  const [cmd, setCmd] = useState<AdminCommandCenter | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [notifications, setNotifications] = useState<UserNotification[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const readKey = `passco:readAnnouncements:${user?.id ?? 'guest'}`;

  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(readKey);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    setReadIds(() => {
      try {
        const raw = localStorage.getItem(readKey);
        return raw ? (JSON.parse(raw) as string[]) : [];
      } catch {
        return [];
      }
    });
  }, [readKey]);

  const isDesktop = useMediaQuery('(min-width: 640px)');
  const close = () => setOpen(false);

  const { dialogRef } = useModalA11y(open && !isDesktop, { onClose: close });

  useEffect(() => {
    let active = true;
    getAnnouncements()
      .then((r) => {
        if (active) setAnnouncements(r.announcements.slice(0, 3));
      })
      .catch(console.error);
    if (isAdmin) {
      getAdminCommandCenter(7).then(setCmd).catch(console.error);
    } else {
      getMyNotifications()
        .then((r) => {
          if (active) setNotifications(r.notifications);
        })
        .catch(console.error);
    }
    return () => {
      active = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) return;
    const interval = window.setInterval(() => {
      getMyNotifications()
        .then((r) => setNotifications(r.notifications))
        .catch(console.error);
    }, 30000);
    return () => window.clearInterval(interval);
  }, [isAdmin]);

  useEffect(() => {
    if (!open || isAdmin) return;
    if (notifications && notifications.some((n) => !n.isRead)) {
      markAllNotificationsRead().catch(console.error);
      setNotifications((prev) => (prev || []).map((n) => ({ ...n, isRead: true })));
    }
  }, [open, notifications, isAdmin]);

  useEffect(() => {
    if (!open || isAdmin) return;
    if (announcements && announcements.length > 0) {
      const ids = announcements.map((a) => a.id);
      setReadIds((prev) => {
        const next = Array.from(new Set([...prev, ...ids]));
        try {
          localStorage.setItem(readKey, JSON.stringify(next));
        } catch {
          /* storage unavailable */
        }
        return next;
      });
    }
  }, [open, announcements, isAdmin, readKey]);

  useEffect(() => {
    if (!open || !isDesktop) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, isDesktop, close]);

  const pendingCount = cmd
    ? cmd.kpis.pendingQuestions + cmd.pipeline.processing + cmd.pipeline.queued + cmd.pipeline.failed
    : 0;

  const unreadCount = isAdmin
    ? pendingCount
    : (announcements?.filter((a) => !readIds.includes(a.id)).length ?? 0) + (notifications?.filter((n) => !n.isRead).length ?? 0);
  const count = unreadCount;
  const badge = count > 9 ? '9+' : String(count);
  const liveMessage =
    announcements === null && !isAdmin
      ? ''
      : count > 0
        ? `${count} notification${count === 1 ? '' : 's'}`
        : 'No new notifications';

  const renderAdminKpis = () => {
    const rows = [
      {
        to: '/admin/jhs-questions',
        label: 'Questions pending review',
        value: cmd ? cmd.kpis.pendingQuestions : 0,
        icon: FileText,
        chip: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
      },
      {
        to: '/admin/bulk-upload',
        label: 'Files processing / queued',
        value: cmd ? cmd.pipeline.processing + cmd.pipeline.queued : 0,
        icon: Loader,
        chip: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
      },
      {
        to: '/admin/bulk-upload',
        label: 'Failed processing',
        value: cmd ? cmd.pipeline.failed : 0,
        icon: AlertTriangle,
        chip: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
      },
    ];

    return (
      <>
        {rows.map((row) => (
          <Link
            key={row.label}
            to={row.to}
            onClick={close}
            className="group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition group-hover:bg-white dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700">
                <row.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="truncate text-sm text-slate-600 dark:text-slate-300">{row.label}</span>
            </span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${row.chip}`}>
              {row.value}
            </span>
          </Link>
        ))}
      </>
    );
  };

  const NOTIF_META: Record<string, { icon: typeof Swords; className: string; bg: string }> = {
    competition_invite: { icon: Swords, className: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
    competition_accepted: { icon: Check, className: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    competition_declined: { icon: Ban, className: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
    competition_started: { icon: PlayCircle, className: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    competition_finished: { icon: Trophy, className: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    competition_cancelled: { icon: X, className: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
  };

  const renderNotifications = () => {
    if (!notifications || notifications.length === 0) return null;
    return (
      <>
        <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
        <p className="flex items-center gap-1.5 px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <Swords className="h-3.5 w-3.5" aria-hidden="true" /> Competitions
        </p>
        {notifications.slice(0, 8).map((n) => {
          const meta = NOTIF_META[n.type] || NOTIF_META.competition_finished;
          const Icon = meta.icon;
          const body = (
            <span className="flex min-w-0 items-start gap-3">
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                <Icon className={`h-4 w-4 ${meta.className}`} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-800 dark:text-white">{n.title}</span>
                <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500 dark:text-slate-400">{n.body}</span>
                <span className="mt-1 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {new Date(n.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              </span>
              {!n.isRead && <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}
            </span>
          );
          return n.entityId ? (
            <Link key={n.id} to={`/competitions/${n.entityId}`} onClick={close} className="block rounded-xl px-3 py-2 transition hover:bg-slate-50 dark:hover:bg-slate-800">
              {body}
            </Link>
          ) : (
            <div key={n.id} className="block rounded-xl px-3 py-2">
              {body}
            </div>
          );
        })}
      </>
    );
  };

  const renderAnnouncements = () => {
    if (announcements === null || announcements.length === 0) return null;

    return (
      <>
        <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
        <p className="flex items-center gap-1.5 px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <Megaphone className="h-3.5 w-3.5" aria-hidden="true" /> Announcements
        </p>
        {announcements.map((a) => {
          const body = (
            <>
              <p className="truncate text-sm font-medium text-slate-800 dark:text-white">{a.title}</p>
              {a.body && (
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{a.body}</p>
              )}
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </p>
            </>
          );
          return isAdmin ? (
            <Link
              key={a.id}
              to="/admin/subscriptions"
              onClick={close}
              className="block rounded-xl px-3 py-2 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {body}
            </Link>
          ) : (
            <div key={a.id} className="block rounded-xl px-3 py-2">
              {body}
            </div>
          );
        })}
      </>
    );
  };

  const renderBody = () => (
    <>
      {isAdmin && renderAdminKpis()}
      {!isAdmin && announcements === null && (
        <p className="px-3 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
          Loading notifications...
        </p>
      )}
      {!isAdmin && notifications !== null && notifications.length === 0 && announcements !== null && announcements.length === 0 && (
        <div className="flex flex-col items-center px-4 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <BellOff className="h-6 w-6 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">You're all caught up</p>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">New announcements will show up here.</p>
        </div>
      )}
      {renderNotifications()}
      {renderAnnouncements()}
    </>
  );

  const countChip = count > 0 && (
    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      {count} new
    </span>
  );

  const sheetHeader = (
    <div className="flex items-center justify-between border-b border-slate-100 px-5 pb-3 pt-1 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <p id="notif-sheet-title" className="text-base font-semibold text-slate-900 dark:text-white">
          Notifications
        </p>
        {countChip}
      </div>
      <button
        type="button"
        onClick={close}
        aria-label="Close notifications"
        className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );

  const popoverHeader = (
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</p>
      {countChip}
    </div>
  );

  const footer = isAdmin && (
    <div className="border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
      <p className="text-center text-xs text-slate-400 dark:text-slate-500">Live from PASSCO Command Center</p>
    </div>
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={count > 0 ? `Notifications, ${count} new` : 'Notifications'}
        aria-expanded={open}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white"
          >
            {badge}
          </span>
        )}
      </button>

      <span role="status" aria-live="polite" className="sr-only">
        {liveMessage}
      </span>

      {open && !isDesktop &&
        createPortal(
          <div className="fixed inset-0 z-[80] sm:hidden">
            <div
              onClick={close}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              aria-hidden="true"
            />
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="notif-sheet-title"
              className="animate-sheet-up absolute inset-x-0 bottom-0 flex max-h-[78vh] flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl dark:bg-slate-900"
            >
              <div className="flex justify-center pb-1 pt-2.5">
                <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
              {sheetHeader}
              <div className="flex-1 overflow-y-auto overscroll-contain p-2">{renderBody()}</div>
              {footer}
            </div>
          </div>,
          document.body
        )}

      <AnimatePresence>
        {open && isDesktop && (
          <motion.div
            key="notif-popover"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            {popoverHeader}
            <div className="max-h-80 overflow-y-auto overscroll-contain p-2">{renderBody()}</div>
            {footer}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}