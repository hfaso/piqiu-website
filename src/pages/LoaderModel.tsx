import './LoaderModel.css';
import LoaderModelDemo from '../components/demo/LoaderModel'

function LoaderModel() {
    return (
        <div className="basics-container">
            <h2 className="basics-title">基础案例：加载立方体</h2>
            {/* 三维画布区域 */}
            <LoaderModelDemo></LoaderModelDemo>
            {/* 案例说明区域 */}
            <div className="case-description">
                <p>这个案例展示了一个基础的三维立方体。它实现了自动旋转动画，并且你可以通过鼠标进行交互：</p>
                <ul>
                    <li>左键拖动：旋转视角</li>
                    <li>滚轮缩放：放大/缩小</li>
                    <li>右键拖动：平移场景</li>
                </ul>
            </div>
        </div>
    )
}

export default LoaderModel;