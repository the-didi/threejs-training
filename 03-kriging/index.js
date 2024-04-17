import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import GUI from "lil-gui";
import { holeTable } from "HoleData";

const geoMercator = window["d3"]["geoMercator"];

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
camera.lookAt(scene.position);

// longitude: 经度
// latitude: 纬度
function buildHoleList() {
  const mapSampleInfo = {
    minlon: Infinity,
    maxlon: -Infinity,
    minlat: Infinity,
    maxlat: -Infinity,
  };
  let centerPos = {};
  holeTable.forEach(({ latitude, longitude }) => {
    latitude = Number.parseFloat(latitude);
    longitude = Number.parseFloat(longitude);
    if (latitude > 100) {
      return;
    }
    if (longitude > mapSampleInfo.maxlon) mapSampleInfo.maxlon = longitude;
    if (longitude < mapSampleInfo.minlon) mapSampleInfo.minlon = longitude;
    if (latitude > mapSampleInfo.maxlat) mapSampleInfo.maxlat = latitude;
    if (latitude < mapSampleInfo.minlat) mapSampleInfo.minlat = latitude;
  });
  centerPos = {
    x: (mapSampleInfo.maxlon + mapSampleInfo.minlon) / 2,
    y: (mapSampleInfo.maxlat + mapSampleInfo.minlat) / 2,
  };
  let merTrans = geoMercator()
    .center([centerPos.x, centerPos.y])
    .scale(80000)
    .translate([0, 0]);
  const newHoleTable = holeTable.map((ele) => {
    const x = Number.parseFloat(ele.longitude);
    const y = Number.parseFloat(ele.latitude);
    const transferPoint = merTrans([x, y]);
    console.log(transferPoint);
    ele.longitude = transferPoint[0];
    ele.latitude = transferPoint[1];
    // 绘制一个圆
    const circleGeometry = new THREE.DodecahedronGeometry(10, 4);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const circle = new THREE.Mesh(circleGeometry, material);
    circle.position.set(ele.longitude, ele.startDepth * 100, ele.latitude);
    scene.add(circle);
    return ele;
  });
}

function addEventListener() {
  window.addEventListener("resize", () => {
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  });
}

const gui = new GUI();
gui.add(document, "title");

function render() {
  renderer.clear();
  renderer.render(scene, camera);
  controls.update();
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

buildHoleList();
addEventListener();

animate();
