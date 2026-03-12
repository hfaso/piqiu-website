/**
 * Piqiu3D 渲染器封装类
 * 提供 3D 模型加载、渲染和交互功能
 */

import * as piqiu3d from "piqiu3d";
import { get } from "lodash";
import { MouseHandler } from "./handler/MouseHandler";
import { vec2, vec3 } from "gl-matrix";
import type { PartNode, SimulationData } from "./types";

export type { PartNode };
export type RenderMode = "wireframe" | "surface_with_wireframe" | "surface";

export class Piqiu3DRenderer {
  // Canvas 和渲染上下文
  private canvas: HTMLCanvasElement;
  public renderContext: piqiu3d.RenderContext;
  private renderPass: piqiu3d.RenderPass;
  public scene: piqiu3d.Scene;
  public mouseHandler: MouseHandler;

  // 设备像素比
  public dpr = Math.min(window.devicePixelRatio || 1, 2);

  // 边界框
  private _boundingBox: piqiu3d.BoundingBox | undefined;

  // 后处理数据可绘制对象
  private postDataDrawables: piqiu3d.PostDataDrawable[] = [];

  // 渲染模式缓存
  private lastSimulationRenderMode: RenderMode | null = null;

  // 动画帧 ID
  private pendingRender: number | null = null;

  // Resize 观察器
  private resizeObserver: ResizeObserver | null = null;
  private lastSize: { width: number; height: number } | null = null;

  // 预创建的 Tool 实例（性能优化）
  private wheelZoomTool: piqiu3d.WheelZoomTool | null = null;
  private resetTool: piqiu3d.ResetTool | null = null;

  /**
   * 请求渲染
   */
  public requestRender = (): void => {
    if (this.pendingRender !== null) return;

    this.pendingRender = window.requestAnimationFrame(() => {
      this.pendingRender = null;
      if (this.scene) {
        this.scene.render();
      }
    });
  };

