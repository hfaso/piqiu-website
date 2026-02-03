// components/layout/Header.tsx
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Header.css';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const navigationItems = [
    { path: '/', label: t('nav.home'), icon: '🏠' },
    { path: '/basics', label: t('nav.basics'), icon: '⭐' },
    { path: '/loaderModel', label: t('nav.loaderModel'), icon: '⭐' },
    { path: '/gallery', label: t('nav.gallery'), icon: '🎨' },
  ];

  const isActiveLink = (path: string) => {
    return location.pathname === path;
  };

  const currentLang = i18n.resolvedLanguage || i18n.language || 'zh';
  const lang = currentLang.startsWith('en') ? 'en' : 'zh';
  const switchTo = (next: 'zh' | 'en') => void i18n.changeLanguage(next);

  return (
    <header className="header">
      <div className="header-container">
        {/* Logo和品牌标识 */}
        <div className="brand-area">
          <Link to="/" className="brand">
            <div className="logo">🚀</div>
            <span className="brand-name">{t('brand.name')}</span>
          </Link>

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

        {/* 桌面端导航菜单 */}
        <nav className="desktop-nav">
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${isActiveLink(item.path) ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* 移动端汉堡菜单 */}
        <button 
          className="mobile-menu-button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* 移动端下拉菜单 */}
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
          <Link
            key={item.path}
            to={item.path}
            className={`mobile-nav-link ${isActiveLink(item.path) ? 'active' : ''}`}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export default Header;