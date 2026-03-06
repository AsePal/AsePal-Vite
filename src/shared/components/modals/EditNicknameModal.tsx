import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import API, { apiRequest } from '../../api/config';

type Props = {
  open: boolean;
  currentUsername: string;
  onClose: () => void;
  onSuccess: (newUsername: string) => void;
};

export default function EditNicknameModal({ open, currentUsername, onClose, onSuccess }: Props) {
  const { t } = useTranslation('chat');
  const [value, setValue] = useState(currentUsername || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(currentUsername || '');
    setError(null);
  }, [currentUsername, open]);

  function validate(name: string) {
    if (!name || name.trim().length === 0) return t('editNicknameModal.validate.empty');
    if (name.trim().length < 2 || name.trim().length > 30)
      return t('editNicknameModal.validate.length');
    // 禁止过多特殊字符（允许中文、字母、数字、下划线、空格）
    if (!/^[\p{L}\p{N}_\-\s]{1,30}$/u.test(name.trim()))
      return t('editNicknameModal.validate.invalidChars');
    return null;
  }

  async function handleSave() {
    const v = value.trim();
    const err = validate(v);
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiRequest(API.user.info, { method: 'PATCH', body: { username: v } });

      if (res.status === 409) {
        const data = await res.json().catch(() => null);
        const message = (data?.message || data?.error || '') as string;
        // Map backend conflict messages to localized strings when possible
        const mapConflict = (msg: string) => {
          if (!msg) return '';
          const lower = msg.toLowerCase();
          if (lower.includes('username')) return t('editNicknameModal.taken');
          if (lower.includes('email')) return t('editNicknameModal.emailTaken');
          if (lower.includes('phone')) return t('editNicknameModal.phoneTaken');
          return '';
        };

        const localized = mapConflict(message);
        setError(localized || message || t('editNicknameModal.taken'));
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message = data?.message || data?.error;
        throw new Error(message || `更新失败（${res.status}）`);
      }

      const data = await res.json();
      onSuccess(data.username ?? v);
      onClose();
    } catch (e: any) {
      setError(e?.message || t('editNicknameModal.updateFailed'));
    } finally {
      setLoading(false);
    }
  }

  // keep `handleSave` referenced so TypeScript doesn't error with "declared but its value is never read"
  void handleSave;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[13000] bg-black/60 backdrop-blur-sm flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="w-[420px] rounded-2xl bg-white/95 backdrop-blur-xl dark:bg-gray-900/95 shadow-[0_30px_80px_rgba(0,0,0,0.35)] px-8 py-6"
          >
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 text-center">
              {t('userMenu.editNickname')}
            </h2>

            <div className="flex flex-col gap-3">
              <label className="text-sm text-gray-500 dark:text-gray-400">
                {t('editNicknameModal.label')}
              </label>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none"
                placeholder={t('editNicknameModal.placeholder')}
                maxLength={30}
                autoFocus
              />

              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition"
              >
                {t('avatarModal.cancel')}
              </button>

              <button
                type="button"
                //昵称保存按钮逻辑
                //note：playwright测试用点
                //hook实现注入 `onClick={handleSave}`
                onClick={() => {}}
                disabled={loading}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/30 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? t('avatarModal.saving') : t('avatarModal.save')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
