// 尝试自定义viewHelper的代码，魔改出自己独有的viewHelper
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
const canvas = document.getElementById("renderingCanvas");
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

const loader = new THREE.TextureLoader();
const backgroundTexture = loader.load("../lib/images/blue.jpg");

const scene = new THREE.Scene();
scene.background = backgroundTexture;

const axisHelper = new THREE.AxesHelper(100);
scene.add(axisHelper);

const camera = new THREE.PerspectiveCamera(
  40,
  canvas.clientWidth / canvas.clientHeight,
  1,
  10000
);
camera.position.set(1000, 1000, 1000);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas: canvas,
});
renderer.localClippingEnabled = true;
renderer.setPixelRatio(window.devicePixelRatio);
renderer.autoClear = false;
renderer.setSize(canvas.clientWidth, canvas.clientHeight);

const controls = new OrbitControls(camera, renderer.domElement);

const geometry = new THREE.BoxGeometry(50, 50, 50);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

camera.position.set(0, 100, 0);
camera.lookAt(cube.position);

function render() {
  renderer.clear();
  renderer.render(scene, camera);
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

animate();
