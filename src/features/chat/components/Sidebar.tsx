import {
  ChatBubbleLeftRightIcon,
  CpuChipIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  SunIcon,
  MoonIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  TrashIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';

import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

import { useTranslation } from 'react-i18next';
import { maskPhone } from '../../../shared/utils';
import {
  fetchChatConversations,
  deleteChatConversation,
  renameChatConversation,
} from '../../../shared/api/chat';
import LoginErrorModal from '../../auth/components/LoginErrorModal';
import type { ChatConversation } from '../types/chat.types';
import type { UserInfo } from '../../../shared/types/user.types';

type SidebarProps = {
  user?: UserInfo | null;
  onClose?: () => void;
  onOpenUserInfo?: () => void;
  onSelectConversation?: (id: string | null, title?: string | null) => void;
  activeConversationId?: string | null;
};

export type SidebarHandle = {
  closeTransientMenus: () => boolean;
};

type Lang =
  | 'zh-CN'
  | 'en-US'
  | 'vi-VN'
  | 'th-TH'
  | 'my-MM'
  | 'id-ID'
  | 'km-KH'
  | 'lo-LA'
  | 'ms-BN'
  | 'ms-MY'
  | 'fil-PH'
  | 'en-SG'
  | 'pt-TL';

const LANGS: { code: Lang; label: string }[] = [
  { code: 'zh-CN', label: '中文' },
  { code: 'en-US', label: 'English' },
  { code: 'vi-VN', label: 'Tiếng Việt' },
  { code: 'th-TH', label: 'ไทย' },
  { code: 'my-MM', label: 'မြန်မာ' },
  { code: 'id-ID', label: 'Bahasa Indonesia' },
  { code: 'km-KH', label: 'ខ្មែរ' },
  { code: 'lo-LA', label: 'ລາວ' },
  { code: 'ms-BN', label: 'Bahasa Melayu (Brunei)' },
  { code: 'ms-MY', label: 'Bahasa Melayu' },
  { code: 'fil-PH', label: 'Filipino' },
  { code: 'en-SG', label: 'English (Singapore)' },
  { code: 'pt-TL', label: 'Português (Timor-Leste)' },
];

const CONVERSATION_PAGE_SIZE = 8;
const HISTORY_ACTION_MENU_HEIGHT = 92;
const HISTORY_ACTION_MENU_GAP = 6;
const HISTORY_ACTION_MENU_SIDE_GAP = 8;
const SIDEBAR_HEADER_HEIGHT = 72;

type HistoryActionMenuState = {
  conversationId: string;
  top: number;
  left: number;
  openUpward: boolean;
};

const BASE_FALLBACK: Record<string, Lang> = {
  en: 'en-US',
  ms: 'ms-MY',
  zh: 'zh-CN',
  vi: 'vi-VN',
  th: 'th-TH',
  my: 'my-MM',
  id: 'id-ID',
  km: 'km-KH',
  lo: 'lo-LA',
  fil: 'fil-PH',
  pt: 'pt-TL',
};

function resolveLang(lng: string) {
  const exact = LANGS.find((lang) => lang.code === lng);
  if (exact) return exact;

  const base = lng.split('-')[0];
  const fallback = BASE_FALLBACK[base];
  return LANGS.find((lang) => lang.code === fallback) ?? LANGS[0];
}

const Sidebar = forwardRef<SidebarHandle, SidebarProps>(function Sidebar(
  { user, onClose, onOpenUserInfo, onSelectConversation, activeConversationId }: SidebarProps,
  ref,
) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation('chat');
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [convLoading, setConvLoading] = useState(false);
  const [convError, setConvError] = useState<string | null>(null);
  const [deleteButtonFor, setDeleteButtonFor] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [renameLoadingId, setRenameLoadingId] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [historyActionMenu, setHistoryActionMenu] = useState<HistoryActionMenuState | null>(null);
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const langButtonRef = useRef<HTMLDivElement>(null);
  const historyActionMenuRef = useRef<HTMLDivElement>(null);
  const lastConversationIdRef = useRef<string | null>(null);
  const convLoadingRef = useRef(false);
  const lastSyncedConversationRef = useRef<{ id: string; title: string } | null>(null);

  const deleteTarget = deleteConfirmId
    ? conversations.find((c) => c.id === deleteConfirmId)
    : undefined;

  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('themeMode');
    return (saved as 'light' | 'dark') || 'light';
  });

  useImperativeHandle(
    ref,
    () => ({
      closeTransientMenus: () => {
        let closedAny = false;
        if (isLangOpen) {
          setIsLangOpen(false);
          closedAny = true;
        }
        if (historyActionMenu) {
          setHistoryActionMenu(null);
          closedAny = true;
        }
        return closedAny;
      },
    }),
    [isLangOpen, historyActionMenu],
  );

  useEffect(() => {
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [themeMode]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langButtonRef.current && !langButtonRef.current.contains(e.target as Node)) {
        setIsLangOpen(false);
      }
    };

    if (isLangOpen) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [isLangOpen]);

  function go(path: string) {
    navigate(path);
  }

  function handleFeedbackClick() {
    if (!isAuthed) {
      setShowLoginRequiredModal(true);
      return;
    }
    go('/chat/complaint');
  }

  function toggleTheme() {
    const newMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(newMode);
    localStorage.setItem('themeMode', newMode);
  }

  async function switchLang(lang: Lang) {
    const now = i18n.resolvedLanguage || i18n.language;
    if (now === lang) {
      return;
    }
    localStorage.setItem('lang', lang);
    await i18n.changeLanguage(lang);
  }

  const loadConversations = useCallback(
    async (reset = false) => {
      if (!user || convLoadingRef.current) return;

      if (reset) {
        lastConversationIdRef.current = null;
        setConversations([]);
        setHasMoreConversations(false);
      }

      setConvError(null);
      setDeleteError(null);
      setRenameError(null);
      setConvLoading(true);
      convLoadingRef.current = true;

      try {
        const data = await fetchChatConversations({
          limit: CONVERSATION_PAGE_SIZE,
          lastId: reset ? undefined : (lastConversationIdRef.current ?? undefined),
        });

        setHasMoreConversations(data.hasMore);
        setConversations((prev) => (reset ? data.items : [...prev, ...data.items]));

        const tailId = data.items.length ? data.items[data.items.length - 1].id : null;
        lastConversationIdRef.current = tailId;
      } catch (err) {
        setHasMoreConversations(false);
        setConvError(t('sidebar.conversationError'));
      } finally {
        setConvLoading(false);
        convLoadingRef.current = false;
      }
    },
    [user, t],
  );

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setHasMoreConversations(false);
      setConvError(null);
      lastConversationIdRef.current = null;
      return;
    }

    loadConversations(true);
  }, [user, loadConversations]);

  useEffect(() => {
    if (!user || !activeConversationId || convLoadingRef.current) return;

    const exists = conversations.some((conversation) => conversation.id === activeConversationId);
    if (exists) return;

    loadConversations(true);
  }, [user, activeConversationId, conversations, loadConversations]);

  useEffect(() => {
    if (!user || !activeConversationId) return;

    const activeConversation = conversations.find(
      (conversation) => conversation.id === activeConversationId,
    );
    if (!activeConversation) return;

    const nextTitle = activeConversation.title || t('sidebar.untitledConversation');
    const lastSynced = lastSyncedConversationRef.current;
    if (lastSynced?.id === activeConversationId && lastSynced.title === nextTitle) return;

    lastSyncedConversationRef.current = { id: activeConversationId, title: nextTitle };
    onSelectConversation?.(activeConversationId, nextTitle);
  }, [user, activeConversationId, conversations, onSelectConversation, t]);

  useEffect(() => {
    if (!user) {
      setDeleteButtonFor(null);
      setDeleteError(null);
      setDeleteConfirmId(null);
      setRenameError(null);
      setRenameLoadingId(null);
      setEditingConversationId(null);
      setEditingTitle('');
      setHistoryActionMenu(null);
    }
  }, [user]);

  useEffect(() => {
    if (!historyActionMenu) return;

    const handleDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (historyActionMenuRef.current?.contains(target)) return;
      if (target.closest('[data-history-action-trigger="true"]')) return;
      setHistoryActionMenu(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setHistoryActionMenu(null);
      }
    };

    const closeMenu = () => setHistoryActionMenu(null);

    document.addEventListener('mousedown', handleDocumentMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);

    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, [historyActionMenu]);

  const current = i18n.resolvedLanguage ?? i18n.language ?? 'zh-CN';
  const currentLang = resolveLang(current);

  const DEFAULT_AVATAR = '/userlogo.ico';
  const isAuthed = Boolean(user);
  const displayName = user?.nickname || t('topnav.login');
  const displayPhone = isAuthed
    ? user?.phone
      ? maskPhone(user.phone)
      : t('userInfoModal.unboundPhone')
    : t('sidebar.notLoggedIn');

  const handleDeleteConversation = async () => {
    if (!deleteConfirmId) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteChatConversation(deleteConfirmId);
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== deleteConfirmId);
        const tail = next.length ? next[next.length - 1].id : null;
        lastConversationIdRef.current = tail;
        return next;
      });

      if (activeConversationId === deleteConfirmId) {
        onSelectConversation?.(null, null);
      }

      if (deleteButtonFor === deleteConfirmId) {
        setDeleteButtonFor(null);
      }

      setDeleteConfirmId(null);
    } catch (err) {
      setDeleteError(t('sidebar.deleteError'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const startRenameConversation = (conversation: ChatConversation) => {
    setRenameError(null);
    setDeleteError(null);
    setHistoryActionMenu(null);
    setEditingConversationId(conversation.id);
    setEditingTitle(conversation.title || '');
  };

  const cancelRenameConversation = () => {
    setEditingConversationId(null);
    setEditingTitle('');
  };

  const handleRenameConversation = async (conversation: ChatConversation) => {
    const nextName = editingTitle.trim();

    setRenameError(null);

    if (!nextName) {
      cancelRenameConversation();
      return;
    }

    if (nextName === conversation.title) {
      cancelRenameConversation();
      return;
    }

    setRenameLoadingId(conversation.id);
    try {
      const renamed = await renameChatConversation(conversation.id, { name: nextName });
      setConversations((prev) =>
        prev.map((item) =>
          item.id === conversation.id
            ? {
                ...item,
                title: renamed.title,
                updatedAt: renamed.updatedAt,
              }
            : item,
        ),
      );
      if (activeConversationId === conversation.id) {
        onSelectConversation?.(conversation.id, renamed.title || t('sidebar.untitledConversation'));
      }
      setEditingConversationId(null);
      setEditingTitle('');
    } catch (err) {
      setRenameError(t('sidebar.renameError'));
    } finally {
      setRenameLoadingId(null);
    }
  };

  const toggleHistoryActionMenu = (conversationId: string, triggerElement: HTMLButtonElement) => {
    setHistoryActionMenu((prev) => {
      if (prev?.conversationId === conversationId) {
        return null;
      }

      const rect = triggerElement.getBoundingClientRect();
      const shouldOpenUpward =
        window.innerHeight - rect.bottom < HISTORY_ACTION_MENU_HEIGHT + HISTORY_ACTION_MENU_GAP;

      return {
        conversationId,
        top: shouldOpenUpward
          ? rect.top - HISTORY_ACTION_MENU_GAP
          : rect.bottom + HISTORY_ACTION_MENU_GAP,
        left: rect.right + HISTORY_ACTION_MENU_SIDE_GAP,
        openUpward: shouldOpenUpward,
      };
    });
  };

  return (
    <aside
      className="
        h-full
        w-65
        flex flex-col
        bg-gray-50 dark:bg-gray-900
        border-r border-gray-200 dark:border-gray-700
      "
    >
      {/* 侧栏标题 */}
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AsePal</h1>
        <div className="flex items-center gap-2">
          {/* 语言切换按钮容器 */}
          <div ref={langButtonRef} className="relative">
            <motion.button
              type="button"
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="ui-tooltip relative p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              aria-label={t('tooltips.toggleLanguage')}
              data-tooltip={t('tooltips.toggleLanguage')}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            >
              <div className="relative w-5 h-5 overflow-visible">
                <motion.span
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{ rotate: isLangOpen ? 12 : 0, scale: isLangOpen ? 1.06 : 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                >
                  <GlobeAltIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </motion.span>
              </div>
            </motion.button>

            {/* 语言选择窗口 */}
            <AnimatePresence>
              {isLangOpen && (
                <motion.div
                  initial={{ x: -260 }}
                  animate={{ x: 0 }}
                  exit={{ x: -260 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="fixed left-0 w-65 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-50 flex flex-col"
                  style={{
                    top: SIDEBAR_HEADER_HEIGHT,
                    height: `calc(100vh - ${SIDEBAR_HEADER_HEIGHT}px)`,
                  }}
                >
                  {/* 窗口顶部标题栏 */}
                  <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {t('sidebar.language')}
                    </h2>
                    <button
                      onClick={() => setIsLangOpen(false)}
                      className="ui-tooltip p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                      aria-label={t('tooltips.closeLanguageMenu')}
                      data-tooltip={t('tooltips.closeLanguageMenu')}
                    >
                      <svg
                        className="w-5 h-5 text-gray-600 dark:text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* 语言列表 */}
                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    <div className="space-y-1">
                      {LANGS.map((lang) => {
                        const isActive = currentLang?.code === lang.code;
                        return (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => switchLang(lang.code)}
                            className={`
                              w-full text-left px-4 py-3 rounded-lg text-sm transition-colors
                              ${
                                isActive
                                  ? 'bg-blue-500 text-white font-medium'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                              }
                            `}
                          >
                            {lang.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 主题切换按钮 */}
          <button
            onClick={toggleTheme}
            className="ui-tooltip relative p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            aria-label={t('tooltips.toggleTheme')}
            data-tooltip={t('tooltips.toggleTheme')}
          >
            <div className="relative w-5 h-5 overflow-visible">
              <motion.div
                key="sun"
                initial={{ scale: 1, rotate: 0, opacity: 1, x: 0 }}
                animate={
                  themeMode === 'dark'
                    ? {
                        scale: 1,
                        rotate: 0,
                        opacity: 1,
                        x: 0,
                        filter: 'drop-shadow(0 0 8px #FFD700)',
                      }
                    : { scale: 0.7, rotate: 45, opacity: 0, x: -24, filter: 'none' }
                }
                transition={{
                  scale: { type: 'spring', stiffness: 320, damping: 22 },
                  rotate: { type: 'spring', stiffness: 320, damping: 22 },
                  opacity: { duration: 0.22, ease: 'easeInOut' },
                  x: { duration: 0.32, ease: 'easeInOut' },
                  filter: { duration: 0.22, ease: 'easeInOut' },
                }}
                style={{ zIndex: themeMode === 'dark' ? 2 : 1 }}
                className="absolute inset-0"
              >
                <SunIcon className="w-5 h-5 text-amber-500" />
              </motion.div>
              <motion.div
                key="moon"
                initial={{ scale: 0.7, rotate: 45, opacity: 0, x: -24 }}
                animate={
                  themeMode === 'light'
                    ? {
                        scale: 1,
                        rotate: 0,
                        opacity: 1,
                        x: 0,
                        filter: 'drop-shadow(0 0 8px #6366F1)',
                      }
                    : { scale: 0.7, rotate: 45, opacity: 0, x: -24, filter: 'none' }
                }
                transition={{
                  scale: { type: 'spring', stiffness: 320, damping: 22 },
                  rotate: { type: 'spring', stiffness: 320, damping: 22 },
                  opacity: { duration: 0.22, ease: 'easeInOut' },
                  x: { duration: 0.32, ease: 'easeInOut' },
                  filter: { duration: 0.22, ease: 'easeInOut' },
                }}
                style={{ zIndex: themeMode === 'light' ? 2 : 1 }}
                className="absolute inset-0"
              >
                <MoonIcon className="w-5 h-5 text-indigo-500" />
              </motion.div>
            </div>
          </button>
        </div>
      </div>

      {/* 侧栏用户信息 */}
      <div className="px-4 pt-4">
        <div className="relative">
          <motion.div
            aria-hidden="true"
            layoutId="user-info-card"
            className="
              pointer-events-none
              absolute inset-0
              z-40
              w-full
              flex items-center gap-3
              rounded-xl border border-gray-200 dark:border-gray-700
              px-3 py-2
              bg-white/80
              dark:bg-gray-800/80
              text-left
              opacity-0
            "
          >
            <motion.img
              src={user?.avatar || DEFAULT_AVATAR}
              alt="avatar"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
              layoutId="user-info-avatar"
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {displayName}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {displayPhone}
              </div>
            </div>
          </motion.div>
          <button
            type="button"
            onClick={() => {
              if (isAuthed) {
                onOpenUserInfo?.();
              } else {
                navigate('/login');
                onClose?.();
              }
            }}
            className="
              ui-tooltip w-full
              flex items-center gap-3
              rounded-xl border border-gray-200 dark:border-gray-700
              px-3 py-2
              bg-white/80 hover:bg-white
              dark:bg-gray-800/80 dark:hover:bg-gray-800
              transition-colors
              text-left
            "
            aria-label={isAuthed ? t('tooltips.openUserInfo') : t('tooltips.goLogin')}
            data-tooltip={isAuthed ? t('tooltips.openUserInfo') : t('tooltips.goLogin')}
          >
            <img
              src={user?.avatar || DEFAULT_AVATAR}
              alt="avatar"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {displayName}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {displayPhone}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 主导航区 */}
      <div className="flex-1 min-h-0 overflow-hidden px-4 py-4 flex flex-col gap-2">
        {/* 功能导航下拉菜单 */}
        <DropdownMenu
          title={t('sidebar.title')}
          isOpen={isMenuOpen}
          onToggle={() => setIsMenuOpen(!isMenuOpen)}
        >
          <MenuItem
            icon={CpuChipIcon}
            active={location.pathname === '/chat'}
            onClick={() => go('/chat')}
          >
            {t('sidebar.ask')}
          </MenuItem>
          <MenuItem
            icon={InformationCircleIcon}
            active={location.pathname === '/about'}
            onClick={() => go('/about')}
          >
            {t('sidebar.aboutUs')}
          </MenuItem>
          <MenuItem
            icon={ChatBubbleLeftRightIcon}
            active={location.pathname === '/chat/complaint'}
            onClick={handleFeedbackClick}
          >
            {t('sidebar.feedback')}
          </MenuItem>
        </DropdownMenu>

        {/* 历史对话 */}
        <DropdownMenu
          title={t('sidebar.history')}
          isOpen={isHistoryOpen}
          onToggle={() => setIsHistoryOpen(!isHistoryOpen)}
          fillHeight
        >
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 overscroll-contain">
              <div className="space-y-2 pb-2">
                {!isAuthed && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t('sidebar.historyLoginTip')}
                  </div>
                )}

                {isAuthed && (
                  <>
                    {convError && (
                      <div className="text-xs text-red-500 dark:text-red-400">{convError}</div>
                    )}

                    {!convError && !convLoading && conversations.length === 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {t('sidebar.noHistory')}
                      </div>
                    )}

                    {conversations.length > 0 && (
                      <ul className="space-y-1">
                        {conversations.map((item) => (
                          <li
                            key={item.id}
                            onClick={() => {
                              if (editingConversationId === item.id) return;
                              setDeleteButtonFor(item.id);
                              setHistoryActionMenu(null);
                              onSelectConversation?.(
                                item.id,
                                item.title || t('sidebar.untitledConversation'),
                              );
                            }}
                            className={`
                            rounded-md border px-3 py-2
                            text-sm transition-colors cursor-pointer
                            ${
                              item.id === activeConversationId
                                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-100'
                                : 'border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 text-gray-800 dark:text-gray-100 hover:border-blue-500 dark:hover:border-blue-400'
                            }
                          `}
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                {editingConversationId === item.id ? (
                                  <input
                                    type="text"
                                    value={editingTitle}
                                    autoFocus
                                    onFocus={(e) => e.currentTarget.select()}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    onBlur={() => {
                                      if (renameLoadingId !== item.id) {
                                        void handleRenameConversation(item);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        void handleRenameConversation(item);
                                        return;
                                      }
                                      if (e.key === 'Escape') {
                                        e.preventDefault();
                                        cancelRenameConversation();
                                      }
                                    }}
                                    disabled={renameLoadingId === item.id}
                                    className="
                                      w-full rounded-md border border-blue-500 dark:border-blue-400
                                      bg-white dark:bg-gray-800
                                      px-2 py-1 text-sm font-medium
                                      text-gray-900 dark:text-gray-100
                                      outline-none
                                      disabled:opacity-60 disabled:cursor-not-allowed
                                    "
                                  />
                                ) : (
                                  <div className="truncate font-medium">
                                    {item.title || t('sidebar.untitledConversation')}
                                  </div>
                                )}
                                <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                  {new Date(item.updatedAt).toLocaleString()}
                                </div>
                              </div>

                              {deleteButtonFor === item.id && (
                                <div className="shrink-0 flex items-center gap-x-1">
                                  {editingConversationId !== item.id && (
                                    <button
                                      type="button"
                                      data-history-action-trigger="true"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleHistoryActionMenu(item.id, e.currentTarget);
                                      }}
                                      disabled={renameLoadingId === item.id || deleteLoading}
                                      className="
                                        w-9 h-9 flex items-center justify-center
                                        text-gray-600 dark:text-gray-300
                                        hover:opacity-70 disabled:opacity-50 disabled:cursor-not-allowed
                                        transition-opacity
                                        ml-auto
                                      "
                                      aria-label={`${t('sidebar.rename')} / ${t('sidebar.delete')}`}
                                    >
                                      <EllipsisHorizontalIcon className="w-5 h-5 stroke-2" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {convLoading && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {t('sidebar.loadingHistory')}
                      </div>
                    )}

                    {deleteError && !convError && (
                      <div className="text-xs text-red-500 dark:text-red-400">{deleteError}</div>
                    )}

                    {renameError && !convError && (
                      <div className="text-xs text-red-500 dark:text-red-400">{renameError}</div>
                    )}

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => loadConversations(false)}
                        disabled={convLoading || (!hasMoreConversations && !convError)}
                        className="
                          w-full text-xs font-medium
                          px-3 py-2
                          rounded-md border border-gray-200 dark:border-gray-700
                          text-gray-700 dark:text-gray-200
                          hover:bg-gray-100 dark:hover:bg-gray-800
                          disabled:opacity-60 disabled:cursor-not-allowed
                        "
                      >
                        {convLoading
                          ? t('sidebar.loadingHistory')
                          : !hasMoreConversations && !convError
                            ? t('sidebar.loadedAll')
                            : t('sidebar.loadMore')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </DropdownMenu>
      </div>

      {createPortal(
        <AnimatePresence>
          {historyActionMenu && (
            <motion.div
              ref={historyActionMenuRef}
              className="
                fixed z-999 min-w-33
                rounded-lg border border-gray-200 dark:border-gray-700
                bg-white dark:bg-gray-800
                shadow-lg
                py-1
              "
              style={{
                top: historyActionMenu.top,
                left: historyActionMenu.left,
                transform: historyActionMenu.openUpward ? 'translate(0, -100%)' : 'translate(0, 0)',
              }}
              initial={{
                opacity: 0,
                scale: 0.96,
                y: historyActionMenu.openUpward ? 6 : -6,
              }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{
                opacity: 0,
                scale: 0.96,
                y: historyActionMenu.openUpward ? 6 : -6,
              }}
              transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.75 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  const conversation = conversations.find(
                    (conversationItem) => conversationItem.id === historyActionMenu.conversationId,
                  );
                  if (!conversation) {
                    setHistoryActionMenu(null);
                    return;
                  }
                  startRenameConversation(conversation);
                }}
                disabled={renameLoadingId === historyActionMenu.conversationId || deleteLoading}
                className="
                  w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                  text-gray-700 dark:text-gray-200
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                <PencilSquareIcon className="w-4 h-4" />
                <span>{t('sidebar.rename')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmId(historyActionMenu.conversationId);
                  setHistoryActionMenu(null);
                }}
                disabled={renameLoadingId === historyActionMenu.conversationId}
                className="
                  w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                  text-red-600 dark:text-red-300
                  hover:bg-red-50 dark:hover:bg-red-900/30
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                <TrashIcon className="w-4 h-4" />
                <span>{t('sidebar.delete')}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      <ConfirmDeleteModal
        open={Boolean(deleteConfirmId)}
        loading={deleteLoading}
        conversationTitle={deleteTarget?.title || t('sidebar.untitledConversation')}
        onCancel={() => setDeleteConfirmId(null)}
        onConfirm={handleDeleteConversation}
        title={t('sidebar.deleteConfirmTitle')}
        description={t('sidebar.deleteConfirmDesc')}
        confirmText={t('sidebar.deleteConfirm')}
        cancelText={t('sidebar.deleteCancel')}
      />

      <LoginErrorModal
        open={showLoginRequiredModal}
        onConfirm={() => {
          setShowLoginRequiredModal(false);
          navigate('/login');
        }}
        onCancel={() => setShowLoginRequiredModal(false)}
      />
    </aside>
  );
});

export default Sidebar;

function DropdownMenu({
  title,
  isOpen,
  onToggle,
  fillHeight = false,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  fillHeight?: boolean;
  children: React.ReactNode;
}) {
  const childrenArray = Array.isArray(children) ? children : [children];

  return (
    <div className={fillHeight ? 'flex-1 min-h-0 flex flex-col' : 'space-y-1'}>
      <button
        onClick={onToggle}
        className="
          w-full flex items-center justify-between
          px-3 py-2 rounded-md
          text-sm font-medium text-gray-700 dark:text-gray-300
          hover:bg-gray-200 dark:hover:bg-gray-800
          transition-colors
        "
      >
        <span>{title}</span>
        <motion.span
          initial={false}
          animate={{
            rotate: isOpen ? 180 : 0,
            scale: isOpen ? 1.1 : 1,
            opacity: 1,
          }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          style={{ display: 'inline-flex' }}
        >
          <ChevronDownIcon className="w-4 h-4" />
        </motion.span>
      </button>
      <div
        className={`
          transition-all duration-300 ease-in-out
          ${
            fillHeight
              ? isOpen
                ? 'flex-1 min-h-0 mt-1'
                : 'overflow-hidden max-h-0'
              : isOpen
                ? 'overflow-hidden max-h-150 mt-1'
                : 'overflow-hidden max-h-0'
          }
        `}
      >
        {fillHeight ? (
          <div className="h-full min-h-0 flex flex-col">{children}</div>
        ) : (
          <div className="space-y-1">
            {childrenArray.map((child, index) => (
              <div
                key={index}
                className={`
                  transition-all duration-300 ease-out
                  ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}
                `}
                style={{ transitionDelay: isOpen ? `${index * 50}ms` : '0ms' }}
              >
                {child}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  active,
  disabled,
  onClick,
  children,
}: {
  icon: any;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`
        flex items-center gap-3
        px-3 py-2 rounded-md
        text-sm
        transition-colors
        ${
          active
            ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            : disabled
              ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer'
        }
      `}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') onClick?.();
      }}
    >
      <Icon className="w-5 h-5 shrink-0 opacity-80" />
      <span>{children}</span>
    </div>
  );
}

function ConfirmDeleteModal({
  open,
  loading,
  onConfirm,
  onCancel,
  title,
  description,
  conversationTitle,
  confirmText,
  cancelText,
}: {
  open: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string;
  conversationTitle?: string;
  confirmText: string;
  cancelText: string;
}) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-999 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
        >
          <motion.div
            className="w-[92%] max-w-md rounded-2xl bg-white text-gray-900 dark:bg-gray-900 dark:text-white px-8 py-7 shadow-xl border border-gray-200 dark:border-gray-700"
            initial={{ y: 60, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
          >
            <div className="flex flex-col space-y-3 mb-6">
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {description}
              </p>
              {conversationTitle && (
                <div className="text-base font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 shadow-inner">
                  "{conversationTitle}"
                </div>
              )}
            </div>

            <div className="flex justify-end items-center gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="
                  px-5 py-2.5
                  rounded-lg
                  text-sm font-medium
                  border border-blue-500/60
                  text-blue-400
                  hover:bg-blue-500
                  hover:text-white
                  transition-colors
                "
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="
                  px-5 py-2.5 rounded-lg
                  bg-red-600 hover:bg-red-700
                  disabled:opacity-70 disabled:cursor-not-allowed
                  text-sm font-semibold text-white
                  transition-colors
                "
              >
                {loading ? '...' : confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
