import React, { useEffect } from 'react';
// import styles from './index.less';
import * as piqiu3d from '@piqiu/piqiu3d'
import { vec2, vec3, mat4 } from 'gl-matrix';

export default function CanvasContainer() {
  let scene: any;

  useEffect(() => {
    const vs = `
            attribute vec3 aVertex;
            attribute vec3 aNormal;
            varying vec3 vNormal;
            uniform mat4 uModelViewProjectionMatrix;
            uniform mat3 uNormalMatrix;

            void main(void) {
                vec4 position = vec4(aVertex, 1.0);

                position = uModelViewProjectionMatrix * position;
                vNormal = vec3(uNormalMatrix * aNormal);
                gl_Position = position;
            }
        `;
    const fs = `
            precision mediump float;
            varying vec3 vNormal;
            uniform vec4 uColor;

            void main(void) {
                vec4 color = vec4(1.0);

                color = uColor;

                vec3 normal = normalize(vNormal);
                float nDotV = abs(normal.z);
                float lightIntensity = float(0.3) +
                                    nDotV * float(0.7) +
                                    float(0.4) * pow(nDotV, float(200));
                color = vec4(color.xyz * lightIntensity, 1.0);
                gl_FragColor = color;
            }
        `;

    let cubeGeo = new piqiu3d.CubeGeo(0.5, 1, 2);
    const vbo0 = new piqiu3d.VBO('aVertex', 3, cubeGeo.vertices);
    const vbo1 = new piqiu3d.VBO('aNormal', 3, cubeGeo.normals);
    const ibo = new piqiu3d.IBO(cubeGeo.indices);
    const drawer = new piqiu3d.ElementDrawer('triangles', cubeGeo.indices.length, 'unsigned_short', 0);

    const geo = new piqiu3d.Geometry();
    geo.push(vbo0);
    geo.push(vbo1);
    geo.push(ibo);
    geo.push(drawer);

    const eff = new piqiu3d.Effect();
    eff.push(new piqiu3d.VertexShader(vs));
    eff.push(new piqiu3d.FragmentShader(fs));
    eff.push(new piqiu3d.Uniform('uColor', new Float32Array([0.3, 0.51, 1.0, 1.0])));

    let mat4Transform = mat4.create();
    mat4.fromTranslation(mat4Transform, vec3.fromValues(0, 0, 0));
    let transform = new piqiu3d.Transform(mat4Transform);
    const drawable = new piqiu3d.Drawable(transform);
    drawable.push(geo);
    drawable.push(eff);
    drawable.push(new piqiu3d.DepthState(true));

    const part = new piqiu3d.Part(drawable);

    const renderPass = new piqiu3d.RenderPass({
      color: [0.8, 0.8, 0.8, 1],
      depth: 1.0,
    });

    const model = renderPass.model;
    model.add(part);
    model.update();

    const canvas = document.getElementById('demo') as HTMLCanvasElement;
    canvas.width = window.innerWidth * 0.5;
    canvas.height = window.innerHeight * 0.5;
    const context = canvas.getContext('webgl', {
      stencil: false,
    }) as WebGLRenderingContext;
    const renderContext = new piqiu3d.RenderContext(context, []);

    const builtinUniforms = renderPass.camera.builtInUniforms;
    let mat4Translate = mat4.create();
    mat4.translate(mat4Translate, mat4Translate, vec3.fromValues(3, 3, 0));
    builtinUniforms.modelMatrix = mat4Translate;
    builtinUniforms.update();

    scene = new piqiu3d.Scene(renderContext);
    scene.push(renderPass);
    scene.size = [canvas.width, canvas.height];

    const mouseHandler = new MouseHandler(builtinUniforms);
    mouseHandler.render = (): void => {
      scene.render();
    };

    const dpr = 1;
    canvas.addEventListener(
      'mousedown',
      (event: MouseEvent): void => {
        const pos = vec2.fromValues(event.offsetX * dpr, event.offsetY * dpr);
        switch (event.button) {
          case 0:
            mouseHandler.begin('orbit', pos);
            break;
          case 2:
            mouseHandler.begin('pan', pos);
            break;
        }
      },
      false,
    );
    canvas.addEventListener(
      'mousemove',
      (event: MouseEvent): void => {
        const pos = vec2.fromValues(event.offsetX * dpr, event.offsetY * dpr);
        mouseHandler.move(pos);
      },
      false,
    );
    canvas.addEventListener(
      'mouseup',
      (event: MouseEvent): void => {
        const pos = vec2.fromValues(event.offsetX * dpr, event.offsetY * dpr);
        mouseHandler.end(pos);
      },
      false,
    );
    canvas.addEventListener(
      'wheel',
      (event: WheelEvent): void => {
        const action = new piqiu3d.WheelZoomTool(builtinUniforms);
        const current = vec2.fromValues(event.offsetX * dpr, event.offsetY * dpr);
        action.update(current, event.deltaY < 0 ? 1.1 : 1 / 1.1);
        scene.render();
      },
      false,
    );
    window.oncontextmenu = (event) => {
      event.preventDefault();
    };

    const resetTool = new piqiu3d.ResetTool(renderPass.camera.builtInUniforms);
    const boundingBox = new piqiu3d.BoundingBox(
      vec3.fromValues(-0.1, -2, -0.1),
      vec3.fromValues(0.1, 2, 0.1),
    );
    // resetTool.lookFrom('x', boundingBox);
    // resetTool.lookFrom('y', boundingBox);
    // resetTool.lookFrom('z', boundingBox);
    resetTool.home(boundingBox);
    // resetTool.fit(boundingBox);

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth / 2;
      canvas.height = window.innerHeight / 2;

      scene.size = [canvas.width, canvas.height];
      scene.render();
    });

    scene.render();
  }, []);

  return (
    <div>
      <canvas
        id="demo"
        style={{
          background: 'red',
        }}
      ></canvas>
    </div>
  );
}

export class MouseHandler {
  protected m_buildInUniforms: piqiu3d.BuiltInUniforms;
  private m_action: piqiu3d.PanTool | piqiu3d.OrbitTool | undefined;
  protected m_type: string = 'none';

  constructor(buildInUniforms: piqiu3d.BuiltInUniforms) {
    this.m_buildInUniforms = buildInUniforms;
  }

  render(): void {}

  begin(type: string, current: vec2): void {
    switch (type) {
      case 'pan':
        this.m_action = new piqiu3d.PanTool(this.m_buildInUniforms, current);
        this.m_type = type;
        break;
      case 'orbit':
        this.m_action = new piqiu3d.OrbitTool(this.m_buildInUniforms, current);
        this.m_type = type;
        break;
    }

    if (type === 'pan' || type === 'orbit') {
      this.render();
    }
  }

  move(current: vec2): void {
    if (this.m_action) {
      this.m_action.update(current);
      this.render();
    }
  }

  end(current: vec2): void {
    if (this.m_action) {
      this.m_action = undefined;
      this.m_type = 'none';
      this.render();
    }
  }
}