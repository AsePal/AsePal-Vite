import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import zhLanding from './locales/zh-CN/landing.json';
import enLanding from './locales/en-US/landing.json';
import viLanding from './locales/vi-VN/landing.json';
import thLanding from './locales/th-TH/landing.json';
import myLanding from './locales/my-MM/landing.json';
import idLanding from './locales/id-ID/landing.json';
import kmLanding from './locales/km-KH/landing.json';
import loLanding from './locales/lo-LA/landing.json';
import msBnLanding from './locales/ms-BN/landing.json';
import msMyLanding from './locales/ms-MY/landing.json';
import filLanding from './locales/fil-PH/landing.json';
import enSgLanding from './locales/en-SG/landing.json';
import ptTlLanding from './locales/pt-TL/landing.json';
import zhAuth from './locales/zh-CN/auth.json';
import enAuth from './locales/en-US/auth.json';
import viAuth from './locales/vi-VN/auth.json';
import thAuth from './locales/th-TH/auth.json';
import myAuth from './locales/my-MM/auth.json';
import idAuth from './locales/id-ID/auth.json';
import kmAuth from './locales/km-KH/auth.json';
import loAuth from './locales/lo-LA/auth.json';
import msBnAuth from './locales/ms-BN/auth.json';
import msMyAuth from './locales/ms-MY/auth.json';
import filAuth from './locales/fil-PH/auth.json';
import enSgAuth from './locales/en-SG/auth.json';
import ptTlAuth from './locales/pt-TL/auth.json';

import chatZh from './locales/zh-CN/chat.json';
import chatEn from './locales/en-US/chat.json';
import chatVi from './locales/vi-VN/chat.json';
import chatTh from './locales/th-TH/chat.json';
import chatMy from './locales/my-MM/chat.json';
import chatId from './locales/id-ID/chat.json';
import chatKm from './locales/km-KH/chat.json';
import chatLo from './locales/lo-LA/chat.json';
import chatMsBn from './locales/ms-BN/chat.json';
import chatMsMy from './locales/ms-MY/chat.json';
import chatFil from './locales/fil-PH/chat.json';
import chatEnSg from './locales/en-SG/chat.json';
import chatPtTl from './locales/pt-TL/chat.json';

import commonZh from './locales/zh-CN/common.json';
import commonEn from './locales/en-US/common.json';
import commonVi from './locales/vi-VN/common.json';
import commonTh from './locales/th-TH/common.json';
import commonMy from './locales/my-MM/common.json';
import commonId from './locales/id-ID/common.json';
import commonKm from './locales/km-KH/common.json';
import commonLo from './locales/lo-LA/common.json';
import commonMsBn from './locales/ms-BN/common.json';
import commonMsMy from './locales/ms-MY/common.json';
import commonFil from './locales/fil-PH/common.json';
import commonEnSg from './locales/en-SG/common.json';
import commonPtTl from './locales/pt-TL/common.json';

import aboutZh from './locales/zh-CN/about.json';
import aboutEn from './locales/en-US/about.json';
import aboutVi from './locales/vi-VN/about.json';
import aboutTh from './locales/th-TH/about.json';
import aboutMy from './locales/my-MM/about.json';
import aboutId from './locales/id-ID/about.json';
import aboutKm from './locales/km-KH/about.json';
import aboutLo from './locales/lo-LA/about.json';
import aboutMsBn from './locales/ms-BN/about.json';
import aboutMsMy from './locales/ms-MY/about.json';
import aboutFil from './locales/fil-PH/about.json';
import aboutEnSg from './locales/en-SG/about.json';
import aboutPtTl from './locales/pt-TL/about.json';

