import * as piqiu3d from "piqiu3d";
import { get } from "lodash";
import { useMouseHandler } from "./handler/MouseHandler";
import { vec2, vec3 } from "gl-matrix";

export type RenderMode = "wireframe" | "surface_with_wireframe" | "surface";
export type PartNode = {
  index: number;
  id: string;
  name: string;
  visible: boolean;
};

export class Piqiu3DRenderer {
  private canvas: HTMLCanvasElement;
  public renderContext: piqiu3d.RenderContext;
  private renderPass: piqiu3d.RenderPass;
  public scene: piqiu3d.Scene;
  public mouseHandler: any;
  public dpr = Math.min(window.devicePixelRatio || 1, 2);
  public _boundingBox: piqiu3d.BoundingBox | undefined;
  private postDataDrawables: piqiu3d.PostDataDrawable[] = [];
  private lastSimulationRenderMode: RenderMode | null = null;
  private pendingRender: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private lastSize: { width: number; height: number } | null = null;
  public requestRender = (): void => {
    if (this.pendingRender !== null) return;
    this.pendingRender = window.requestAnimationFrame(() => {
      this.pendingRender = null;
      if (this.scene) {
        this.scene.render();
      }
    });
  };
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
  private readonly handleWheel = (event: WheelEvent): void => {
    const action = new piqiu3d.WheelZoomTool(this.builtInUniforms);
    const current = vec2.fromValues(
      event.offsetX * this.dpr,
      event.offsetY * this.dpr,
    );
    action.update(current, event.deltaY < 0 ? 1.1 : 1 / 1.1);
    this.requestRender();
  };
  private readonly handleResize = (): void => {
    this.resizeToDisplay();
  };
  // 鍙互鎸夐渶鏆撮湶鍏朵粬灞炴€э紝濡傛ā鍨嬨€佸唴缃畊niforms绛?
  public get model() {
    return this.renderPass.model;
  }
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

    // 1. 鍒濆鍖栨覆鏌撲笂涓嬫枃鍜屾覆鏌撻€氶亾
    const glContext = this.canvas.getContext("webgl2", { stencil: false });
    if (!glContext) {
      throw new Error("WebGL2 context is not supported.");
    }
    this.renderContext = new piqiu3d.RenderContext(glContext, []);

    this.renderPass = new piqiu3d.RenderPass({
      color: [0.8, 0.8, 0.8, 1],
      depth: 1.0,
    });

    // 2. 鍒濆鍖栧満鏅?
    this.scene = new piqiu3d.Scene(this.renderContext);
    this.scene.push(this.renderPass);
    this.setSize(initialSize.width, initialSize.height);

    // 3. 鍒濆鍖栭紶鏍囧鐞嗗櫒
    this.mouseHandler = useMouseHandler({
      builtInUniforms: this.builtInUniforms,
      onRender: this.requestRender,
      dpr: this.dpr,
    });

