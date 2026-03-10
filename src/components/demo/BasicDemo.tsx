import { useEffect, useRef } from "react";
import "./piQiuModule/common/CanvasLoadingOverlay.css";
// import * as piqiu3d from '@piqiu/piqiu3d'
import * as piqiu3d from "piqiu3d";
import { Piqiu3DRenderer } from "./piQiuModule/Piqiu3DRenderer";

export default function CanvasContainer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Piqiu3DRenderer | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = window.innerWidth * 0.65;
    canvas.height = window.innerHeight * 0.65;

    const piqiuRenderer = new Piqiu3DRenderer(canvas, {
      width: canvas.width,
      height: canvas.height,
    });
    rendererRef.current = piqiuRenderer;

    const cubePart = new piqiu3d.CubePart(1, 1, 1);

    piqiuRenderer.addPart(cubePart);

    piqiuRenderer.addGeneralEventListener();

    piqiuRenderer.updateCamera();

    return () => {
      try {
        piqiuRenderer.removeGeneralEventListener();
        piqiuRenderer.dispose();
      } catch {
        // ignore cleanup errors
      }
    };
  }, []);

  return (
    <div className="canvas-stage">
      <canvas ref={canvasRef} id="demo"></canvas>
    </div>
  );
}