import complaintZh from './locales/zh-CN/complaint.json';
import complaintEn from './locales/en-US/complaint.json';
import complaintVi from './locales/vi-VN/complaint.json';
import complaintTh from './locales/th-TH/complaint.json';
import complaintMy from './locales/my-MM/complaint.json';
import complaintId from './locales/id-ID/complaint.json';
import complaintKm from './locales/km-KH/complaint.json';
import complaintLo from './locales/lo-LA/complaint.json';
import complaintMsBn from './locales/ms-BN/complaint.json';
import complaintMsMy from './locales/ms-MY/complaint.json';
import complaintFil from './locales/fil-PH/complaint.json';
import complaintEnSg from './locales/en-SG/complaint.json';
import complaintPtTl from './locales/pt-TL/complaint.json';
import privacyZh from './locales/zh-CN/privacy.json';
import privacyEn from './locales/en-US/privacy.json';
import privacyVi from './locales/vi-VN/privacy.json';
import privacyTh from './locales/th-TH/privacy.json';
import privacyMy from './locales/my-MM/privacy.json';
import privacyId from './locales/id-ID/privacy.json';
import privacyKm from './locales/km-KH/privacy.json';
import privacyLo from './locales/lo-LA/privacy.json';
import privacyMsBn from './locales/ms-BN/privacy.json';
import privacyMsMy from './locales/ms-MY/privacy.json';
import privacyFil from './locales/fil-PH/privacy.json';
import privacyEnSg from './locales/en-SG/privacy.json';
import privacyPtTl from './locales/pt-TL/privacy.json';
import termsZh from './locales/zh-CN/terms.json';
import termsEn from './locales/en-US/terms.json';
import termsVi from './locales/vi-VN/terms.json';
import termsTh from './locales/th-TH/terms.json';
import termsMy from './locales/my-MM/terms.json';
import termsId from './locales/id-ID/terms.json';
import termsKm from './locales/km-KH/terms.json';
import termsLo from './locales/lo-LA/terms.json';
import termsMsBn from './locales/ms-BN/terms.json';
import termsMsMy from './locales/ms-MY/terms.json';
import termsFil from './locales/fil-PH/terms.json';
import termsEnSg from './locales/en-SG/terms.json';
import termsPtTl from './locales/pt-TL/terms.json';
// ✅ 只在"第一次初始化"时读取 localStorage
const savedLang = localStorage.getItem('lang');

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    // ⚠️ 这里的 lng 只作为“初始语言”
    lng: savedLang ?? 'zh-CN',
    fallbackLng: 'zh-CN',
    resources: {
      'zh-CN': {
        landing: zhLanding,
        auth: zhAuth,
        chat: chatZh,
        common: commonZh,
        about: aboutZh,
        complaint: complaintZh,
        privacy: privacyZh,
        terms: termsZh,
      },
      'en-US': {
        landing: enLanding,
        auth: enAuth,
        chat: chatEn,
        common: commonEn,
        about: aboutEn,
        complaint: complaintEn,
        privacy: privacyEn,
        terms: termsEn,
      },
      'vi-VN': {
        landing: viLanding,
        auth: viAuth,
        chat: chatVi,
        common: commonVi,
        about: aboutVi,
        complaint: complaintVi,
        privacy: privacyVi,
        terms: termsVi,
      },
      'th-TH': {
        landing: thLanding,
        auth: thAuth,
        chat: chatTh,
        common: commonTh,
        about: aboutTh,
        complaint: complaintTh,
        privacy: privacyTh,
        terms: termsTh,
      },
      'my-MM': {
        landing: myLanding,
        auth: myAuth,
        chat: chatMy,
        common: commonMy,
        about: aboutMy,
        complaint: complaintMy,
        privacy: privacyMy,
        terms: termsMy,
      },
      'id-ID': {
        landing: idLanding,
        auth: idAuth,
        chat: chatId,
        common: commonId,
        about: aboutId,
        complaint: complaintId,
        privacy: privacyId,
        terms: termsId,
      },
      'km-KH': {
        landing: kmLanding,
        auth: kmAuth,
        chat: chatKm,
        common: commonKm,
        about: aboutKm,
        complaint: complaintKm,
        privacy: privacyKm,
        terms: termsKm,
      },
      'lo-LA': {
        landing: loLanding,
        auth: loAuth,
        chat: chatLo,
        common: commonLo,
        about: aboutLo,
        complaint: complaintLo,
        privacy: privacyLo,
        terms: termsLo,
      },
      'ms-BN': {
        landing: msBnLanding,
        auth: msBnAuth,
        chat: chatMsBn,
        common: commonMsBn,
        about: aboutMsBn,
        complaint: complaintMsBn,
        privacy: privacyMsBn,
        terms: termsMsBn,
      },
      'ms-MY': {
        landing: msMyLanding,
        auth: msMyAuth,
        chat: chatMsMy,
        common: commonMsMy,
        about: aboutMsMy,
        complaint: complaintMsMy,
        privacy: privacyMsMy,
        terms: termsMsMy,
      },
      'fil-PH': {
        landing: filLanding,
        auth: filAuth,
        chat: chatFil,
        common: commonFil,
        about: aboutFil,
        complaint: complaintFil,
        privacy: privacyFil,
        terms: termsFil,
      },
      'en-SG': {
        landing: enSgLanding,
        auth: enSgAuth,
        chat: chatEnSg,
        common: commonEnSg,
        about: aboutEnSg,
        complaint: complaintEnSg,
        privacy: privacyEnSg,
        terms: termsEnSg,
      },
      'pt-TL': {
        landing: ptTlLanding,
        auth: ptTlAuth,
        chat: chatPtTl,
        common: commonPtTl,
        about: aboutPtTl,
        complaint: complaintPtTl,
        privacy: privacyPtTl,
        terms: termsPtTl,
      },
    },
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;
