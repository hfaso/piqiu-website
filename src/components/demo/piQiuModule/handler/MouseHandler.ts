/**
 * Mouse Handler - 处理鼠标交互事件
 * 支持轨道旋转和平移操作
 */

import * as piqiu3d from "piqiu3d";
import { vec2 } from "gl-matrix";

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

  // 绑定的事件处理函数（使用箭头函数保持 this 上下文）
  private readonly handleMouseDown = (event: MouseEvent): void => {
    const pos = vec2.fromValues(
      event.offsetX * this.dpr,
      event.offsetY * this.dpr,
    );

    switch (event.button) {
      case 0: // 左键 - 轨道旋转
        this.begin("orbit", pos);
        break;
      case 2: // 右键 - 平移
        this.begin("pan", pos);
        break;
    }
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    const pos = vec2.fromValues(
      event.offsetX * this.dpr,
      event.offsetY * this.dpr,
    );
    this.move(pos);
  };

  private readonly handleMouseUp = (): void => {
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
