// components/layout/Header.tsx
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Header.css';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const navigationItems = [
    { path: '/home', label: t('nav.home'), icon: '🏠' },
    { path: '/basics', label: t('nav.basics'), icon: '⭐' },
    { path: '/loaderModel', label: t('nav.loaderModel'), icon: '⭐' },
    { path: '/gallery', label: t('nav.gallery'), icon: '🎨' },
  ];

  const currentLang = i18n.resolvedLanguage || i18n.language || 'zh';
  const lang = currentLang.startsWith('en') ? 'en' : 'zh';
  const switchTo = (next: 'zh' | 'en') => void i18n.changeLanguage(next);

  return (
    <header className="header">
      <div className="header-container">
        {/* Logo & Brand */}
        <div className="brand-area">
          {/* ✅ Logo 永远回到 /home */}
          <NavLink to="/home" className="brand">
            <div className="logo">🚀</div>
            <span className="brand-name">{t('brand.name')}</span>
          </NavLink>

          {/* 语言切换 */}
          <div className="lang-switch" aria-label={t('language.switch')}>
            <button
              type="button"
              className={`lang-option ${lang === 'zh' ? 'active' : ''}`}
              onClick={() => switchTo('zh')}
            >
              中文
            </button>
            <span className="lang-sep">|</span>
            <button
              type="button"
              className={`lang-option ${lang === 'en' ? 'active' : ''}`}
              onClick={() => switchTo('en')}
            >
              EN
            </button>
          </div>
        </div>

        {/* 桌面端导航 */}
        <nav className="desktop-nav">
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* 移动端菜单按钮 */}
        <button
          className="mobile-menu-button"
          onClick={() => setIsMenuOpen((v) => !v)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* 移动端菜单 */}
      <nav className={`mobile-nav ${isMenuOpen ? 'open' : ''}`}>
        <div style={{ padding: '12px 16px' }}>
          <div className="lang-switch mobile">
            <button
              type="button"
              className={`lang-option ${lang === 'zh' ? 'active' : ''}`}
              onClick={() => switchTo('zh')}
            >
              中文
            </button>
            <span className="lang-sep">|</span>
            <button
              type="button"
              className={`lang-option ${lang === 'en' ? 'active' : ''}`}
              onClick={() => switchTo('en')}
            >
              EN
            </button>
          </div>
        </div>

        {navigationItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `mobile-nav-link ${isActive ? 'active' : ''}`
            }
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

export default Header;