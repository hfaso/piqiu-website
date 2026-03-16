/**
 * Mouse Handler - 处理鼠标交互事件
 * 支持轨道旋转、平移操作和部件选择
 */

import * as piqiu3d from "piqiu3d";
import { vec2 } from "gl-matrix";
import { PartSelector } from "../simulation/PartSelector";

export interface MouseHandlerProps {
  builtInUniforms: piqiu3d.BuiltInUniforms;
  onRender: () => void;
  canvas: HTMLCanvasElement;
  dpr?: number;
}

export class MouseHandler {
  // 公共属性（无前缀）
  public builtInUniforms: piqiu3d.BuiltInUniforms;
  public type: string = "none";

  // 私有属性
  private action: piqiu3d.PanTool | piqiu3d.OrbitTool | undefined;
  private onRender: () => void;
  private dpr: number;

  // Part 选择器
  private selector: PartSelector | null = null;

  // Hover Pass 实例
  private hoverPassInstance: piqiu3d.HoverPassInstance | null = null;

  // 拖拽状态检测
  private isDragging: boolean = false;
  private dragStartPos: vec2 | null = null;

  // 绑定的事件处理函数（使用箭头函数保持 this 上下文）
  private readonly handleMouseDown = (event: MouseEvent): void => {
    // CSS coordinates (relative to element, not multiplied by DPR)
    const cssPos = vec2.fromValues(event.offsetX, event.offsetY);
    // Tool / GL coordinates (CSS * DPR) used for camera tools and drag detection
    const toolPos = vec2.fromValues(cssPos[0] * this.dpr, cssPos[1] * this.dpr);

    this.dragStartPos = vec2.clone(toolPos);
    this.isDragging = false;

    // 点击时输出坐标和悬停检测结果 (hover uses GL/tool coords)
    if (event.button === 0) {
      this.handleClickHover(toolPos);
    }

    switch (event.button) {
      case 0: // 左键 - 轨道旋转 或 选择
        this.begin("orbit", toolPos);
        break;
      case 2: // 右键 - 平移
        this.begin("pan", toolPos);
        break;
    }
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    const toolPos = vec2.fromValues(
      event.offsetX * this.dpr,
      event.offsetY * this.dpr,
    );

    // 检测是否发生拖拽 (使用 tool/GL 坐标检测)
    if (this.dragStartPos) {
      const dx = Math.abs(toolPos[0] - this.dragStartPos[0]);
      const dy = Math.abs(toolPos[1] - this.dragStartPos[1]);
      if (dx > 5 || dy > 5) {
        this.isDragging = true;
      }
    }

    this.move(toolPos);
  };

  // 处理点击时的悬停检测和输出
  private readonly handleClickHover = (pos: vec2): void => {
    console.log("Click position:", { x: pos[0], y: pos[1] });

    // 如果有 HoverPass 实例，获取悬停的部件 ID
    if (this.hoverPassInstance) {
      const hoverPass = this.hoverPassInstance as any;

      // 检查是否已初始化 (idRenderPass 存在)
      if (!hoverPass.idRenderPass) {
        console.log("HoverPass not initialized yet");
        return;
      }

      try {
        // 更新纹理以获取最新的 ID 渲染结果
        this.hoverPassInstance.update(false);

        const imageData = hoverPass.imageData;

        if (!imageData) {
          console.warn("HoverPass imageData is not ready");
          return;
        }

        // 将点击坐标限制在 FBO 范围内，避免越界访问
        const clampedX = Math.max(
          0,
          Math.min(Math.floor(pos[0]), imageData.width - 1),
        );
        const clampedY = Math.max(
          0,
          Math.min(
            Math.floor(imageData.height - pos[1] - 1),
            imageData.height - 1,
          ),
        );

        const result = this.hoverPassInstance.getId(
          vec2.fromValues(clampedX, clampedY),
          false,
        );

        // 输出第二个 FBO (膨胀后的结果) 的颜色数据
        if (imageData) {
          const x = clampedX;
          const y = clampedY;
          const index = (y * imageData.width + x) * 4;
          const colorValues = {
            r: imageData.data[index],
            g: imageData.data[index + 1],
            b: imageData.data[index + 2],
            a: imageData.data[index + 3],
          };

          // 将颜色值转换为 ID
          const colorId =
            colorValues.r +
            (colorValues.g << 8) +
            (colorValues.b << 16) +
            (colorValues.a << 24);

          console.log("FBO2 (dilated) color values:", colorValues);
          console.log("FBO2 color ID (raw):", colorId >>> 0);
        }

        // 输出第一个 FBO (原始 ID 渲染) 的颜色数据
        if (hoverPass.idRenderPass) {
          const fbo1 = hoverPass.idRenderPass[0];
          if (fbo1 && fbo1.fbo) {
            // 需要手动读取 FBO1 的数据
            const fbo1Data = fbo1.fbo.read();
            if (fbo1Data) {
              const x = Math.max(
                0,
                Math.min(Math.floor(pos[0]), fbo1Data.width - 1),
              );
              const y = Math.max(
                0,
                Math.min(
                  Math.floor(fbo1Data.height - pos[1] - 1),
                  fbo1Data.height - 1,
                ),
              );
              const index = (y * fbo1Data.width + x) * 4;
              const colorValues1 = {
                r: fbo1Data.data[index],
                g: fbo1Data.data[index + 1],
                b: fbo1Data.data[index + 2],
                a: fbo1Data.data[index + 3],
              };

              // 将颜色值转换为 ID
              const colorId1 =
                colorValues1.r +
                (colorValues1.g << 8) +
                (colorValues1.b << 16) +
                (colorValues1.a << 24);

              console.log("FBO1 (original ID) color values:", colorValues1);
              console.log("FBO1 color ID (raw):", colorId1 >>> 0);
            }
          }
        }

        // 输出像素位置信息
        if (imageData) {
          const x = clampedX;
          const y = clampedY;
          const index = (y * imageData.width + x) * 4;
          console.log("Pixel info:", {
            x,
            y,
            index,
            width: imageData.width,
            height: imageData.height,
          });
        }

        if (result) {
          console.log("Hover result:", {
            partId: result.partId,
            resData: result.resData,
            nodeData: result.nodeData,
          });
        }
      } catch (err) {
        console.error("Hover error:", err);
      }
    }
  };

