import "./LoaderModel.css";
import LoaderModelDemo from "../components/demo/LoaderModel";
import React, { useState } from "react";

function LoaderModel() {
  const [file, setFile] = useState<File | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files && e.target.files[0];
    if (f) setFile(f);
    else setFile(null);
  }

  return (
    <div className="basics-container">
      <h2 className="basics-title">基础案例：加载gltf模型</h2>

      {/* 文件选择：支持 .gltf/.glb 本地文件，未选择时使用默认模型 */}
      <div style={{ marginBottom: 12 }}>
        <label>
          选择本地模型：
          <input
            type="file"
            accept=".gltf,.glb,model/gltf+json,model/gltf-binary"
            onChange={onFileChange}
            style={{ marginLeft: 8 }}
          />
        </label>
      </div>

      {/* 三维画布区域，传入选择的文件（如果有） */}
      <LoaderModelDemo source={file}></LoaderModelDemo>

      {/* 案例说明区域 */}
      <div className="case-description">
        <p>这个案例展示了加载gltf模型功能。你可以通过鼠标进行交互：</p>
        <ul>
          <li>左键拖动：旋转视角</li>
          <li>滚轮缩放：放大/缩小</li>
          <li>右键拖动：平移场景</li>
        </ul>
      </div>
    </div>
  );
}

export default LoaderModel;