  /**
   * 调整画布大小以适应显示
   */
  private readonly resizeToDisplay = (): void => {
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : null;
    const cssWidth = rect?.width ?? window.innerWidth * 0.65;
    const cssHeight = rect?.height ?? window.innerHeight * 0.65;

    if (cssWidth <= 0 || cssHeight <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    const displayWidth = Math.max(1, Math.round(cssWidth * dpr));
    const displayHeight = Math.max(1, Math.round(cssHeight * dpr));

    // 检查尺寸是否变化
    if (
      this.lastSize &&
      this.lastSize.width === displayWidth &&
      this.lastSize.height === displayHeight
    ) {
      return;
    }

    this.lastSize = { width: displayWidth, height: displayHeight };
    this.canvas.width = displayWidth;
    this.canvas.height = displayHeight;
    this.canvas.style.width = `${Math.round(cssWidth)}px`;
    this.canvas.style.height = `${Math.round(cssHeight)}px`;
    this.scene.size = [displayWidth, displayHeight];
    this.requestRender();
  };

  /**
   * 处理鼠标滚轮事件
   */
  private readonly handleWheel = (event: WheelEvent): void => {
    // 复用或创建 WheelZoomTool
    if (!this.wheelZoomTool) {
      this.wheelZoomTool = new piqiu3d.WheelZoomTool(this.builtInUniforms);
    }

    const current = vec2.fromValues(
      event.offsetX * this.dpr,
      event.offsetY * this.dpr,
    );
    this.wheelZoomTool.update(current, event.deltaY < 0 ? 1.1 : 1 / 1.1);
    this.requestRender();
  };

  /**
   * 处理窗口大小变化
   */
  private readonly handleResize = (): void => {
    this.resizeToDisplay();
  };

  /**
   * 获取模型
   */
  public get model() {
    return this.renderPass.model;
  }

  /**
   * 获取内置 uniforms
   */
  public get builtInUniforms() {
    return this.renderPass.camera.builtInUniforms;
  }

  constructor(
    canvas: HTMLCanvasElement,
    initialSize: { width: number; height: number },
  ) {
    if (!canvas) {
      throw new Error("Canvas element is required.");
    }
    this.canvas = canvas;

    // 初始化 WebGL 上下文
    const glContext = this.canvas.getContext("webgl2", { stencil: false });
    if (!glContext) {
      throw new Error("WebGL2 context is not supported.");
    }
    this.renderContext = new piqiu3d.RenderContext(glContext, []);

    // 初始化渲染通道
    this.renderPass = new piqiu3d.RenderPass({
      color: [0.8, 0.8, 0.8, 1],
      depth: 1.0,
    });

    // 初始化场景
    this.scene = new piqiu3d.Scene(this.renderContext);
    this.scene.push(this.renderPass);
    this.setSize(initialSize.width, initialSize.height);

    // 初始化鼠标处理器
    this.mouseHandler = new MouseHandler({
      builtInUniforms: this.builtInUniforms,
      onRender: this.requestRender,
      dpr: this.dpr,
    });

    // 阻止右键菜单
    this.canvas.oncontextmenu = (event) => {
      event.preventDefault();
    };
  }

  /**
   * 添加 Part
   */
  addPart(part: piqiu3d.Part): void {
    this.model.add(part);
  }

  /**
   * 获取顶层 Parts
   */
  private getTopLevelParts(): piqiu3d.Part[] {
    const parts: piqiu3d.Part[] = [];
    this.model.forEach((node) => {
      if (node instanceof piqiu3d.Part) {
        parts.push(node);
      }
    });
    return parts;
  }

  /**
   * 获取 Part 树
   */
  getPartTree(): PartNode[] {
    return this.getTopLevelParts().map((part, index) => ({
      index,
      id: String(part.id || `part-${index}`),
      name: part.name || `Part ${index + 1}`,
      visible: !!part.visible,
    }));
  }

  /**
   * 设置指定 Part 的可见性
   */
  setPartVisible(index: number, visible: boolean): boolean {
    const part = this.getTopLevelParts()[index];
    if (!part) return false;

    part.visible = visible;
    this.model.update(true);
    this.requestRender();
    return true;
  }

  /**
   * 设置所有 Parts 的可见性
   */
  setAllPartsVisible(visible: boolean): void {
    const parts = this.getTopLevelParts();
    parts.forEach((part) => {
      part.visible = visible;
    });
    this.model.update(true);
    this.requestRender();
  }

  /**
   * 获取边界框
   */
  get boundingBox(): piqiu3d.BoundingBox | undefined {
    return this._boundingBox;
  }

  /**
   * 设置边界框
   */
  set boundingBox(bbox: piqiu3d.BoundingBox | undefined) {
    this._boundingBox = bbox;
  }

  /**
   * 加载仿真文件
   */
  loadSiumlationFile(
    data?: SimulationData,
    options?: {
      color?: [number, number, number];
      scalarSelect?: [number, number];
      frameIndex?: number;
      renderMode?: RenderMode;
    },
  ): void {
    const loaderDataModel = get(data, "database.model") as
      | piqiu3d.LoaderDataModel
      | undefined;

    if (!loaderDataModel) {
      console.warn("LoadSimulationFile: database.model is missing.");
      return;
    }

    const { partBuffer } = loaderDataModel;
    this.postDataDrawables = [];
    const partBySource = new WeakMap<object, piqiu3d.Part>();
    let createdPartCount = 0;

    for (let i = 0; i < partBuffer.length; i++) {
      const partDataBuffer = partBuffer[i];
      const partsData = new piqiu3d.PartsData(partDataBuffer);

      partDataBuffer?.forEach((buffer) => {
        if (buffer instanceof piqiu3d.GeoDataBuffer) {
          if (partDataBuffer.subShapeType === piqiu3d.SubShapeType.FACE) {
            const geoData = new piqiu3d.GeoDataDrawable({ buffer }, options);
            geoData.geoType = piqiu3d.DRAW.surface;
            geoData.visible = options?.renderMode !== "wireframe";
            geoData.transform = partsData.transform;
            partsData.DrawableDataList.push(geoData);
            partsData.id = geoData.buffer.geomid;
          }

          if (partDataBuffer.subShapeType === piqiu3d.SubShapeType.EDGE) {
            const geoData = new piqiu3d.GeoDataDrawable({ buffer });
            geoData.visible =
              options?.renderMode === "wireframe" ||
              options?.renderMode === "surface_with_wireframe";
            geoData.fboType = piqiu3d.FBOType.line;
            geoData.color = piqiu3d.defaultLineColor;
            geoData.geoType = piqiu3d.DRAW.wire;
            geoData._draw = [piqiu3d.DRAW.wire];
            geoData.transform = partsData.transform;
            partsData.DrawableDataList.push(geoData);
            partsData.id = geoData.buffer.geomid;
          }

          if (partDataBuffer.subShapeType === piqiu3d.SubShapeType.VERTEX) {
            const geoData = new piqiu3d.GeoDataDrawable({ buffer });
            geoData.visible = false;
            geoData.fboType = piqiu3d.FBOType.point;
            geoData.geoType = piqiu3d.DRAW.point;
            geoData._draw = [piqiu3d.DRAW.point];
            geoData.transform = partsData.transform;
            partsData.DrawableDataList.push(geoData);
            partsData.id = geoData.buffer.geomid;
          }
        }

        if (buffer instanceof piqiu3d.MeshDataBuffer) {
          const meshData = new piqiu3d.MeshDataDrawable({ buffer });

          if (options?.renderMode === "wireframe") {
            meshData.draw = [piqiu3d.DRAW.edge];
          } else if (options?.renderMode === "surface") {
            meshData.draw = [piqiu3d.DRAW.surface];
          } else {
            meshData.draw = [piqiu3d.DRAW.surface, piqiu3d.DRAW.edge];
          }

          meshData.transform = partsData.transform;
          meshData.visible = true;
          partsData.DrawableDataList.push(meshData);
          partsData.id = meshData.buffer.id;
        }

        if (buffer instanceof piqiu3d.PostDataBuffer) {
          const postData = new piqiu3d.PostDataDrawable({
            buffer,
          });

          if (options?.scalarSelect && options.scalarSelect.length >= 2) {
            if (options?.frameIndex !== undefined) {
              postData.setScalarByScalarIndex(
                options?.scalarSelect,
                options.frameIndex,
              );
            } else {
              postData.setScalarByScalarIndex(options?.scalarSelect);
            }
          }

          if (options?.renderMode === "wireframe") {
            postData.draw = [piqiu3d.DRAW.edge];
          } else if (options?.renderMode === "surface") {
            postData.draw = [piqiu3d.DRAW.post];
          } else {
            postData.draw = [piqiu3d.DRAW.post, piqiu3d.DRAW.edge];
          }

          postData.transform = partsData.transform;
          partsData.DrawableDataList.push(postData);
          this.postDataDrawables.push(postData);
        }
      });

      const source = get(partDataBuffer, "json");
      const sourceObject =
        source && typeof source === "object" ? (source as object) : undefined;

      let part = sourceObject ? partBySource.get(sourceObject) : undefined;

      if (!part) {
        part = new piqiu3d.Part();
        const sourceName = String(get(source, "name", "") || "").trim();
        const sourceId =
          get(source, "id") ?? get(source, "geomid") ?? `part-${i}`;

        part.name = sourceName || `Part ${createdPartCount + 1}`;
        part.id = String(sourceId);

        if (sourceObject) {
          partBySource.set(sourceObject, part);
        }

        this.addPart(part);
        createdPartCount++;
      }

      partsData.addDrawablesToPart(part);
    }

    // 设置边界框
    if (data?.database?.boundingBox) {
      this.boundingBox = new piqiu3d.BoundingBox(
        vec3.fromValues(
          data.database.boundingBox.min[0] as number,
          data.database.boundingBox.min[1] as number,
          data.database.boundingBox.min[2] as number,
        ),
        vec3.fromValues(
          data.database.boundingBox.max[0] as number,
          data.database.boundingBox.max[1] as number,
          data.database.boundingBox.max[2] as number,
        ),
      );
    }

    if (options?.renderMode) {
      this.lastSimulationRenderMode = options.renderMode;
    }
  }

  /**
   * 更新仿真标量
   */
  updateSimulationScalar(options: {
    scalarSelect?: [number, number];
    frameIndex?: number;
    renderMode?: RenderMode;
  }): boolean {
    if (this.postDataDrawables.length === 0) return false;

    if (
      options.renderMode &&
      this.lastSimulationRenderMode &&
      options.renderMode !== this.lastSimulationRenderMode
    ) {
      return false;
    }

    if (!options.scalarSelect || options.scalarSelect.length < 2) return false;

    this.postDataDrawables.forEach((drawable) => {
      drawable.updateScalarByScalarIndex(
        options.scalarSelect,
        options.frameIndex,
      );
    });

    this.requestRender();
    return true;
  }

  /**
   * 添加通用事件监听
   */
  addGeneralEventListener(): void {
    this.addMouseEventListener();
    this.addMouseWheelEventListener();
    this.addWindowResizeListener();
    this.startResizeObserver();
    this.resizeToDisplay();
  }

  /**
   * 添加鼠标事件监听
   */
  addMouseEventListener(): void {
    this.mouseHandler.bindEvents(this.canvas);
  }

  /**
   * 添加滚轮事件监听
   */
  addMouseWheelEventListener(): void {
    this.canvas.addEventListener("wheel", this.handleWheel, false);
  }

  /**
   * 添加窗口大小变化监听
   */
  addWindowResizeListener(): void {
    window.addEventListener("resize", this.handleResize);
  }

  /**
   * 更新相机位置以适应场景
   */
  updateCamera(): void {
    // 复用或创建 ResetTool
    if (!this.resetTool) {
      this.resetTool = new piqiu3d.ResetTool(this.builtInUniforms);
    }

    if (
      this.boundingBox === undefined ||
      this.boundingBox.max[0] === -Infinity ||
      this.boundingBox.min[0] === Infinity
    ) {
      this.model.computeBoundingBox();
      this.boundingBox = this.model.boundingBox;
    }

    if (!this.boundingBox) {
      console.warn("Bounding box is unavailable; skipping camera reset.");
      return;
    }

    this.resetTool.home(this.boundingBox);
    this.model.update(true);
    this.requestRender();
  }

  /**
   * 移除鼠标事件监听
   */
  removeMouseEventListener(): void {
    this.mouseHandler.unbindEvents(this.canvas);
  }

  /**
   * 移除滚轮事件监听
   */
  removeMouseWheelEventListener(): void {
    this.canvas.removeEventListener("wheel", this.handleWheel, false);
  }

  /**
   * 移除窗口大小变化监听
   */
  removeWindowResizeListener(): void {
    window.removeEventListener("resize", this.handleResize);
  }

  /**
   * 移除通用事件监听
   */
  removeGeneralEventListener(): void {
    this.removeMouseEventListener();
    this.removeMouseWheelEventListener();
    this.removeWindowResizeListener();
    this.stopResizeObserver();
  }

  /**
   * 设置画布大小
   */
  public setSize(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      console.warn("Invalid canvas size.");
      return;
    }
    this.canvas.width = width;
    this.canvas.height = height;
    this.scene.size = [width, height];
  }

  /**
   * 释放资源
   */
  public dispose(): void {
    // 取消待处理的渲染请求
    if (this.pendingRender !== null) {
      window.cancelAnimationFrame(this.pendingRender);
      this.pendingRender = null;
    }

    // 清理 Tool 实例
    this.wheelZoomTool = null;
    this.resetTool = null;

    console.log("Piqiu3DRenderer disposed.");
  }

  /**
   * 启动 ResizeObserver
   */
  private startResizeObserver(): void {
    if (this.resizeObserver || typeof ResizeObserver === "undefined") return;

    this.resizeObserver = new ResizeObserver(() => {
      this.resizeToDisplay();
    });
    this.resizeObserver.observe(this.canvas.parentElement ?? this.canvas);
  }

  /**
   * 停止 ResizeObserver
   */
  private stopResizeObserver(): void {
    if (!this.resizeObserver) return;
    this.resizeObserver.disconnect();
    this.resizeObserver = null;
  }
}
