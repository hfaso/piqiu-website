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
  const { t } = useTranslation();

  const isHomePage = location.pathname === '/home';

  return (
    <div className="layout">
      <Header />

      <main
        className={`main-content ${
          isHomePage ? 'home-layout' : 'page-layout'
        }`}
      >
        {children}
      </main>

      <footer className="footer">
        <p>{t('footer.title')}</p>
      </footer>
    </div>
  );
}

export default Layout;
