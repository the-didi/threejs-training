import { dataSource } from "data";
import * as THREE from "three";
import GUI from "lil-gui";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createLinearGradientCanvas, convexHull, BuildSurface } from "utils";
import IDW from "idw";
function initDataByDataSource(datasource, scaleValue) {
  let bbox = {
    minLat: Infinity,
    minLon: Infinity,
    maxLat: -Infinity,
    maxLon: -Infinity,
  };
  let centerPos = null;
  // 第一次遍历，找到bbox
  dataSource.forEach((ele) => {
    const lat = Number.parseFloat(ele.latitude);
    const lon = Number.parseFloat(ele.longitude);
    bbox.maxLat = Math.max(lat, bbox.maxLat);
    bbox.maxLon = Math.max(lon, bbox.maxLon);
    bbox.minLat = Math.min(lat, bbox.minLat);
    bbox.minLon = Math.min(lon, bbox.minLon);
  });
  bbox.latRange = bbox.maxLat - bbox.minLat;
  bbox.lonRange = bbox.maxLon - bbox.minLon;
  // 找到centerPos
  centerPos = {
    lon: bbox.minLon + (bbox.maxLon - bbox.minLon) / 2,
    lat: bbox.minLat + (bbox.maxLat - bbox.minLat) / 2,
  };
  let result = [];
  dataSource.forEach((ele) => {
    let lat = Number.parseFloat(ele.latitude);
    let lon = Number.parseFloat(ele.longitude);
    lat = lat - bbox.minLat;
    lon = lon - bbox.minLon;
    result.push({
      ...ele,
      x: lat,
      y: lon,
      z: ele.startDepth * 9,
      value: Number.parseFloat(ele.cadmium),
    });
  });
  return result;
}

class App {
  constructor() {
    this.initApp();
    this.initGUI();
    this.initGeometry();
    this.addEventListener();
  }
  initGeometry() {
    // 1. 根据dataSource进行建模
    const result = initDataByDataSource(dataSource, this.params.scaleValue);
    this.dataSource = result;
    console.log(IDW);
  }

  initApp() {
    const _this = this;
    this.params = {};
    this.canvas = document.getElementById("renderingCanvas");
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    // Init gui
    this.gui = new GUI();
    this.gui.add(document, "title").name("案例名称");
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
  render() {
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.controls.update();
  }
  initGUI() {
    const _this = this;
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
}

const app = new App();

function animate() {
  requestAnimationFrame(animate);
  app.render();
}
animate();