    // 闃绘鍙抽敭鑿滃崟
    this.canvas.oncontextmenu = (event) => {
      event.preventDefault();
    };
  }

  // 绠€鍖杙art澧炲姞鏂规硶
  addPart(part: piqiu3d.Part) {
    this.model.add(part);
  }

  private getTopLevelParts(): piqiu3d.Part[] {
    const parts: piqiu3d.Part[] = [];
    this.model.forEach((node) => {
      if (node instanceof piqiu3d.Part) {
        parts.push(node);
      }
    });
    return parts;
  }

  getPartTree(): PartNode[] {
    return this.getTopLevelParts().map((part, index) => ({
      index,
      id: String(part.id || `part-${index}`),
      name: part.name || `Part ${index + 1}`,
      visible: !!part.visible,
    }));
  }

  setPartVisible(index: number, visible: boolean): boolean {
    const part = this.getTopLevelParts()[index];
    if (!part) return false;
    part.visible = visible;
    this.model.update(true);
    this.requestRender();
    return true;
  }

  setAllPartsVisible(visible: boolean): void {
    const parts = this.getTopLevelParts();
    parts.forEach((part) => {
      part.visible = visible;
    });
    this.model.update(true);
    this.requestRender();
  }

  get boundingBox() {
    return this._boundingBox;
  }

  set boundingBox(bbox: piqiu3d.BoundingBox | undefined) {
    this._boundingBox = bbox;
  }

  loadSiumlationFile(
    data?: piqiu3d.LoadDataBase,
    options?: {
      color?: [number, number, number];
      scalarSelect?: [number, number];
      frameIndex?: number;
      renderMode?: RenderMode;
    },
  ) {
    const loaderDataModel = get(data, "database.model") as
      | piqiu3d.LoaderDataModel
      | undefined;
    if (!loaderDataModel) {
      console.warn("LoadSimulationFile: database.model is missing.");
      console.timeEnd("Load");
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
            const _geoData = new piqiu3d.GeoDataDrawable({ buffer }, options);
            _geoData.geoType = piqiu3d.DRAW.surface;
            _geoData.visible = options?.renderMode !== "wireframe";
            _geoData.transform = partsData.transform;
            partsData.DrawableDataList.push(_geoData);
            partsData.id = _geoData.buffer.geomid;
          }
          if (partDataBuffer.subShapeType === piqiu3d.SubShapeType.EDGE) {
            const _geoData = new piqiu3d.GeoDataDrawable({ buffer });
            _geoData.visible =
              options?.renderMode === "wireframe" ||
              options?.renderMode === "surface_with_wireframe";
            _geoData.fboType = piqiu3d.FBOType.line;
            _geoData.color = piqiu3d.defaultLineColor;
            _geoData.geoType = piqiu3d.DRAW.wire;
            _geoData._draw = [piqiu3d.DRAW.wire];
            _geoData.transform = partsData.transform;
            partsData.DrawableDataList.push(_geoData);
            partsData.id = _geoData.buffer.geomid;
          }
          if (partDataBuffer.subShapeType === piqiu3d.SubShapeType.VERTEX) {
            const _geoData = new piqiu3d.GeoDataDrawable({ buffer });
            _geoData.visible = false;
            _geoData.fboType = piqiu3d.FBOType.point;
            _geoData.geoType = piqiu3d.DRAW.point;
            _geoData._draw = [piqiu3d.DRAW.point];
            _geoData.transform = partsData.transform;
            partsData.DrawableDataList.push(_geoData);
            partsData.id = _geoData.buffer.geomid;
          }
        }
        if (buffer instanceof piqiu3d.MeshDataBuffer) {
          const _meshData = new piqiu3d.MeshDataDrawable({ buffer });
          if (options?.renderMode === "wireframe") {
            _meshData.draw = [piqiu3d.DRAW.edge];
          } else if (options?.renderMode === "surface") {
            _meshData.draw = [piqiu3d.DRAW.surface];
          } else {
            _meshData.draw = [piqiu3d.DRAW.surface, piqiu3d.DRAW.edge];
          }
          _meshData.transform = partsData.transform;
          _meshData.visible = true;
          partsData.DrawableDataList.push(_meshData);
          partsData.id = _meshData.buffer.id;
        }
        if (buffer instanceof piqiu3d.PostDataBuffer) {
          const _postData = new piqiu3d.PostDataDrawable({
            buffer,
          });
          if (options?.scalarSelect && options.scalarSelect.length >= 2) {
            if (options?.frameIndex !== undefined) {
              _postData.setScalarByScalarIndex(
                options?.scalarSelect,
                options.frameIndex,
              );
            } else {
              _postData.setScalarByScalarIndex(options?.scalarSelect);
            }
          }
          if (options?.renderMode === "wireframe") {
            _postData.draw = [piqiu3d.DRAW.edge];
          } else if (options?.renderMode === "surface") {
            _postData.draw = [piqiu3d.DRAW.post];
          } else {
            _postData.draw = [piqiu3d.DRAW.post, piqiu3d.DRAW.edge];
          }
          _postData.transform = partsData.transform;
          partsData.DrawableDataList.push(_postData);
          this.postDataDrawables.push(_postData);
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
      console.log("loading part drawable", i, "/", partBuffer.length);
    }
    this.boundingBox = new piqiu3d.BoundingBox(
      vec3.fromValues(
        data?.database.boundingBox?.min[0] as number,
        data?.database.boundingBox?.min[1] as number,
        data?.database.boundingBox?.min[2] as number,
      ),
      vec3.fromValues(
        data?.database.boundingBox?.max[0] as number,
        data?.database.boundingBox?.max[1] as number,
        data?.database.boundingBox?.max[2] as number,
      ),
    );
    console.log(this.boundingBox);
    if (options?.renderMode) {
      this.lastSimulationRenderMode = options.renderMode;
    }
  }

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

  // 娣诲姞閫氱敤浜嬩欢鐩戝惉鍣?
  addGeneralEventListener() {
    this.addMouseEventListener();
    this.addMouseWheelEventListener();
    this.addWindowResizeListener();
    this.startResizeObserver();
    this.resizeToDisplay();
  }

  addMouseEventListener() {
    this.mouseHandler.bindEvents(this.canvas);
  }

  addMouseWheelEventListener() {
    this.canvas.addEventListener("wheel", this.handleWheel, false);
  }

  addWindowResizeListener() {
    window.addEventListener("resize", this.handleResize);
  }

  // 鏇存柊鐩告満浣嶇疆浠ラ€傚簲褰撳墠鍦烘櫙
  updateCamera() {
    const resetTool = new piqiu3d.ResetTool(this.builtInUniforms);

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

    resetTool.home(this.boundingBox);

    this.model.update(true);
    this.requestRender();
  }

  removeMouseEventListener() {
    this.mouseHandler.unbindEvents(this.canvas);
  }

  removeMouseWheelEventListener() {
    this.canvas.removeEventListener("wheel", this.handleWheel, false);
  }

  removeWindowResizeListener() {
    window.removeEventListener("resize", this.handleResize);
  }

  removeGeneralEventListener() {
    this.removeMouseEventListener();
    this.removeMouseWheelEventListener();
    this.removeWindowResizeListener();
    this.stopResizeObserver();
  }

  /**
   * 璁剧疆鐢诲竷澶у皬
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
   * 娓呯悊璧勬簮锛岄槻姝㈠唴瀛樻硠婕?
   */
  public dispose(): void {
    // 鎵цpiqiu3d鍐呴儴鎵€闇€鐨勬竻鐞嗘搷浣?
    // 渚嬪锛歵his.scene.remove(this.renderPass);
    if (this.pendingRender !== null) {
      window.cancelAnimationFrame(this.pendingRender);
      this.pendingRender = null;
    }
    console.log("Piqiu3DRenderer disposed.");
  }

  private startResizeObserver(): void {
    if (this.resizeObserver || typeof ResizeObserver === "undefined") return;
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeToDisplay();
    });
    this.resizeObserver.observe(this.canvas.parentElement ?? this.canvas);
  }

  private stopResizeObserver(): void {
    if (!this.resizeObserver) return;
    this.resizeObserver.disconnect();
    this.resizeObserver = null;
  }
}
