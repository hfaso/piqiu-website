import { useEffect, useRef } from "react";
import * as piqiu3d from "piqiu3d";
import { Piqiu3DRenderer } from "../Piqiu3DRenderer";

type Props = {
  source?: string | File | null;
};

export default function CanvasContainer({ source }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Piqiu3DRenderer | null>(null);
  const objectUrlRef = useRef<string | null>(null);

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

    return () => {
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
      src = `${import.meta.env.BASE_URL}models/chejia.zip`;
    } else if (typeof source === "string") {
      src = source;
    } else {
      // File
      objectUrlRef.current = URL.createObjectURL(source);
      src = objectUrlRef.current;
    }

    const loadModel = async () => {
      const piqiuRenderer = rendererRef.current!;

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

      const { data, ArrayBuffer } = await piqiu3d.Loader.loadZip(src);
      const { database } = new piqiu3d.LoadDataBase(data, "surface");
      debugger;
      const res = {
        ...data,
        database,
        ArrayBuffer,
      };
      piqiuRenderer.loadSiumlationFile(res);
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
