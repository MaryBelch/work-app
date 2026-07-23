import { useState, useEffect, useCallback } from 'react';
import { login, getToken, setToken, setUser, getUser } from './api';
import Services from './components/Services';
import Calculator from './components/Calculator';
import Purchases from './components/Purchases';
import Equipment from './components/Equipment';
import type { UserInfo } from './types';

type TabKey = 'services' | 'calculator' | 'purchases-poly' | 'purchases-epoxy' | 'equipment';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'services', label: 'Услуги', icon: '📋' },
  { key: 'calculator', label: 'Калькулятор', icon: '🧮' },
  { key: 'purchases-poly', label: 'Закупки(полигр)', icon: '📦' },
  { key: 'purchases-epoxy', label: 'Закупки(эпокси)', icon: '🧪' },
  { key: 'equipment', label: 'Обладнання', icon: '🖨️' },
];

// Объявляем тип Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          showProgress: () => void;
          hideProgress: () => void;
        };
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        contentSafeAreaInset?: {
          top: number;
          bottom: number;
          left: number;
          right: number;
        };
        onEvent: (event: string, callback: () => void) => void;
        offEvent: (event: string, callback: () => void) => void;
      };
    };
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('calculator');
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'denied' | 'error'>('loading');
  const [user, setUserInfo] = useState<UserInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const getTelegramInitData = useCallback((): string | null => {
    // В первую очередь пытаемся получить из Telegram WebApp
    const tg = window.Telegram?.WebApp;
    if (tg?.initData) {
      return tg.initData;
    }

    // Для тестирования вне Telegram — из localStorage или query params
    const fromStorage = localStorage.getItem('tg_init_data');
    if (fromStorage) return fromStorage;

    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('tgWebAppData') || params.get('initData');
    if (fromUrl) return decodeURIComponent(fromUrl);

    return null;
  }, []);

  useEffect(() => {
    async function authenticate() {
      try {
        // Если уже есть токен — проверяем его
        const existingToken = getToken();
        if (existingToken) {
          setAuthState('authenticated');
          return;
        }

        const initData = getTelegramInitData();

        if (!initData) {
          // Режим разработки: demo-доступ
          console.warn('⚠️ Telegram WebApp не обнаружен. Используется демо-режим.');
          setAuthState('authenticated');
          setUserInfo({ telegram_id: 'demo', name: 'Demo User' });
          return;
        }

        const result = await login(initData);
        setToken(result.token);
        setUser(result.user);
        setUserInfo(result.user);
        setAuthState('authenticated');

        // Уведомляем Telegram, что приложение готово
        window.Telegram?.WebApp?.ready();
        window.Telegram?.WebApp?.expand();

      } catch (err: any) {
        console.error('Auth error:', err);
        if (err.message === 'Доступ запрещён') {
          setAuthState('denied');
        } else {
          setAuthState('error');
          setErrorMsg(err.message || 'Ошибка авторизации');
        }
      }
    }

    authenticate();
  }, [getTelegramInitData]);

  // Отображаем нижнюю панель Telegram в продакшене + safe area insets
  useEffect(() => {
    if (authState === 'authenticated') {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.ready();

        // Применяем safe area insets от Telegram (для Desktop window controls)
        const insets = tg.contentSafeAreaInset;
        if (insets) {
          const root = document.documentElement;
          root.style.setProperty('--tg-safe-top', `${insets.top}px`);
          root.style.setProperty('--tg-safe-bottom', `${insets.bottom}px`);
          root.style.setProperty('--tg-safe-left', `${insets.left}px`);
          root.style.setProperty('--tg-safe-right', `${insets.right}px`);
        }
      }
    }
  }, [authState]);

  // Слушаем изменения viewport (Telegram Desktop меняет размер окна)
  useEffect(() => {
    if (authState !== 'authenticated') return;
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    const handleViewport = () => {
      const insets = tg.contentSafeAreaInset;
      if (insets) {
        const root = document.documentElement;
        root.style.setProperty('--tg-safe-top', `${insets.top}px`);
        root.style.setProperty('--tg-safe-bottom', `${insets.bottom}px`);
        root.style.setProperty('--tg-safe-left', `${insets.left}px`);
        root.style.setProperty('--tg-safe-right', `${insets.right}px`);
      }
    };

    // Telegram вызывает viewportChange при изменении размеров
    tg.onEvent('viewportChanged', handleViewport);
    return () => {
      tg.offEvent('viewportChanged', handleViewport);
    };
  }, [authState]);

  if (authState === 'loading') {
    return (
      <div className="app" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="loading">
          <div className="spinner" />
          <span>Авторизация...</span>
        </div>
      </div>
    );
  }

  if (authState === 'denied') {
    return (
      <div className="app" style={{ justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <div className="text-center">
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
          <h2 style={{ marginBottom: 8 }}>Доступ запрещён</h2>
          <p className="text-muted" style={{ maxWidth: 300 }}>
            У вас нет прав для использования этого приложения.
            Обратитесь к администратору.
          </p>
        </div>
      </div>
    );
  }

  if (authState === 'error') {
    return (
      <div className="app" style={{ justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <div className="text-center">
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ marginBottom: 8 }}>Ошибка</h2>
          <p className="text-muted">{errorMsg}</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 16, maxWidth: 200 }}
            onClick={() => window.location.reload()}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-content">
        {activeTab === 'services' && <Services />}
        {activeTab === 'calculator' && <Calculator />}
        {activeTab === 'purchases-poly' && <Purchases type="poligraphy" />}
        {activeTab === 'purchases-epoxy' && <Purchases type="epoxy" />}
        {activeTab === 'equipment' && <Equipment />}
      </div>

      <div className="tab-bar">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
