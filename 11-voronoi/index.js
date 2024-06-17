import GUI from "lil-gui";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { dataSource } from "data";

import {
  createLinearGradientCanvas,
  convexHull,
  PolygonClip,
  BuildSurface,
  createTextureByCanvas,
} from "utils";

const turf = window["turf"];

function isPointEqual(p1, p2) {
  return p1[0] == p2[0] && p1[1] == p2[1];
}

function initDataByDataSource(datasource, scaleValue) {
  let bbox = {
    minLat: Infinity,
    minLon: Infinity,
    maxLat: -Infinity,
    maxLon: -Infinity,
    minDepth: Infinity,
    maxDepth: -Infinity,
  };
  let centerPos = null;
  // 第一次遍历，找到bbox
  dataSource.forEach((ele) => {
    const lat = Number.parseFloat(ele.x);
    const lon = Number.parseFloat(ele.y);
    const depth = Number.parseFloat(ele.startDepth * 9);
    bbox.minDepth = Math.min(depth, bbox.minDepth);
    bbox.maxDepth = Math.max(depth, bbox.maxDepth);
    bbox.maxLat = Math.max(lat, bbox.maxLat);
    bbox.maxLon = Math.max(lon, bbox.maxLon);
    bbox.minLat = Math.min(lat, bbox.minLat);
    bbox.minLon = Math.min(lon, bbox.minLon);
  });
  bbox.latRange = bbox.maxLat - bbox.minLat;
  bbox.lonRange = bbox.maxLon - bbox.minLon;
  bbox.depthRange = bbox.maxDepth - bbox.minDepth;
  // 找到centerPos
  centerPos = {
    lon: bbox.minLon + (bbox.maxLon - bbox.minLon) / 2,
    lat: bbox.minLat + (bbox.maxLat - bbox.minLat) / 2,
  };
  let newMap = {};
  dataSource.forEach((ele) => {
    let lat = Number.parseFloat(ele.x);
    let lon = Number.parseFloat(ele.y);
    lat = lat - bbox.minLat;
    lon = lon - bbox.minLon;
    if (newMap[ele.pointNumber] === void 0) {
      newMap[ele.pointNumber] = [];
    }
    newMap[ele.pointNumber].push({
      ...ele,
      renderX: lat,
      renderY: lon,
      used: false,
      renderZ: -ele.startDepth * scaleValue,
      value: Number.parseFloat(ele.cadmium),
    });
  });
  return {
    result: newMap,
    bbox,
  };
}

class App {
  constructor() {
    this.initApp();
    this.initGUI();
    this.initGeometry();
    this.addEventListener();
  }

  initGeometry() {
    const { result, bbox } = initDataByDataSource(
      dataSource,
      this.params.scaleValue
    );
    // 构建第一个层面
    let firstFaceResults = [];
    for (const key of Object.keys(result)) {
      if (result[key].length !== 0) {
        firstFaceResults.push(result[key][0]);
      }
    }
    const convex = convexHull(firstFaceResults).map((ele) => [
      Number.parseFloat(ele.renderX),
      Number.parseFloat(ele.renderY),
    ]);
    let convexHullPoints = null;
    if (isPointEqual(convex[0], convex[convex.length - 1])) {
      convexHullPoints = turf.polygon([convex]);
    } else {
      convex.push(convex[0]);
      convexHullPoints = turf.polygon([convex]);
    }
    // 获取凸包点集
    var options = {
      bbox: [0, 0, bbox.latRange, bbox.lonRange],
    };
    var points = turf.randomPoint(1, options);
    points.features = firstFaceResults.map((ele) => {
      return {
        geometry: {
          coordinates: [
            Number.parseFloat(ele.renderX),
            Number.parseFloat(ele.renderY),
          ],
          type: "Point",
        },
        properties: {},
        type: "Feature",
      };
    });
    var voronoiPolygons = turf.voronoi(points, options);

    const geometry = new THREE.BufferGeometry().setFromPoints(
      convex.map((ele) => new THREE.Vector3(ele[0], ele[1], 0))
    );
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const line = new THREE.Line(geometry, material);
    // this.scene.add(line);

    for (const feature of voronoiPolygons.features) {
      const intersect = turf.intersect(feature, convexHullPoints);
      let points = intersect.geometry.coordinates[0];
      points = intersect.geometry.coordinates[0].map(
        (point) => new THREE.Vector3(point[0], point[1], 0)
      );
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: 0x000000 });
      const line = new THREE.Line(geometry, material);
      this.scene.add(line);
    }
  }

  initApp() {
    const _this = this;
    this.params = {};
    this.canvas = document.getElementById("renderingCanvas");
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.gui = new GUI();
    this.gui.add(document, "title");
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.scene = new THREE.Scene();
    this.scene.background = createLinearGradientCanvas();
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
    const pointLight = new THREE.PointLight(0xffffff, 3, 0, 0);
    this.camera.add(pointLight);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this.canvas,
    });
    this.renderer.localClippingEnabled = true;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.autoClear = false;
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
  }

  initGUI() {}

  render() {
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.controls.update();
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
