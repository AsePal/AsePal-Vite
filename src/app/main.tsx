import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/index.css';
import App from './App';
import i18n from '../shared/i18n';

// 仅在开发环境加载测试工具
if (import.meta.env.DEV) {
  import('../shared/utils/tokenTestHelper');
}

const storedLang = localStorage.getItem('lang');

const SUPPORTED_LANGS = [
  'zh-CN',
  'en-US',
  'vi-VN',
  'th-TH',
  'my-MM',
  'id-ID',
  'km-KH',
  'lo-LA',
  'ms-BN',
  'ms-MY',
  'fil-PH',
  'en-SG',
  'pt-TL',
];

const BASE_FALLBACK: Record<string, string> = {
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

const browserLang = navigator.language;
const exactMatch = SUPPORTED_LANGS.find((lang) => lang === browserLang);
const baseMatch = BASE_FALLBACK[browserLang.split('-')[0]];

const resolvedLang = storedLang || exactMatch || baseMatch || 'en-US';

i18n.changeLanguage(resolvedLang);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
