// import * as piqiu3d from '@piqiu/piqiu3d'
import * as piqiu3d from "piqiu3d";
import { vec2 } from "gl-matrix";

export interface MouseHandlerProps {
  builtInUniforms: piqiu3d.BuiltInUniforms;
  onRender: () => void;
  canvas: HTMLCanvasElement;
  dpr?: number;
}

export class MouseHandler {
  protected m_buildInUniforms: piqiu3d.BuiltInUniforms;
  private m_action: piqiu3d.PanTool | piqiu3d.OrbitTool | undefined;
  protected m_type: string = "none";
  private onRender: () => void;
  private dpr: number;
  private readonly boundMouseDown = this.handleMouseDown.bind(this);
  private readonly boundMouseMove = this.handleMouseMove.bind(this);
  private readonly boundMouseUp = this.handleMouseUp.bind(this);

  constructor({
    builtInUniforms,
    onRender,
    dpr = 1,
  }: Omit<MouseHandlerProps, "canvas">) {
    this.m_buildInUniforms = builtInUniforms;
    this.onRender = onRender;
    this.dpr = dpr;
  }

  // 缁戝畾浜嬩欢鍒癱anvas鍏冪礌
  bindEvents(canvas: HTMLCanvasElement): void {
    canvas.addEventListener("mousedown", this.boundMouseDown, false);
    canvas.addEventListener("mousemove", this.boundMouseMove, false);
    canvas.addEventListener("mouseup", this.boundMouseUp, false);
  }

  // 瑙ｇ粦浜嬩欢
  unbindEvents(canvas: HTMLCanvasElement): void {
    canvas.removeEventListener("mousedown", this.boundMouseDown);
    canvas.removeEventListener("mousemove", this.boundMouseMove);
    canvas.removeEventListener("mouseup", this.boundMouseUp);
  }

  private handleMouseDown(event: MouseEvent): void {
    const pos = vec2.fromValues(
      event.offsetX * this.dpr,
      event.offsetY * this.dpr,
    );
    switch (event.button) {
      case 0: // 宸﹂敭
        this.begin("orbit", pos);
        break;
      case 2: // 鍙抽敭
        this.begin("pan", pos);
        break;
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    const pos = vec2.fromValues(
      event.offsetX * this.dpr,
      event.offsetY * this.dpr,
    );
    this.move(pos);
  }

  private handleMouseUp(): void {
    // const pos = vec2.fromValues(event.offsetX * this.dpr, event.offsetY * this.dpr);
    this.end();
  }

  begin(type: string, current: vec2): void {
    switch (type) {
      case "pan":
        this.m_action = new piqiu3d.PanTool(this.m_buildInUniforms, current);
        this.m_type = type;
        break;
      case "orbit":
        this.m_action = new piqiu3d.OrbitTool(this.m_buildInUniforms, current);
        this.m_type = type;
        break;
    }

    if (type === "pan" || type === "orbit") {
      this.onRender();
    }
  }

  move(current: vec2): void {
    if (this.m_action) {
      this.m_action.update(current);
      this.onRender();
    }
  }

  end(): void {
    if (this.m_action) {
      this.m_action = undefined;
      this.m_type = "none";
      this.onRender();
    }
  }

  // 娓呯悊璧勫弻
  destroy(canvas: HTMLCanvasElement): void {
    this.unbindEvents(canvas);
  }
}

// React Hook 鐗堟湰
export const useMouseHandler = (props: Omit<MouseHandlerProps, "canvas">) => {
  return new MouseHandler(props);
};
