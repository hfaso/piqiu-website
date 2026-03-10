import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import * as piqiu3d from "piqiu3d";
import { Piqiu3DRenderer, type RenderMode } from "../Piqiu3DRenderer";
import CanvasLoadingOverlay from "../common/CanvasLoadingOverlay";

type Props = {
  source?: string | File | null;
};

export default function CanvasContainer({ source }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Piqiu3DRenderer | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const simulationDataRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [renderMode, setRenderMode] = useState<RenderMode>("surface_with_wireframe");
  const renderModeRef = useRef<RenderMode>("surface_with_wireframe");

  const applySimulationData = useCallback(
    (data: any, resetCamera: boolean, mode: RenderMode) => {
      const piqiuRenderer = rendererRef.current;
      if (!piqiuRenderer || !data) return;
      try {
        const m = piqiuRenderer.model;
        if (m && typeof m.clear === "function") {
          m.clear();
        }
      } catch (e) {
        // ignore
      }
      piqiuRenderer.loadSiumlationFile(data, { renderMode: mode });
      if (resetCamera) {
        piqiuRenderer.updateCamera();
        return;
      }
      piqiuRenderer.model.update(true);
      piqiuRenderer.requestRender();
    },
    [],
  );

  useEffect(() => {
    renderModeRef.current = renderMode;
  }, [renderMode]);

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
        // ignore cleanup errors
      }
    };
  }, []);

  useEffect(() => {
    if (!rendererRef.current) return;
    const piqiuRenderer = rendererRef.current;
    let canceled = false;

    let src: string;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (!source) {
      src = `${import.meta.env.BASE_URL}models/mesh2.zip`;
    } else if (typeof source === "string") {
      src = source;
    } else {
      objectUrlRef.current = URL.createObjectURL(source);
      src = objectUrlRef.current;
    }

    const loadModel = async () => {
      setIsLoading(true);
      simulationDataRef.current = null;
      try {
        const { data, ArrayBuffer } = await piqiu3d.Loader.loadZip(src);
        if (canceled || rendererRef.current !== piqiuRenderer) return;
        const { database } = new piqiu3d.LoadDataBase(data, "mesh");
        const res = {
          ...data,
          database,
          ArrayBuffer,
        };
        simulationDataRef.current = res;
        applySimulationData(res, true, renderModeRef.current);
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
  }, [source, applySimulationData]);

  useEffect(() => {
    if (!rendererRef.current) return;
    const data = simulationDataRef.current;
    if (!data) return;
    applySimulationData(data, false, renderMode);
  }, [renderMode, applySimulationData]);

  const onRenderModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setRenderMode(event.target.value as RenderMode);
  };

  return (
    <div>
      <div
        style={{ marginBottom: 10, width: "min(65vw, 100%)", marginInline: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "flex-start", textAlign: "left" }}>
          <label>
            <span style={{ marginRight: 6 }}>Render Mode</span>
            <select value={renderMode} onChange={onRenderModeChange}>
              <option value="wireframe">Wireframe</option>
              <option value="surface_with_wireframe">Surface + Wireframe</option>
              <option value="surface">Surface</option>
            </select>
          </label>
        </div>
      </div>
      <div className="canvas-stage">
        <canvas ref={canvasRef} id="demo"></canvas>
        <CanvasLoadingOverlay loading={isLoading} />
      </div>
    </div>
  );
}
