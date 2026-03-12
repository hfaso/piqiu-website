/**
 * 公共类型定义
 */

export type RenderMode = "wireframe" | "surface_with_wireframe" | "surface";

export interface PartNode {
  index: number;
  id: string;
  name: string;
  visible: boolean;
}

export interface FrameOption {
  subIndex: number;
  step: number | null;
  time: number | null;
}

export interface ScalarOption {
  scalarIndex: number;
  scalarName: string;
  components: Array<{
    componentName: string;
    frames: FrameOption[];
  }>;
}

export interface LoaderOptions {
  color?: [number, number, number];
  scalarSelect?: [number, number];
  frameIndex?: number;
  renderMode?: RenderMode;
}

export interface SimulationData {
  database: {
    model?: {
      scalar?: Array<{
        name?: string;
        data?: Array<{
          component_name?: string;
          current_step?: number;
          current_time?: number;
        }>;
      }>;
    };
    boundingBox?: {
      min: [number, number, number];
      max: [number, number, number];
    };
  };
  [key: string]: unknown;
}
