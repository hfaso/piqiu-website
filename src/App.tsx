// App.tsx (更新版)
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from './components/layout/Layout';

// 使用懒加载引入页面组件
const Home = lazy(() => import('./pages/Home'));
const Basics = lazy(() => import('./pages/Basics'));
const LoaderModel = lazy(() => import('./pages/LoaderModel'));
const Gallery = lazy(() => import('./pages/Gallery'));
// 导入其他页面组件...

function App() {
  return (
    <Router>
      <Layout>
        <Suspense fallback={
          <div className="loading-fallback">
            <div className="spinner"></div>
            <p>三维场景加载中...</p>
          </div>
        }>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/basics" element={<Basics />} />
            <Route path="/loaderModel" element={<LoaderModel />} />
            <Route path="/gallery" element={<Gallery />} />
            {/* 其他路由 */}
            <Route path="*" element={<div>页面不存在</div>} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
}

export default App;