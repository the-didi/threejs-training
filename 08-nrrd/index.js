import { dataSource } from "data";
import { volumnData } from "volumn";
import * as THREE from "three";
import GUI from "lil-gui";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { VolumeRenderShader1 } from "three/addons/shaders/VolumeShader.js";
import { createLinearGradientCanvas, initDataByDataSource } from "utils";
import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";
import IDW from "idw";

const colorMap = {
  红: 0xff0000,
  绿: 0x00ff00,
  橙: 0xffa500,
};

const vertexShader = /* glsl */ `
					in vec3 position;

					uniform mat4 modelMatrix;
					uniform mat4 modelViewMatrix;
					uniform mat4 projectionMatrix;
					uniform vec3 cameraPos;

					out vec3 vOrigin;
					out vec3 vDirection;

					void main() {
						vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

						vOrigin = vec3( inverse( modelMatrix ) * vec4( cameraPos, 1.0 ) ).xyz;
						vDirection = position - vOrigin;

						gl_Position = projectionMatrix * mvPosition;
					}
				`;

const fragmentShader = /* glsl */ `
					precision highp float;
					precision highp sampler3D;

					uniform mat4 modelViewMatrix;
					uniform mat4 projectionMatrix;

					in vec3 vOrigin;
					in vec3 vDirection;

					out vec4 color;

					uniform sampler3D map;

					uniform float threshold;
					uniform float steps;

					vec2 hitBox( vec3 orig, vec3 dir ) {
						const vec3 box_min = vec3( - 0.5 );
						const vec3 box_max = vec3( 0.5 );
						vec3 inv_dir = 1.0 / dir;
						vec3 tmin_tmp = ( box_min - orig ) * inv_dir;
						vec3 tmax_tmp = ( box_max - orig ) * inv_dir;
						vec3 tmin = min( tmin_tmp, tmax_tmp );
						vec3 tmax = max( tmin_tmp, tmax_tmp );
						float t0 = max( tmin.x, max( tmin.y, tmin.z ) );
						float t1 = min( tmax.x, min( tmax.y, tmax.z ) );
						return vec2( t0, t1 );
					}

					float sample1( vec3 p ) {
						return texture( map, p ).r;
					}

					#define epsilon .0001

					vec3 normal( vec3 coord ) {
						if ( coord.x < epsilon ) return vec3( 1.0, 0.0, 0.0 );
						if ( coord.y < epsilon ) return vec3( 0.0, 1.0, 0.0 );
						if ( coord.z < epsilon ) return vec3( 0.0, 0.0, 1.0 );
						if ( coord.x > 1.0 - epsilon ) return vec3( - 1.0, 0.0, 0.0 );
						if ( coord.y > 1.0 - epsilon ) return vec3( 0.0, - 1.0, 0.0 );
						if ( coord.z > 1.0 - epsilon ) return vec3( 0.0, 0.0, - 1.0 );

						float step = 0.01;
						float x = sample1( coord + vec3( - step, 0.0, 0.0 ) ) - sample1( coord + vec3( step, 0.0, 0.0 ) );
						float y = sample1( coord + vec3( 0.0, - step, 0.0 ) ) - sample1( coord + vec3( 0.0, step, 0.0 ) );
						float z = sample1( coord + vec3( 0.0, 0.0, - step ) ) - sample1( coord + vec3( 0.0, 0.0, step ) );

						return normalize( vec3( x, y, z ) );
					}

					void main(){

						vec3 rayDir = normalize( vDirection );
						vec2 bounds = hitBox( vOrigin, rayDir );

						if ( bounds.x > bounds.y ) discard;

						bounds.x = max( bounds.x, 0.0 );

						vec3 p = vOrigin + bounds.x * rayDir;
						vec3 inc = 1.0 / abs( rayDir );
						float delta = min( inc.x, min( inc.y, inc.z ) );
						delta /= steps;

						for ( float t = bounds.x; t < bounds.y; t += delta ) {

							float d = sample1( p + 0.5 );

							if ( d > threshold ) {

								color.rgb = normal( p + 0.5 ) * 0.5 + ( p * 1.5 + 0.25 );
								color.a = 1.;
								break;

							}

							p += rayDir * delta;

						}

						if ( color.a == 0.0 ) discard;

					}
				`;

function generatorText(message, position, rotateVal, font) {
  const color = new THREE.Color(0x000000);
  const matLite = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
  });
  // 绘制底部左边
  const xLine = message;
  const shapes = font.generateShapes(xLine, 10);
  const geometry = new THREE.ShapeGeometry(shapes);
  geometry.computeBoundingBox();
  const xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
  geometry.translate(xMid, 0, 0);
  switch (rotateVal) {
    case "X":
      {
        geometry.rotateX(-90);
      }
      break;
    case "Z":
      {
        geometry.rotateY(-80);
        geometry.rotateZ(90);
      }
      break;
  }

  const text = new THREE.Mesh(geometry, matLite);
  text.position.copy(position);
  return text;
}

