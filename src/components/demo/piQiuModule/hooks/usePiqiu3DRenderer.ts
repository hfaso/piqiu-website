/**
 * 公共的 Piqiu3D 渲染器 Hook
 * 封装重复的渲染器初始化和清理逻辑
 */

import { useCallback, useEffect, useRef, useState } from "react";
import * as piqiu3d from "piqiu3d";
import { Piqiu3DRenderer } from "../Piqiu3DRenderer";
import type { RenderMode, PartNode } from "../types";
import { revokeObjectUrl } from "../utils";

export interface UsePiqiu3DRendererOptions {
  defaultModelUrl?: string;
  modelType?: "surface" | "mesh" | "shader";
}

export interface UsePiqiu3DRendererReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  rendererRef: React.RefObject<Piqiu3DRenderer | null>;
  isLoading: boolean;
  partTree: PartNode[];
  renderMode: RenderMode;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setPartTree: React.Dispatch<React.SetStateAction<PartNode[]>>;
  setRenderMode: React.Dispatch<React.SetStateAction<RenderMode>>;
  loadModel: (source?: string | File | null) => Promise<void>;
  applySimulationData: (
    data: unknown,
    resetCamera: boolean,
    mode: RenderMode,
  ) => void;
}

export function usePiqiu3DRenderer(
  options: UsePiqiu3DRendererOptions = {},
): UsePiqiu3DRendererReturn {
  const { defaultModelUrl, modelType = "surface" } = options;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Piqiu3DRenderer | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const simulationDataRef = useRef<unknown>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [renderMode, setRenderMode] = useState<RenderMode>(
    "surface_with_wireframe",
  );
  const [partTree, setPartTree] = useState<PartNode[]>([]);

  const renderModeRef = useRef<RenderMode>("surface_with_wireframe");

  // 同步 renderMode 到 ref
  useEffect(() => {
    renderModeRef.current = renderMode;
  }, [renderMode]);

  // 应用模拟数据的公共逻辑
  const applySimulationData = useCallback(
    (data: unknown, resetCamera: boolean, mode: RenderMode) => {
      const piqiuRenderer = rendererRef.current;
      if (!piqiuRenderer || !data) return;

      try {
        const m = piqiuRenderer.model;
        if (m && typeof m.clear === "function") {
          m.clear();
        }
      } catch {
        // ignore
      }

      piqiuRenderer.loadSiumlationFile(
        data as Parameters<typeof piqiuRenderer.loadSiumlationFile>[0],
        {
          renderMode: mode,
        },
      );
      piqiuRenderer.setAllPartsVisible(true);

      if (resetCamera) {
        piqiuRenderer.updateCamera();
      } else {
        piqiuRenderer.requestRender();
      }

      setPartTree(piqiuRenderer.getPartTree());
    },
    [],
  );

  // 初始化渲染器
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
      revokeObjectUrl(objectUrlRef.current);
      objectUrlRef.current = null;

      try {
        piqiuRenderer.removeGeneralEventListener();
        piqiuRenderer.dispose();
      } catch {
        // ignore cleanup errors
      }
    };
  }, []);

  // 加载模型的公共逻辑
  const loadModel = useCallback(
    async (source?: string | File | null) => {
      const piqiuRenderer = rendererRef.current;
      if (!piqiuRenderer) return;

      // 清理之前的 Object URL
      revokeObjectUrl(objectUrlRef.current);
      objectUrlRef.current = null;

      let src: string;
      if (!source) {
        src = defaultModelUrl || `${import.meta.env.BASE_URL}models/chejia.zip`;
      } else if (typeof source === "string") {
        src = source;
      } else {
        objectUrlRef.current = URL.createObjectURL(source);
        src = objectUrlRef.current;
      }

      setIsLoading(true);
      setPartTree([]);
      simulationDataRef.current = null;

      try {
        const { data, ArrayBuffer } = await piqiu3d.Loader.loadZip(src);
        if (!rendererRef.current || rendererRef.current !== piqiuRenderer)
          return;

        const { database } = new piqiu3d.LoadDataBase(data, modelType);
        const res = {
          ...data,
          database,
          ArrayBuffer,
        };

        simulationDataRef.current = res;
        applySimulationData(res, true, renderModeRef.current);
      } catch {
        // ignore load errors
      } finally {
        if (rendererRef.current === piqiuRenderer) {
          setIsLoading(false);
        }
      }
    },
    [defaultModelUrl, modelType, applySimulationData],
  );

  return {
    canvasRef,
    rendererRef,
    isLoading,
    partTree,
    renderMode,
    setIsLoading,
    setPartTree,
    setRenderMode,
    loadModel,
    applySimulationData,
  };
}
