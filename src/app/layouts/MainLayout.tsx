import { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { UserInfo } from '../../shared/types/user.types';
import type { SidebarHandle } from '../../features/chat/components/Sidebar';

import { TopNav, Sidebar } from '../../features/chat';
import { useTranslation } from 'react-i18next';
import {
  LogoutConfirmModal,
  AvatarEditorModal,
  EditNicknameModal,
  SuccessToastModal,
  UserInfoModal,
  SessionExpiredModal,
  Footer,
} from '../../shared/components';

import API, { apiRequest } from '../../shared/api/config';
import { parseJwt, isTokenExpired } from '../../shared/utils/jwt';

export default function MainLayout() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [showEditNickname, setShowEditNickname] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successToastContent, setSuccessToastContent] = useState<{
    title?: string;
    description?: string;
  }>({});
  const [showUserInfoModal, setShowUserInfoModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversationTitle, setActiveConversationTitle] = useState<string | null>(null);
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const sidebarRef = useRef<SidebarHandle | null>(null);
  const skipNextSidebarCloseRef = useRef(false);

  const DEFAULT_AVATAR = '/userlogo.ico';
  const navigate = useNavigate();
  const { t } = useTranslation('chat');

  function handleSidebarOverlayMouseDown() {
    skipNextSidebarCloseRef.current = sidebarRef.current?.closeTransientMenus() ?? false;
  }

  function handleSidebarOverlayClick() {
    if (skipNextSidebarCloseRef.current) {
      skipNextSidebarCloseRef.current = false;
      return;
    }
    setSidebarOpen(false);
  }

  function handleConversationChange(id: string | null, title?: string | null) {
    setActiveConversationId(id);
    if (title !== undefined) {
      setActiveConversationTitle(title);
      return;
    }
    if (id === null) {
      setActiveConversationTitle(null);
    }
  }

  function fetchUserInfo() {
    const token = localStorage.getItem('auth_token');

    // 未登录：保持匿名语义（user === null）
    if (!token) {
      setUser(null);
      setUserLoaded(true);
      return;
    }

    // 前端主动检测 token 是否过期
    if (isTokenExpired(token)) {
      localStorage.removeItem('auth_token');
      setUser(null);
      setUserLoaded(true);
      setShowSessionExpired(true);
      return;
    }

    const payload = parseJwt(token);
    const fallbackNickname = payload?.username ?? '需要登录';

    apiRequest(API.user.info)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setUser({
          nickname: data.userName || data.username || fallbackNickname,
          avatar: data.avatarUrl ? `${data.avatarUrl}?t=${Date.now()}` : DEFAULT_AVATAR,
          phone: data.phone ?? null,
          email: data.email ?? null,
          schoolNickname: data.schoolNickname ?? data.schoolNickName ?? data.school_name ?? null,
        });
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setUserLoaded(true);
      });
  }

  useEffect(() => {
    fetchUserInfo();
  }, []);

  // 定时检测 token 过期（每 30 秒）
  useEffect(() => {
    const timer = setInterval(() => {
      const token = localStorage.getItem('auth_token');
      if (token && isTokenExpired(token)) {
        localStorage.removeItem('auth_token');
        setUser(null);
        setShowSessionExpired(true);
      }
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  // 监听 API 层 401 事件
  useEffect(() => {
    const handler = () => {
      setUser(null);
      setShowSessionExpired(true);
    };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, []);

  useEffect(() => {
    const onPointerEnter = (event: PointerEvent) => {
      const el = (event.target as HTMLElement | null)?.closest?.(
        '[data-tooltip]',
      ) as HTMLElement | null;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      el.setAttribute('data-tooltip-pos', rect.top < 60 ? 'bottom' : 'top');
    };

    document.addEventListener('pointerover', onPointerEnter);
    return () => {
      document.removeEventListener('pointerover', onPointerEnter);
    };
  }, []);

  useEffect(() => {
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousTouchAction = body.style.touchAction;

    if (sidebarOpen) {
      body.style.overflow = 'hidden';
      body.style.touchAction = 'none';
    }

    return () => {
      body.style.overflow = previousOverflow;
      body.style.touchAction = previousTouchAction;
    };
  }, [sidebarOpen]);

  const openUserInfo = () => {
    setShowUserInfoModal(true);
  };

  const closeUserInfo = () => {
    setShowUserInfoModal(false);
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      {/* 顶栏 - 所有页面都显示 */}
      <TopNav
        user={user}
        onLogout={() => setShowLogoutModal(true)}
        onEditAvatar={() => setShowAvatarEditor(true)}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        sidebarOpen={sidebarOpen}
      />

      <div className="flex flex-1 relative overflow-hidden">
        {/* 侧栏 - 所有页面都显示 */}
        {/* 遮罩 */}
        <div
          className={`
              fixed top-14 left-0 right-0 bottom-0 z-40
              bg-black/20 transition-opacity duration-300
              ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `}
          onMouseDown={handleSidebarOverlayMouseDown}
          onClick={handleSidebarOverlayClick}
        />

        {/* Sidebar */}
        <motion.div
          initial={false}
          animate={{
            x: sidebarOpen ? 0 : -260,
            opacity: sidebarOpen ? 1 : 0.98,
          }}
          transition={{ type: 'spring', stiffness: 360, damping: 34, mass: 0.85 }}
          className={`
              fixed top-14 left-0 bottom-0 z-50
              will-change-transform
              ${sidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'}
            `}
        >
          <Sidebar
            ref={sidebarRef}
            user={user}
            onClose={() => setSidebarOpen(false)}
            onOpenUserInfo={openUserInfo}
            onSelectConversation={handleConversationChange}
            activeConversationId={activeConversationId}
          />
        </motion.div>

        {/* 页面内容：通过 Outlet 渲染子路由 */}
        <main
          id="app-scroll-container"
          className={`flex-1 flex flex-col overflow-x-hidden ${
            sidebarOpen ? 'overflow-hidden' : 'overflow-y-auto'
          }`}
        >
          <Outlet
            context={{
              user,
              userLoaded,
              refreshUser: fetchUserInfo,
              activeConversationId,
              activeConversationTitle,
              setActiveConversationId: handleConversationChange,
            }}
          />
        </main>
      </div>

      {/* 退出 */}
      <LogoutConfirmModal
        open={showLogoutModal}
        onCancel={() => {
          setShowLogoutModal(false);
        }}
        onConfirm={() => {
          localStorage.removeItem('auth_token');
          setUser(null);
          setActiveConversationId(null);
          setActiveConversationTitle(null);
          setShowUserInfoModal(false);
          setShowLogoutModal(false);
          navigate('/chat');
        }}
      />

      {/* 修改头像 */}
      <AvatarEditorModal
        open={showAvatarEditor}
        currentAvatar={user?.avatar || DEFAULT_AVATAR}
        onClose={() => setShowAvatarEditor(false)}
        onSuccess={() => {
          fetchUserInfo();
          setSuccessToastContent({
            title: t('userInfoModal.editAvatar') || '头像更新成功',
            description: t('successToast.avatarUpdated') || '你的新头像已生效',
          });
          setShowSuccessToast(true);
          setTimeout(() => setShowSuccessToast(false), 1800);
        }}
      />

      {/* 修改昵称弹窗 */}
      <EditNicknameModal
        open={showEditNickname}
        currentUsername={user?.nickname || ''}
        onClose={() => setShowEditNickname(false)}
        onSuccess={() => {
          setShowEditNickname(false);
          fetchUserInfo();
          setSuccessToastContent({
            title: t('editNicknameModal.successTitle') || t('userMenu.editNickname') || '修改成功',
            description: t('editNicknameModal.successDesc') || '',
          });
          setShowSuccessToast(true);
          setTimeout(() => setShowSuccessToast(false), 1800);
        }}
      />

      <SuccessToastModal
        open={showSuccessToast}
        title={successToastContent.title}
        description={successToastContent.description}
      />

      <UserInfoModal
        open={showUserInfoModal}
        user={user}
        onClose={closeUserInfo}
        onEditAvatar={() => setShowAvatarEditor(true)}
        onEditNickname={() => {
          setShowEditNickname(true);
        }}
        onLogout={() => {
          setShowLogoutModal(true);
        }}
      />

      {/* 登录过期提示 */}
      <SessionExpiredModal
        open={showSessionExpired}
        onConfirm={() => {
          localStorage.removeItem('auth_token');
          setUser(null);
          setActiveConversationId(null);
          setActiveConversationTitle(null);
          setShowSessionExpired(false);
          navigate('/login');
        }}
        onBackHome={() => {
          localStorage.removeItem('auth_token');
          setUser(null);
          setActiveConversationId(null);
          setActiveConversationTitle(null);
          setShowSessionExpired(false);
          navigate('/');
        }}
      />
      <Footer />
    </div>
  );
}
