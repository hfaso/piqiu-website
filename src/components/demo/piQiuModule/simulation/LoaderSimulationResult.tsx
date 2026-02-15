import { useEffect, useRef, useState } from "react";
import * as piqiu3d from "piqiu3d";
import { Piqiu3DRenderer } from "../Piqiu3DRenderer";
import CanvasLoadingOverlay from "../common/CanvasLoadingOverlay";

type Props = {
  source?: string | File | null;
};

export default function CanvasContainer({ source }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Piqiu3DRenderer | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    piqiuRenderer.addGeneralEventListener();

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      try {
        piqiuRenderer.removeGeneralEventListener();
        piqiuRenderer.dispose();
      } catch (e) {
        // 忽略清理错误
      }
    };
  }, []);

  // 当 source 改变时（包括首次挂载），加载模型
  useEffect(() => {
    if (!rendererRef.current) return;
    const piqiuRenderer = rendererRef.current;
    let canceled = false;

    let src: string;
    // 清理上一个 object URL（如果有）
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (!source) {
      src = `${import.meta.env.BASE_URL}models/post.zip`;
    } else if (typeof source === "string") {
      src = source;
    } else {
      // File
      objectUrlRef.current = URL.createObjectURL(source);
      src = objectUrlRef.current;
    }

    const loadModel = async () => {
      setIsLoading(true);
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

      try {
        const { data, ArrayBuffer } = await piqiu3d.Loader.loadZip(src);
        if (canceled || rendererRef.current !== piqiuRenderer) return;
        const { database } = new piqiu3d.LoadDataBase(data, "shader");
        const res = {
          ...data,
          database,
          ArrayBuffer,
        };
        piqiuRenderer.loadSiumlationFile(res);
        piqiuRenderer.updateCamera();
      } catch (e) {
        // ignore
      } finally {
        if (!canceled && rendererRef.current === piqiuRenderer) {
          setIsLoading(false);
        }
      }
    };

    void loadModel();
    return () => {
      canceled = true;
    };
  }, [source]);

  return (
    <div className="canvas-stage">
      <canvas ref={canvasRef} id="demo"></canvas>
      <CanvasLoadingOverlay loading={isLoading} />
    </div>
  );
}