/**
 * 1. 构建平面标尺
 * 2. 构建深度标尺
 * @param {*} box 传入要渲染辅助标注区域的标尺bbox
 */
function generatorGridHelper(box) {
  console.log(box);
  const point = [];
  // 定义底部基点
  point.push(box.min);
  point.push(new THREE.Vector3(box.min.x, box.min.y, box.max.z));
  point.push(new THREE.Vector3(box.max.x, box.min.y, box.max.z));
  point.push(new THREE.Vector3(box.max.x, box.min.y, box.min.z));
  point.push(box.min);

  // 构建侧面基点
  point.push(box.min);
  point.push(new THREE.Vector3(box.min.x, box.max.y, box.min.z));
  point.push(new THREE.Vector3(box.min.x, box.max.y, box.max.z));
  point.push(new THREE.Vector3(box.min.x, box.min.y, box.max.z));
  point.push(box.min);

  // 构建侧面基点
  point.push(box.min);
  point.push(new THREE.Vector3(box.min.x, box.max.y, box.min.z));
  point.push(new THREE.Vector3(box.max.x, box.max.y, box.min.z));
  point.push(new THREE.Vector3(box.max.x, box.min.y, box.min.z));
  point.push(box.min);

  const group = new THREE.Group();
  const geometry = new THREE.BufferGeometry().setFromPoints(point);
  const material = new THREE.LineBasicMaterial({ color: 0x000000 });
  const line = new THREE.Line(geometry, material);
  group.add(line);

  // 构建标注文字
  const loader = new FontLoader();
  loader.load("./helvetiker_regular.typeface.json", function (font) {
    // X轴
    const xMessage = generatorText(
      (box.max.x - box.min.x).toFixed(2) + "MM",
      new THREE.Vector3((box.max.x - box.min.x) / 2, box.min.y, box.min.z - 10),
      "X",
      font
    );
    group.add(xMessage);
    // Z轴
    const zMessage = generatorText(
      (box.max.z - box.min.z).toFixed(2) + "MM",
      new THREE.Vector3(box.min.x - 10, box.min.y, (box.max.z - box.min.z) / 2),
      "Z",
      font
    );
    group.add(zMessage);
  });

  return group;
}

