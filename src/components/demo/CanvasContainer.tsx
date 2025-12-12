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

  public gl: WebGL2RenderingContext | null;

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
    this.gl = this.canvas.getContext('webgl2');
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
  }

    /** 绘制网格背景 */
  private drawGrid = () => {
  }

    /** 绘制自定义图形 - 示例图形 */
  private drawCustomGraphics = () => {
  }
}