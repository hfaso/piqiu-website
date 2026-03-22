import "./LoaderModel.css";
import "./LoaderButtons.css";
import LoaderPdbDemo from "../components/demo/LoaderPdb";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

function LoaderPdb() {
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
      <h2 className="basics-title">{t("loaderPdb.title")}</h2>

      <div
        style={{
          marginBottom: 12,
          width: "min(65vw, 100%)",
          marginInline: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "flex-start",
            textAlign: "left",
          }}
        >
          <span>{t("loaderPdb.chooseLocal")}</span>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdb,text/plain"
            onChange={onFileChange}
            style={{ display: "none" }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="loader-action-button"
          >
            {t("loaderPdb.chooseFile")}
          </button>

          <span style={{ opacity: 0.85 }}>
            {file ? file.name : t("loaderPdb.noFileSelected")}
          </span>
        </div>
      </div>

      <LoaderPdbDemo source={file} />

      <div className="case-description">
        <p>{t("loaderPdb.desc")}</p>
        <ul>
          <li>{t("basics.controls.rotate")}</li>
          <li>{t("basics.controls.zoom")}</li>
          <li>{t("basics.controls.pan")}</li>
        </ul>
      </div>
    </div>
  );
}

export default LoaderPdb;
