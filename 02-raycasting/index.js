import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
const canvas = document.getElementById("renderingCanvas");
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
const loader = new THREE.TextureLoader();
const backgroundTexture = loader.load("../lib/images/blue.jpg");

const scene = new THREE.Scene();
scene.background = backgroundTexture;

const camera = new THREE.OrthographicCamera(
  -canvas.clientWidth / 2,
  canvas.clientHeight / 2,
  canvas.clientHeight / 2,
  -canvas.clientHeight / 2,
  0.1,
  3000
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

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onPointerMove(event) {
  pointer.x = (event.offsetX / canvas.clientWidth) * 2 - 1;
  pointer.y = -(event.offsetY / canvas.clientHeight) * 2 + 1;
}

const geometry = new THREE.BoxGeometry(50, 50, 50);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

window.addEventListener("pointermove", onPointerMove);

function generateRandomHexNumber() {
  var hex = "";
  var characters = "0123456789ABCDEF";

  for (var i = 0; i < 6; i++) {
    var randomIndex = Math.floor(Math.random() * characters.length);
    hex += characters[randomIndex];
  }

  var hexNumber = parseInt(hex, 16);

  return hexNumber;
}

function render() {
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(scene.children);
  for (let i = 0; i < intersects.length; i++) {
    intersects[i].object.material.color.set(generateRandomHexNumber());
  }

  renderer.clear();
  renderer.render(scene, camera);
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

animate();
