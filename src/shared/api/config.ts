import { API_BASE } from '../utils/env';

const BASE = API_BASE ?? 'https://api.asepal.cn';
const TOKEN_KEY = 'auth_token';

type Endpoints = {
  base: string;
  auth: {
    login: string;
    register: string;
    logout: string;
    resetPassword: string;
    forgotPassword: string;
  };
  user: {
    info: string;
    update: string;
    avatar: string;
  };
  complaint: {
    submit: string;
    list: string;
  };
  chat: {
    send: string;
    history: string;
    conversations: string;
    messages: string;
    stream: string;
  };
};

export const API: Endpoints = {
  base: BASE,
  auth: {
    //登录接口
    login: `${BASE}/auth/login`,
    //注册接口
    register: `${BASE}/auth/register`,
    //退出接口
    logout: `${BASE}/auth/logout`,
    //忘记密码接口
    resetPassword: `${BASE}/auth/reset-password`,
    //验证码发送接口
    forgotPassword: `${BASE}/auth/forgot-password`,
  },
  user: {
    //
    info: `${BASE}/user/info`,
    //用户信息更新
    update: `${BASE}/user/update`,
    //用户头像更新
    avatar: `${BASE}/user/image`,
  },
  complaint: {
    //
    submit: `${BASE}/complaint/submit`,
    //
    list: `${BASE}/complaint/list`,
  },
  chat: {
    //聊天信息接口
    send: `${BASE}/chat/send`,
    //
    history: `${BASE}/chat/history`,
    // 对话列表
    conversations: `${BASE}/chat/conversations`,
    // 对话历史消息
    messages: `${BASE}/chat/messages`,
    // ⭐ SSE 流式接口
    stream: `${BASE}/chat/stream`,
  },
};

export function withParam(url: string, params: Record<string, string | number>) {
  let result = url;
  Object.keys(params).forEach((key) => {
    result = result.replace(new RegExp(`:${key}`, 'g'), String(params[key]));
  });
  return result;
}

export default API;

export async function apiRequest(
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
  } = {},
) {
  const token = localStorage.getItem(TOKEN_KEY);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // token 失效统一处理
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }

  return res;
}
