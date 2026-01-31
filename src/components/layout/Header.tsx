// components/layout/Header.tsx
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navigationItems = [
    { path: '/', label: '首页', icon: '🏠' },
    { path: '/basics', label: '基础案例', icon: '⭐' },
    { path: '/loaderModel', label: '加载模型', icon: '⭐' },
    { path: '/gallery', label: '案例画廊', icon: '🎨' },
    { path: '/interaction', label: '交互案例', icon: '👆' },
  ];

  const isActiveLink = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="header">
      <div className="header-container">
        {/* Logo和品牌标识 */}
        <Link to="/" className="brand">
          <div className="logo">🚀</div>
          <span className="brand-name">piqiu案例库</span>
        </Link>

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