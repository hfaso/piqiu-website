import "./LoaderModel.css";
import LoaderModelDemo from "../components/demo/LoaderModel";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

function LoaderModel() {
  const [file, setFile] = useState<File | null>(null);
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files && e.target.files[0];
    if (f) setFile(f);
    else setFile(null);
  }

  return (
    <div className="basics-container">
      <h2 className="basics-title">{t("loaderModel.title")}</h2>

      {/* 文件选择：支持 .gltf/.glb 本地文件，未选择时使用默认模型 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span>{t("loaderModel.chooseLocal")}</span>

          <input
            ref={fileInputRef}
            type="file"
            accept=".gltf,.glb,model/gltf+json,model/gltf-binary"
            onChange={onFileChange}
            style={{ display: "none" }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "inherit",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 10,
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            {t("loaderModel.chooseFile")}
          </button>

          <span style={{ opacity: 0.85 }}>
            {file ? file.name : t("loaderModel.noFileSelected")}
          </span>
        </div>
      </div>

      {/* 三维画布区域，传入选择的文件（如果有） */}
      <LoaderModelDemo source={file}></LoaderModelDemo>

      {/* 案例说明区域 */}
      <div className="case-description">
        <p>{t("loaderModel.desc")}</p>
        <ul>
          <li>{t("basics.controls.rotate")}</li>
          <li>{t("basics.controls.zoom")}</li>
          <li>{t("basics.controls.pan")}</li>
        </ul>
      </div>
    </div>
  );
}

export default LoaderModel;
