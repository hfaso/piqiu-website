// Basics.tsx
import './Basics.css'; // 引入样式文件
// 记得也要引入你的 CanvasContainer 和 RotatingCube 组件
// import CanvasContainer from '../components/CanvasContainer';
// import RotatingCube from '../components/scenes/RotatingCube'; // 假设你的立方体组件在这个路径
import BasicDemo from '../components/demo/BasicDemo'
import { useTranslation } from 'react-i18next';

function Basics() {
    const { t } = useTranslation();
    return (
        <div className="basics-container">
            <h2 className="basics-title">{t('basics.title')}</h2>
            {/* 三维画布区域 */}
            {/* <CanvasContainer>
                <RotatingCube />
            </CanvasContainer> */}
            {/* 案例说明区域 */}
            <BasicDemo></BasicDemo>
            <div className="case-description">
                <p>{t('basics.desc')}</p>
                <ul>
                    <li>{t('basics.controls.rotate')}</li>
                    <li>{t('basics.controls.zoom')}</li>
                    <li>{t('basics.controls.pan')}</li>
                </ul>
            </div>
        </div>
    )
}

export default Basics;