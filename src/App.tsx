import {
  HashRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from './components/layout/Layout';

const Home = lazy(() => import('./pages/Home'));
const Basics = lazy(() => import('./pages/Basics'));
const LoaderModel = lazy(() => import('./pages/LoaderModel'));
const Gallery = lazy(() => import('./pages/Gallery'));

function App() {
  const { t } = useTranslation();

  return (
    <HashRouter>
      <Layout>
        <Suspense
          fallback={
            <div className="loading-fallback">
              <div className="spinner"></div>
              <p>{t('app.loading3d')}</p>
            </div>
          }
        >
          <Routes>
            {/* 根路径重定向 */}
            <Route path="/" element={<Navigate to="/home" replace />} />

            {/* 正常页面路由 */}
            <Route path="/home" element={<Home />} />
            <Route path="/basics" element={<Basics />} />
            <Route path="/loaderModel" element={<LoaderModel />} />
            <Route path="/gallery" element={<Gallery />} />

            {/* 兜底 */}
            <Route path="*" element={<div>{t('app.notFound')}</div>} />
          </Routes>
        </Suspense>
      </Layout>
    </HashRouter>
  );
}

export default App;
