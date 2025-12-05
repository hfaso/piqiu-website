// components/layout/Layout.tsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  
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
        <p>piqiu3d案例库</p>
      </footer>
    </div>
  );
}

export default Layout;