function createNRRDModel(width, height, depth, data) {
  // 创建NRRD头信息
  const header = {
    dimension: 3,
    type: "int16",
    sizes: [width, height, depth],
    space: "left-posterior-superior",
    "space origin": [0, 0, 0],
    "space directions": [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    encoding: "raw",
  };

  // 创建NRRD数据
  const nrrdData = data;
  // 使用头信息和数据创建NRRD对象
  const nrrd = {
    header: header,
    data: nrrdData,
  };

  return nrrd;
}

class App {
  constructor() {
    this.initApp();
    this.cmtextures = {
      viridis: new THREE.TextureLoader().load(
        "../lib/examples/textures/cm_viridis.png",
        () => {}
      ),
      gray: new THREE.TextureLoader().load(
        "../lib/examples/textures/cm_gray.png",
        () => {}
      ),
    };
    this.initGeometry();
    this.initGUI();

    this.addEventListener();
  }
  updateUniforms() {
    console.log(this.material);
    this.material.uniforms["u_clim"].value.set(
      this.params.clim1,
      this.params.clim2
    );
    this.material.uniforms["u_renderstyle"].value =
      this.params.renderstyle == "mip" ? 0 : 1; // 0: MIP, 1: ISO
    this.material.uniforms["u_renderthreshold"].value =
      this.params.isothreshold; // For ISO renderstyle
    this.material.uniforms["u_cmdata"].value =
      this.cmtextures[this.params.colormap];
  }
  initGeometry() {
    const { result, bbox } = initDataByDataSource(dataSource, 9);
    this.dataSource = result;
    this.bbox = bbox;
    const pointGroup = new THREE.Group();
    this.dataSource.forEach((ele) => {
      const { x, y, z } = ele;
      const geometry = new THREE.DodecahedronGeometry(2, 4, 4);
      const material = new THREE.MeshBasicMaterial({
        color: colorMap[ele.exceed],
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, -z, y);
      pointGroup.add(mesh);
    });
    this.pointGroup = pointGroup;
    this.scene.add(pointGroup);
    this.gridHelper = generatorGridHelper(
      new THREE.Box3().setFromObject(this.pointGroup)
    );
    this.scene.add(this.gridHelper);
    // 预测模型
    const positions = this.dataSource.map((ele) => [ele.x, ele.y, ele.z]);
    const vs = this.dataSource.map((ele) => ele.value);
    this.idw = new IDW(
      {
        positions: positions,
        values: vs,
      },
      {
        periodicExtent: [
          [0, bbox.latRange],
          [0, bbox.lonRange],
          [0, bbox.depthRange],
        ],
      }
    );
    let i = 0;
    const predictValues = new Float32Array(
      Number.parseInt(bbox.depthRange * bbox.lonRange * bbox.latRange)
    );
    const perlin = new ImprovedNoise();
    const vector = new THREE.Vector3();
    for (let z = 0; z < bbox.lonRange; z++) {
      for (let y = 0; y < bbox.depthRange; y++) {
        for (let x = 0; x < bbox.latRange; x++) {
          vector.set(x, y, z);
          const d = perlin.noise(
            vector.x * 6.5,
            vector.y * 6.5,
            vector.z * 6.5
          );
          predictValues[i++] = d * 128 + 128;
        }
      }
    }
    const texture = new THREE.Data3DTexture(
      predictValues,
      bbox.latRange,
      bbox.lonRange,
      bbox.depthRange
    );
    texture.format = THREE.RedFormat;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;
    const geometry = new THREE.BoxGeometry(
      bbox.latRange,
      bbox.depthRange,
      bbox.lonRange
    );
    geometry.computeBoundingBox();
    const xMid =
      0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
    const yMid =
      -0.5 * (geometry.boundingBox.max.y - geometry.boundingBox.min.y);
    const zMid =
      0.5 * (geometry.boundingBox.max.z - geometry.boundingBox.min.z);
    geometry.translate(xMid, yMid, zMid);
    const shader = VolumeRenderShader1;
    const uniforms = THREE.UniformsUtils.clone(shader.uniforms);
    uniforms["u_data"].value = texture;
    uniforms["u_size"].value.set(bbox.latRange, bbox.depthRange, bbox.lonRange);
    uniforms["u_clim"].value.set(this.params.clim1, this.params.clim2);
    uniforms["u_renderstyle"].value = this.params.renderstyle == "mip" ? 0 : 1; // 0: MIP, 1: ISO
    uniforms["u_renderthreshold"].value = this.params.isothreshold; // For ISO renderstyle
    uniforms["u_cmdata"].value = this.cmtextures[this.params.colormap];
    const material = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        map: { value: texture },
        cameraPos: { value: new THREE.Vector3() },
        threshold: { value: 0.6 },
        steps: { value: 200 },
      },
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
    });
    this.material = material;
    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
  }
  initApp() {
    const _this = this;
    this.params = {
      scaleValue: 9,
      clim1: 0,
      clim2: 1,
      isothreshold: 0.15,
      colormap: "viridis",
      renderstyle: "iso",
    };
    this.canvas = document.getElementById("renderingCanvas");
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    // Init gui
    this.gui = new GUI();
    this.scene = new THREE.Scene();
    this.scene.background = createLinearGradientCanvas();
    // Init camera
    this.camera = new THREE.OrthographicCamera(
      -this.canvas.clientWidth / 2,
      this.canvas.clientHeight / 2,
      this.canvas.clientHeight / 2,
      -this.canvas.clientHeight / 2,
      0.1,
      3000
    );
    this.camera.position.set(1000, 1000, 1000);
    this.camera.lookAt(this.scene.position);
    this.scene.add(this.camera);
    // Init Light
    const pointLight = new THREE.PointLight(0xffffff, 3, 0, 0);
    this.camera.add(pointLight);
    // Init renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this.canvas,
    });
    this.renderer.localClippingEnabled = true;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.autoClear = false;
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    // Init Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
  }
  initGUI() {
    const _this = this;
    this.gui.add(document, "title").name("案例名称");
    this.gui
      .add(this.params, "clim1", 0, 1, 0.01)
      .onChange(this.updateUniforms);
    this.gui
      .add(this.params, "clim2", 0, 1, 0.01)
      .onChange(this.updateUniforms);
    this.gui
      .add(this.params, "colormap", { gray: "gray", viridis: "viridis" })
      .onChange(this.updateUniforms);
    this.gui
      .add(this.params, "renderstyle", { mip: "mip", iso: "iso" })
      .onChange(this.updateUniforms);
    this.gui
      .add(this.params, "isothreshold", 0, 1, 0.01)
      .onChange(this.updateUniforms);
  }
  addEventListener() {
    window.addEventListener("resize", () => {
      this.canvas.style.width = "100%";
      this.canvas.style.height = "100%";
      this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    });
  }
  render() {
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.controls.update();
  }
}

const app = new App();

function animate() {
  requestAnimationFrame(animate);
  app.render();
}
animate();
