import { dataSource } from "data";
import * as THREE from "three";
import GUI from "lil-gui";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createLinearGradientCanvas, convexHull } from "utils";

const _ = window["_"]();

const colorMap = {
  红: 0xff0000,
  绿: 0x00ff00,
  橙: 0xffa500,
};

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
  let newMap = {};
  dataSource.forEach((ele) => {
    let lat = Number.parseFloat(ele.latitude);
    let lon = Number.parseFloat(ele.longitude);
    lat = lat - bbox.minLat;
    lon = lon - bbox.minLon;
    if (newMap[ele.pointNumber] === void 0) {
      newMap[ele.pointNumber] = [];
    }
    newMap[ele.pointNumber].push({
      ...ele,
      renderX: lat,
      renderY: lon,
      renderZ: -ele.startDepth * scaleValue,
    });
  });
  console.log(newMap);
  return newMap;
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
    for (const key of Object.keys(result)) {
      for (let i = 0; i < result[key].length; i++) {
        const { renderX, renderY, renderZ } = result[key][i];
        const geometry = new THREE.DodecahedronGeometry(1, 4, 4);
        const material = new THREE.MeshBasicMaterial({
          color: colorMap[result[key][i].exceed],
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(renderX, renderZ, renderY);
        this.scene.add(mesh);
      }
      // 渲染柱子
      for (let i = 1; i < result[key].length; i++) {
        // 获取两个端点
        const start = result[key][i - 1];
        const end = result[key][i];
        const { renderX, renderY, renderZ } = end;
        const height = start.renderZ - renderZ;
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, height, 5);
        const material = new THREE.MeshBasicMaterial({
          color: colorMap[end.exceed],
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(renderX, renderZ + height / 2, renderY);
        this.scene.add(mesh);
      }
    }
  }
  initApp() {
    this.params = {
      scaleValue: 9,
      addFace: () => {
        console.log("构建平面");
      },
      buildSoild: () => {
        console.log("构建土壤");
      },
    };
    this.canvas = document.getElementById("renderingCanvas");
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    // Init gui
    this.gui = new GUI();
    this.gui.add(document, "title");
    // Init scene
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
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
    this.gui.add(this.params, "scaleValue", [3, 6, 9]).onChange(function () {
      console.log("改变柱子的缩放系数");
    });
    this.gui.add(this.params, "addFace").name("新增平面");
    this.gui.add(this.params, "buildSoild").name("构建土壤");
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
