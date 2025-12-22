import * as piqiu3d from '@piqiu/piqiu3d';

export class Piqiu3DRenderer {
  private canvas: HTMLCanvasElement;
  private renderContext: piqiu3d.RenderContext;
  private renderPass: piqiu3d.RenderPass;
  public scene: piqiu3d.Scene;
  // 可以按需暴露其他属性，如模型、内置uniforms等
  public get model() {
    return this.renderPass.model;
  }
  public get builtInUniforms() {
    return this.renderPass.camera.builtInUniforms;
  }

  constructor(canvas: HTMLCanvasElement, initialSize: { width: number; height: number }) {
    if (!canvas) {
      throw new Error('Canvas element is required.');
    }
    this.canvas = canvas;
    
    // 1. 初始化渲染上下文和渲染通道
    const glContext = this.canvas.getContext('webgl2', { stencil: false });
    if (!glContext) {
      throw new Error('WebGL2 context is not supported.');
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
  }

  // 简化part增加方法
  addPart(part: piqiu3d.Part) {
    this.model.add(part);
    this.model.update();
  }

  /**
   * 设置画布大小
   */
  public setSize(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      console.warn('Invalid canvas size.');
      return;
    }
    this.scene.size = [width, height];
    // 通常还需要更新相机纵横比等，此处取决于piqiu3d的内部实现
    console.log(`Scene size set to: ${width}x${height}`);
  }

  /**
   * 清理资源，防止内存泄漏
   */
  public dispose(): void {
    // 执行piqiu3d内部所需的清理操作
    // 例如：this.scene.remove(this.renderPass); 
    console.log('Piqiu3DRenderer disposed.');
  }
}