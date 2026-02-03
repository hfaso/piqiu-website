import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Home.css';

interface CaseItem {
  id: string;
  title: string;
  desc: string;
  tag: string;
  route: string;
}

export default function Home() {
  const { t } = useTranslation();
  const CASES: CaseItem[] = [
    {
      id: 'basics',
      title: t('home.cases.basics.title'),
      desc: t('home.cases.basics.desc'),
      tag: 'Geometry',
      route: '/basics'
    },
    {
      id: 'postprocess',
      title: t('home.cases.postprocess.title'),
      desc: t('home.cases.postprocess.desc'),
      tag: 'PostProcess',
      route: '/gallery'
    }
  ];

  return (
    <div className="home-container">
      <section className="home-hero fade-in">
        <h1 className="home-title">{t('home.title')}</h1>
        <p className="home-subtitle">
          {t('home.subtitle')}
        </p>

        <nav className="nav-links">
          <Link to="/basics" className="nav-link">{t('home.navBasics')}</Link>
          <Link to="/gallery" className="nav-link">{t('home.navGallery')}</Link>
        </nav>
      </section>

      {/* ===== 主页主体左右分栏 ===== */}
      <section className="home-main fade-in">
        {/* 左侧：说明 / 定位 */}
        <div className="home-main-left">
          <h2>{t('home.aboutTitle')}</h2>
          <p>
            {t('home.aboutP1')}
          </p>

          <p className="mt-md">
            {t('home.featuresTitle')}
          </p>
          <ul className="feature-list">
            <li>{t('home.features.gltf')}</li>
            <li>{t('home.features.geometry')}</li>
            <li>{t('home.features.postprocess')}</li>
            <li>{t('home.features.architecture')}</li>
          </ul>
        </div>

        {/* 右侧：案例合集（你要的） */}
        <div className="home-main-right">
          <h2 className="case-collection-title">{t('home.casesTitle')}</h2>

          <ul className="case-list">
            {CASES.map(item => (
              <li key={item.id} className="case-item">
                <Link to={item.route}>
                  <div className="case-item-header">
                    <span className="case-name">{item.title}</span>
                    <span className="case-tag">{item.tag}</span>
                  </div>
                  <p className="case-desc">{item.desc}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
