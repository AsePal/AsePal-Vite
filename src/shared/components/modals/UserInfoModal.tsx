import {
  AcademicCapIcon,
  ArrowLeftOnRectangleIcon,
  EnvelopeIcon,
  PencilSquareIcon,
  PhoneIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { maskPhone } from '../../utils';
import type { UserInfo } from '../../types/user.types';

export default function UserInfoModal({
  open,
  user,
  onClose,
  onEditAvatar,
  onLogout,
  onEditEmail,
  onEditNickname,
}: {
  open: boolean;
  user: UserInfo | null | undefined;
  onClose: () => void;
  onEditAvatar?: () => void;
  onLogout?: () => void;
  onEditEmail?: () => void;
  onEditNickname?: () => void;
}) {
  const { t } = useTranslation('chat');

  const DEFAULT_AVATAR = '/userlogo.ico';
  const displayName = user?.nickname || t('userInfoModal.guestName');

  const displayPhone = user?.phone ? maskPhone(user.phone) : t('userInfoModal.unboundPhone');
  const displayEmail = user?.email || t('userInfoModal.unboundEmail');
  const displaySchoolNickname = user?.schoolNickname || t('userInfoModal.unboundSchoolNickname');

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            layoutId="user-info-card"
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="w-[92%] max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {t('userInfoModal.title')}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                aria-label={t('userInfoModal.close')}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="flex items-start gap-6">
                <div className="w-28 flex-shrink-0 flex flex-col items-center text-center">
                  <motion.img
                    layoutId="user-info-avatar"
                    src={user?.avatar || DEFAULT_AVATAR}
                    alt="avatar"
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
                  />
                  <div className="mt-2 w-full text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {displayName}
                  </div>
                </div>

                <div className="min-w-0 flex-1 space-y-2 pt-1">
                  <div className="flex items-center gap-2 text-sm">
                    <PhoneIcon className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                    <span className="min-w-0 truncate text-gray-900 dark:text-gray-100">
                      {displayPhone}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <EnvelopeIcon className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                    <span className="min-w-0 truncate text-gray-900 dark:text-gray-100">
                      {displayEmail}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <AcademicCapIcon className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                    <span className="min-w-0 truncate text-gray-900 dark:text-gray-100">
                      {displaySchoolNickname}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    onEditAvatar?.();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <PencilSquareIcon className="w-4 h-4" />
                  {t('userInfoModal.editAvatar')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onEditNickname?.();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <UserCircleIcon className="w-4 h-4" />
                  {t('userInfoModal.editNickname')}
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <PhoneIcon className="w-4 h-4" />
                  {t('userInfoModal.editPhone')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onEditEmail?.();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <EnvelopeIcon className="w-4 h-4" />
                  {t('userInfoModal.editEmail')}
                </button>

                {onLogout && (
                  <button
                    type="button"
                    //退出按钮逻辑判定
                    // NOTE: Playwright测试注入节点
                    //注入onClick={onLogout}定位逻辑定位登录按钮
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <ArrowLeftOnRectangleIcon className="w-4 h-4" />
                    {t('userInfoModal.logout')}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
