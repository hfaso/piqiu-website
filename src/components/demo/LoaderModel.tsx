import { useEffect, useRef } from "react";
// import * as piqiu3d from "@piqiu/piqiu3d";
import * as piqiu3d from "piqiu3d";
import { Piqiu3DRenderer } from "./piQiuModule/Piqiu3DRenderer";

type Props = {
  /** 可以传入本地 File，或者一个 URL 字符串；如果为空则使用默认模型 */
  source?: string | File | null;
};

export default function CanvasContainer({ source }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Piqiu3DRenderer | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const loadVersionRef = useRef(0);

  // 初始化渲染器（仅在挂载时）
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = window.innerWidth * 0.5;
    canvas.height = window.innerHeight * 0.5;

    const piqiuRenderer = new Piqiu3DRenderer(canvas, {
      width: canvas.width,
      height: canvas.height,
    });
    rendererRef.current = piqiuRenderer;

    // 卸载时清理
    return () => {
      // revoke any created object URL
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      try {
        piqiuRenderer.removeMouseEventListener();
        piqiuRenderer.dispose();
      } catch (e) {
        // 忽略清理错误
      }
    };
  }, []);

  // 当 source 改变时（包括首次挂载），加载模型
  useEffect(() => {
    if (!rendererRef.current) return;

    let src: string;
    // 清理上一个 object URL（如果有）
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (!source) {
      src = `${import.meta.env.BASE_URL}models/bird.glb`;
    } else if (typeof source === "string") {
      src = source;
    } else {
      // File
      objectUrlRef.current = URL.createObjectURL(source);
      src = objectUrlRef.current;
    }

    const loadModel = async () => {
      const piqiuRenderer = rendererRef.current!;
      const version = ++loadVersionRef.current;
      const loader = new piqiu3d.GLTFLoader();
      console.log("LoaderModel: start loading", src);

      try {
        const m = piqiuRenderer.model;
        if (m) {
          if (typeof m.clear === "function") {
            m.clear();
          }
        }
      } catch (e) {
        // ignore
      }

      const meshes = await loader.load(piqiuRenderer.renderContext, src);
      if (version !== loadVersionRef.current) return;
      for (const mesh of meshes) {
        piqiuRenderer.addPart(mesh);
      }
      piqiuRenderer.updateCamera();
    };

    loadModel();
    rendererRef.current.addGeneralEventListener();
  }, [source]);

  return (
    <div>
      <canvas ref={canvasRef} id="demo"></canvas>
    </div>
  );
}
