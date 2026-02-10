import * as piqiu3d from "piqiu3d";
import { get, includes } from "lodash";
import { useMouseHandler } from "./handler/MouseHandler";
import { vec2, vec3 } from "gl-matrix";
import { DRAW, Drawable } from "piqiu3d";

export class Piqiu3DRenderer {
  private canvas: HTMLCanvasElement;
  public renderContext: piqiu3d.RenderContext;
  private renderPass: piqiu3d.RenderPass;
  public scene: piqiu3d.Scene;
  public mouseHandler: any;
  public dpr = window.devicePixelRatio || 1;
  public _boundingBox: piqiu3d.BoundingBox | undefined;
  // 可以按需暴露其他属性，如模型、内置uniforms等
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

    // 1. 初始化渲染上下文和渲染通道
    const glContext = this.canvas.getContext("webgl2", { stencil: false });
    if (!glContext) {
      throw new Error("WebGL2 context is not supported.");
    }
    this.renderContext = new piqiu3d.RenderContext(glContext, []);

    this.renderPass = new piqiu3d.RenderPass({
      color: [0.8, 0.8, 0.8, 1],
      depth: 1.0,
    });

    // 2. 初始化场景
    this.scene = new piqiu3d.Scene(this.renderContext);
    this.scene.push(this.renderPass);
    this.setSize(initialSize.width, initialSize.height);

    // 3. 初始化鼠标处理器
    this.mouseHandler = useMouseHandler({
      builtInUniforms: this.builtInUniforms,
      onRender: () => {
        if (this.scene) {
          this.scene.render();
        }
      },
      dpr: this.dpr,
    });

    // 阻止右键菜单
    this.canvas.oncontextmenu = (event) => {
      event.preventDefault();
    };
  }

  // 简化part增加方法
  addPart(part: piqiu3d.Part) {
    this.model.add(part);
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

    for (let i = 0; i < partBuffer.length; i++) {
      const partDataBuffer = partBuffer[i];
      const partsData = new piqiu3d.PartsData(partDataBuffer);
      partDataBuffer?.forEach((buffer) => {
        if (buffer instanceof piqiu3d.GeoDataBuffer) {
          if (partDataBuffer.subShapeType === piqiu3d.SubShapeType.FACE) {
            const _geoData = new piqiu3d.GeoDataDrawable({ buffer }, options);
            _geoData.geoType = piqiu3d.DRAW.surface;
            _geoData.transform = partsData.transform;
            partsData.DrawableDataList.push(_geoData);
            partsData.id = _geoData.buffer.geomid;
          }
          if (partDataBuffer.subShapeType === piqiu3d.SubShapeType.EDGE) {
            const _geoData = new piqiu3d.GeoDataDrawable({ buffer });
            _geoData.visible = false;
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
          _meshData.transform = partsData.transform;
          _meshData.visible = true;
          partsData.DrawableDataList.push(_meshData);
          partsData.id = _meshData.buffer.id;
        }
        if (buffer instanceof piqiu3d.PostDataBuffer) {
          const _postData = new piqiu3d.PostDataDrawable({
            buffer,
          });
          _postData.transform = partsData.transform;
          partsData.DrawableDataList.push(_postData);
        }
      });
      const part = new piqiu3d.Part();
      partsData.addDrawablesToPart(part);
      this.addPart(part);
      console.log("loading part", i, "/", partBuffer.length);
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
  }

  // 添加通用事件监听器
  addGeneralEventListener() {
    this.addMouseEventListener();
    this.addMouseWheelEventListener();
    this.addWindowResizeListener();
  }

  addMouseEventListener() {
    this.mouseHandler.bindEvents(this.canvas);
  }

  addMouseWheelEventListener() {
    this.canvas.addEventListener(
      "wheel",
      (event: WheelEvent): void => {
        const action = new piqiu3d.WheelZoomTool(this.builtInUniforms);
        const current = vec2.fromValues(
          event.offsetX * this.dpr,
          event.offsetY * this.dpr,
        );
        action.update(current, event.deltaY < 0 ? 1.1 : 1 / 1.1);
        this.scene.render();
      },
      false,
    );
  }

  addWindowResizeListener() {
    window.addEventListener("resize", () => {
      this.canvas.width = window.innerWidth / 2;
      this.canvas.height = window.innerHeight / 2;

      this.scene.size = [this.canvas.width, this.canvas.height];
      this.scene.render();
    });
  }

  // 更新相机位置以适应当前场景
  updateCamera() {
    const resetTool = new piqiu3d.ResetTool(this.builtInUniforms);

    debugger;
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

    this.model.update();
    this.scene.render();
  }

  removeMouseEventListener() {
    this.mouseHandler.unbindEvents(this.canvas);
  }

  /**
   * 设置画布大小
   */
  public setSize(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      console.warn("Invalid canvas size.");
      return;
    }
    this.scene.size = [width, height];
  }

  /**
   * 清理资源，防止内存泄漏
   */
  public dispose(): void {
    // 执行piqiu3d内部所需的清理操作
    // 例如：this.scene.remove(this.renderPass);
    console.log("Piqiu3DRenderer disposed.");
  }
}
