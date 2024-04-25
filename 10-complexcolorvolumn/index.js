import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";
import { createLinearGradientCanvas, initDataByDataSource } from "utils";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { VolumeRenderShader1 } from "three/addons/shaders/VolumeShader.js";
import { Lut } from "three/addons/math/Lut.js";
import IDW from "idw";
import { dataSource } from "data";

let renderer, scene, camera;
let mesh;

init();
animate();

function init() {
  const lut = new Lut();
  lut.setColorMap("rainbow");
  const canvas = document.getElementById("renderingCanvas");
  renderer = new THREE.WebGLRenderer({
    canvas,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  scene = new THREE.Scene();
  scene.background = createLinearGradientCanvas();
  camera = new THREE.OrthographicCamera(
    -canvas.clientWidth / 2,
    canvas.clientHeight / 2,
    canvas.clientHeight / 2,
    -canvas.clientHeight / 2,
    0.1,
    3000
  );
  camera.position.set(1000, 1000, 1000);

  new OrbitControls(camera, renderer.domElement);
  const newCanvas = lut.createCanvas();
  const volconfig = {
    clim1: 0,
    clim2: 1,
    renderstyle: "iso",
    isothreshold: 0.15,
    colormap: "viridis",
  };
  const cmtextures = {
    viridis: new THREE.TextureLoader().load(
      "../lib/examples/textures/cm_viridis.png",
      () => {}
    ),
    gray: new THREE.TextureLoader().load(
      "../lib/examples/textures/cm_gray.png",
      () => {}
    ),
  };
  const { result, bbox } = initDataByDataSource(dataSource, 9);
  const maxRange = Math.max(bbox.latRange, bbox.lonRange, bbox.depthRange);
  const width = 100;
  const height = 100;
  const depth = 100;
  const data = new Uint8Array(width * height * depth);
  let i = 0;
  const perlin = new ImprovedNoise();
  const vector = new THREE.Vector3();

  const positions = result.map((ele) => [ele.x, ele.y, ele.z]);
  const vs = result.map((ele) => ele.value);

  const idw = new IDW(
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

  for (let z = 0; z < height; z++) {
    for (let y = 0; y < depth; y++) {
      for (let x = 0; x < width; x++) {
        data[i++] = idw.evaluate([x, z, y], 3) * 256;
      }
    }
  }
  const texture = new THREE.Data3DTexture(data, width, height, depth);
  texture.format = THREE.RedFormat;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  const geometry = new THREE.BoxGeometry(width, depth, height);
  geometry.translate(width / 2 - 0.5, depth / 2 - 0.5, height / 2 - 0.5);
  const shader = VolumeRenderShader1;
  const uniforms = THREE.UniformsUtils.clone(shader.uniforms);
  uniforms["u_data"].value = texture;
  uniforms["u_size"].value.set(width, depth, height);
  uniforms["u_clim"].value.set(volconfig.clim1, volconfig.clim2);
  uniforms["u_renderstyle"].value = volconfig.renderstyle == "mip" ? 0 : 1; // 0: MIP, 1: ISO
  uniforms["u_renderthreshold"].value = volconfig.isothreshold;
  uniforms["u_cmdata"].value = cmtextures[volconfig.colormap];

  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: shader.vertexShader,
    fragmentShader: shader.fragmentShader,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.5,
  });

  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const parameters = { threshold: 0.6, steps: 200 };

  function update() {
    material.uniforms.threshold.value = parameters.threshold;
    material.uniforms.steps.value = parameters.steps;
  }

  const gui = new GUI();
  gui.add(document, "title").name("案例名称");
  gui.add(volconfig, "clim1", 0, 1, 0.01).name("亮度").onChange(updateUniforms);
  gui
    .add(volconfig, "clim2", 0, 1, 0.01)
    .name("对比度")
    .onChange(updateUniforms);
  gui
    .add(volconfig, "colormap", { gray: "gray", viridis: "viridis" })
    .onChange(updateUniforms);
  gui
    .add(volconfig, "renderstyle", { mip: "mip", iso: "iso" })
    .name("渲染方式")
    .onChange(updateUniforms);
  gui
    .add(volconfig, "isothreshold", 0, 1, 0.01)
    .name("临界值")
    .onChange(updateUniforms);

  function updateUniforms() {
    material.uniforms["u_clim"].value.set(volconfig.clim1, volconfig.clim2);
    material.uniforms["u_renderstyle"].value =
      volconfig.renderstyle == "mip" ? 0 : 1; // 0: MIP, 1: ISO
    material.uniforms["u_renderthreshold"].value = volconfig.isothreshold; // For ISO renderstyle
    material.uniforms["u_cmdata"].value = cmtextures[volconfig.colormap];
  }
  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  // mesh.material.uniforms.cameraPos.value.copy(camera.position);

  renderer.render(scene, camera);
}
