export class CanvasContainer {
  /** 画布宽度 */
  public width = 0;
  /** 画布高度 */
  public height = 0;
  /** 画布上下文 */
  public canvas: HTMLCanvasElement;
  /** 缩放比例 */
  public scale = 1;
  
  // 平移和缩放相关变量
  private offsetX = 0;
  private offsetY = 0;
  private preOffsetX = 0;
  private preOffsetY = 0;
  private mouseDownOffsetX = 0;
  private mouseDownOffsetY = 0;
  private preScale = 1;
  
  // 配置参数
  private ratio: number;

  public piqiu3d: WebGL2RenderingContext | null;

  /**
   * 创建 Canvas 画布容器
   * @param canvas HTMLCanvasElement 画布元素
   * @param config 画布配置
   */
  constructor() {
    // 初始化画布
    this.ratio = window.devicePixelRatio || 1;
    // 1. 首先获取画布元素，类型为 HTMLCanvasElement
    this.canvas = document.getElementById('myCanvas') as HTMLCanvasElement;

    // 2. 然后从画布元素上获取WebGL2绘图上下文，类型为 WebGL2RenderingContext
    this.piqiu3d = this.canvas.getContext('webgl2');
    this.initCanvas();
  }

  /** 初始化画布尺寸和上下文 */
  private initCanvas = () => {
    const { width, height } = this.canvas.getBoundingClientRect();
    this.width = width;
    this.height = height;
    
    // 处理设备像素比，避免失真
    this.canvas.width = this.width * this.ratio;
    this.canvas.height = this.height * this.ratio;
    
    // 初始渲染
    this.render();
  }

    /** 渲染函数 */
  public render = () => {
    // 清空画布
    this.ctx.clearRect(0, 0, this.width * this.ratio, this.height * this.ratio);
    
    // 保存当前状态
    this.ctx.save();
    
    // 应用平移和缩放变换
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);
    
    // 绘制网格背景 - 便于观察变换效果
    this.drawGrid();
    
    // 这里可以添加你的自定义图形绘制逻辑
    this.drawCustomGraphics();
    
    // 恢复状态
    this.ctx.restore();
  }

    /** 绘制网格背景 */
  private drawGrid = () => {
    const gridSize = 20;
    const dashed = 2;

    this.ctx.strokeStyle = '#e0e0e0';
    this.ctx.lineWidth = 0.5;
    this.ctx.setLineDash([dashed, dashed]);
    
    // 垂直线
    for (let x = -1000; x < 1000; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, -1000);
      this.ctx.lineTo(x, 1000);
      this.ctx.stroke();
    }
    
    // 水平线
    for (let y = -1000; y < 1000; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(-1000, y);
      this.ctx.lineTo(1000, y);
      this.ctx.stroke();
    }
    
    this.ctx.setLineDash([]);
  }

    /** 绘制自定义图形 - 示例图形 */
  private drawCustomGraphics = () => {
    // 示例：绘制一个矩形和圆形
    this.ctx.fillStyle = '#6495ed';
    
    // 矩形
    this.ctx.fillRect(300, 100, 200, 100);
    
    // 圆形
    this.ctx.beginPath();
    this.ctx.arc(100, 100, 30, 0, Math.PI * 2);
    this.ctx.fill();
  }
}