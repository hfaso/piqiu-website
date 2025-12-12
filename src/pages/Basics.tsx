// Basics.tsx
import './Basics.css'; // 引入样式文件
// 记得也要引入你的 CanvasContainer 和 RotatingCube 组件
// import CanvasContainer from '../components/CanvasContainer';
// import RotatingCube from '../components/scenes/RotatingCube'; // 假设你的立方体组件在这个路径
import BasicDemo from '../components/demo/BasicDemo'

function Basics() {
    return (
        <div className="basics-container">
            <h2 className="basics-title">基础案例：加载立方体</h2>
            {/* 三维画布区域 */}
            {/* <CanvasContainer>
                <RotatingCube />
            </CanvasContainer> */}
            {/* 案例说明区域 */}
            <BasicDemo></BasicDemo>
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

export default Basics;