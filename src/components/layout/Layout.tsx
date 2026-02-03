// components/layout/Layout.tsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from './Header';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const { t } = useTranslation();
  
  return (
    <div className="layout">
      {/* 头部导航 - 固定在上方 */}
      <Header />
      
      {/* 主要内容区域 */}
      <main className={`main-content ${isHomePage ? 'home-layout' : 'page-layout'}`}>
        {children}
      </main>
      
      {/* 可选的页脚 */}
      <footer className="footer">
        <p>{t('footer.title')}</p>
      </footer>
    </div>
  );
}

export default Layout;