  private readonly handleMouseUp = (event: MouseEvent): void => {
    // 左键抬起且未发生拖拽时，触发 PartSelector 点击选中
    if (!this.isDragging && event.button === 0 && this.selector) {
      // Pass CSS coordinates to PartSelector; it will map CSS->GL internally
      const cssPos = vec2.fromValues(event.offsetX, event.offsetY);
      this.selector.handleClick(cssPos);
    }
    // 中键点击（按钮1）触发 FBO 快照下载
    if (!this.isDragging && event.button === 1 && this.selector) {
      try {
        this.selector.snapshot?.();
      } catch (err) {
        console.error("Snapshot error:", err);
      }
    }

    this.dragStartPos = null;
    this.isDragging = false;
    this.end();
  };

  constructor({
    builtInUniforms,
    onRender,
    dpr = 1,
  }: Omit<MouseHandlerProps, "canvas">) {
    this.builtInUniforms = builtInUniforms;
    this.onRender = onRender;
    this.dpr = dpr;
  }

  /**
   * 设置选择器
   */
  setSelector(selector: PartSelector | null): void {
    this.selector = selector;
  }

  /**
   * 设置 HoverPass 实例
   */
  setHoverPassInstance(
    hoverPassInstance: piqiu3d.HoverPassInstance | null,
  ): void {
    this.hoverPassInstance = hoverPassInstance;
  }

  /**
   * 绑定事件到 canvas 元素
   */
  bindEvents(canvas: HTMLCanvasElement): void {
    canvas.addEventListener("mousedown", this.handleMouseDown, false);
    canvas.addEventListener("mousemove", this.handleMouseMove, false);
    canvas.addEventListener("mouseup", this.handleMouseUp, false);
  }

  /**
   * 解绑事件
   */
  unbindEvents(canvas: HTMLCanvasElement): void {
    canvas.removeEventListener("mousedown", this.handleMouseDown);
    canvas.removeEventListener("mousemove", this.handleMouseMove);
    canvas.removeEventListener("mouseup", this.handleMouseUp);
  }

  /**
   * 开始交互操作
   */
  begin(type: string, current: vec2): void {
    switch (type) {
      case "pan":
        this.action = new piqiu3d.PanTool(this.builtInUniforms, current);
        this.type = type;
        break;
      case "orbit":
        this.action = new piqiu3d.OrbitTool(this.builtInUniforms, current);
        this.type = type;
        break;
    }

    if (type === "pan" || type === "orbit") {
      this.onRender();
    }
  }

  /**
   * 处理鼠标移动
   */
  move(current: vec2): void {
    if (this.action) {
      this.action.update(current);
      this.onRender();
    }
  }

  /**
   * 结束交互操作
   */
  end(): void {
    if (this.action) {
      this.action = undefined;
      this.type = "none";
      this.onRender();
    }
  }

  /**
   * 清理资源
   */
  destroy(canvas: HTMLCanvasElement): void {
    this.unbindEvents(canvas);
    this.selector = null;
  }
}

/**
 * React Hook - 创建 MouseHandler 实例
 */
export function useMouseHandler(
  props: Omit<MouseHandlerProps, "canvas">,
): MouseHandler {
  return new MouseHandler(props);
}
