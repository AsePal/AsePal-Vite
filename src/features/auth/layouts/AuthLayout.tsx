import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Footer } from '../../../shared/components';

export default function AuthLayout() {
  const location = useLocation();
  const navigationType = useNavigationType();

  const enteredAuthRef = useRef(false);
  const [enableSlide, setEnableSlide] = useState(false);

  useEffect(() => {
    if (!enteredAuthRef.current) {
      // 第一次进入 Auth 世界（来自 Landing / 刷新）
      enteredAuthRef.current = true;
      setEnableSlide(false);
      return;
    }

    // 已经在 Auth 世界中
    if (navigationType === 'PUSH') {
      setEnableSlide(true);
    } else {
      setEnableSlide(false);
    }
  }, [location.pathname, navigationType]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* 内容 */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <div
          key={location.pathname}
          className={`
            w-full flex justify-center
            ${enableSlide ? 'animate-auth-slide' : ''}
          `}
        >
          <Outlet />
        </div>
      </div>
      <Footer />
    </div>
  );
}
