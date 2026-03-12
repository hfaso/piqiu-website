/**
 * 公共工具函数
 */

import type { SimulationData, ScalarOption } from "../types";

/**
 * 从加载结果中构建 Scalar 选择选项
 */
export function buildScalarOptions(result: SimulationData): ScalarOption[] {
  const scalarList = result?.database?.model?.scalar;
  if (!Array.isArray(scalarList)) return [];

  return scalarList.map((scalar, scalarIndex) => {
    const componentMap = new Map<
      string,
      {
        componentName: string;
        frames: Array<{
          subIndex: number;
          step: number | null;
          time: number | null;
        }>;
      }
    >();
    const data = Array.isArray(scalar?.data) ? scalar.data : [];

    data.forEach((subScalar, subIndex) => {
      const name =
        (typeof subScalar?.component_name === "string" &&
          subScalar.component_name.trim()) ||
        scalar?.name ||
        `Component ${subIndex + 1}`;

      const frame = {
        subIndex,
        step:
          typeof subScalar?.current_step === "number"
            ? subScalar.current_step
            : null,
        time:
          typeof subScalar?.current_time === "number"
            ? subScalar.current_time
            : null,
      };

      const existing = componentMap.get(name);
      if (existing) {
        existing.frames.push(frame);
      } else {
        componentMap.set(name, {
          componentName: name,
          frames: [frame],
        });
      }
    });

    const components = Array.from(componentMap.values());
    if (components.length === 0) {
      components.push({
        componentName: scalar?.name || "Default",
        frames: [{ subIndex: 0, step: null, time: null }],
      });
    }

    return {
      scalarIndex,
      scalarName: scalar?.name || `Scalar ${scalarIndex + 1}`,
      components,
    };
  });
}

/**
 * 获取默认模型 URL
 */
export function getDefaultModelUrl(
  type: "geometry" | "mesh" | "simulation" | "frames",
): string {
  const baseUrl = import.meta.env.BASE_URL;
  switch (type) {
    case "geometry":
      return `${baseUrl}models/chejia.zip`;
    case "mesh":
      return `${baseUrl}models/mesh2.zip`;
    case "simulation":
      return `${baseUrl}models/post.zip`;
    case "frames":
      return `${baseUrl}models/merged_time_all.vtk.zip`;
    default:
      return `${baseUrl}models/chejia.zip`;
  }
}

/**
 * 创建 Object URL 并管理其生命周期
 */
export function createObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * 清理 Object URL
 */
export function revokeObjectUrl(url: string | null): void {
  if (url) {
    URL.revokeObjectURL(url);
  }
}
