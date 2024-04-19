import { dataSource } from "data";
import * as THREE from "three";
import GUI from "lil-gui";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createLinearGradientCanvas, convexHull, BuildSurface } from "utils";

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
    this.dataSource = result;
    for (const key of Object.keys(result)) {
      // 渲染点
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
  buildFace() {
    if (!this.dataSource) {
      alert("不能建模");
      return;
    }
    if (this.operationParams) {
      alert("不能建模");
      return;
    }
    // 寻找出当前的第一个点
    let redCount = 0;
    let orangeCount = 0;
    let greenCount = 0;
    let currentColor = null;
    let firstPointsAll = Object.keys(this.dataSource).map((key) => {
      const currentRender = this.dataSource[key][0];
      const x = this.dataSource[key][0].renderX;
      const y = this.dataSource[key][0].renderY;
      const z = this.dataSource[key][0].renderZ;
      const pointNumber = this.dataSource[key][0].pointNumber;
      let range = 0;
      for (const item of this.dataSource[key]) {
        if (item.exceed !== currentRender.exceed) {
          break;
        }
        range = z - item.renderZ;
      }
      if (currentRender.exceed === "绿") {
        greenCount++;
      }
      if (currentRender.exceed === "橙") {
        orangeCount++;
      }
      if (currentRender.exceed === "红") {
        redCount++;
      }
      currentColor =
        greenCount > orangeCount ? "绿" : orangeCount > redCount ? "橙" : "红";
      if (currentColor !== currentRender.exceed) {
        range = 0;
      }
      // 根据XYZ 来创建一个控制点
      // 判断currentExceed
      const geometry = new THREE.DodecahedronGeometry(1.5, 1, 1);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        side: THREE.DoubleSide,
      });
      const controlPoint = new THREE.Mesh(geometry, material);
      controlPoint.position.set(x, z, y);
      this.scene.add(controlPoint);
      return {
        x,
        y: z,
        z: y,
        controlPoint,
        name: pointNumber,
        exceed: currentRender.exceed,
        range: range,
      };
    });
    const feedback = BuildSurface(firstPointsAll);
    // 创建一个几何体平面
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(feedback.vertices, 3)
    );
    geometry.setIndex(new THREE.BufferAttribute(feedback.indices, 1));
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    const wireframe = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      wireframeLinewidth: 5,
    });
    const mesh = new THREE.Mesh(geometry, material);
    const wireframeMesh = new THREE.Mesh(geometry, wireframe);
    this.scene.add(mesh);
    this.scene.add(wireframeMesh);
    if (!this.operationParams) {
      this.operationParams = {
        faces: [],
      };
    }
    const index = this.operationParams.faces.length;
    let faceParams = {
      operationFace: mesh,
      position: 0,
      material: currentColor,
    };
    this.operationParams.faces.push(faceParams);
    const currentFace = this.operationParams.faces[index];
    // 添加gui条目
    const faceOperationFolder = this.gui.addFolder(
      `土壤层面${this.operationParams.faces.length}`
    );

    // 创建一个slider
    faceOperationFolder
      .add(currentFace, "position", 0, 100, 1)
      .name("高度")
      .onChange((val) => {
        // 高度改变的时候，控制点的位置也要变
        // 获取到新的点
        const newPoint = Object.entries(currentFace)
          .filter((ele) => ele[1].changeing !== void 0)
          .map((ele) => {
            const value = ele[1];
            const changeingY = value.changeing
              ? value.y - (val / 100) * value.range
              : value.y;
            // 如果说当前正在变动的话，那么就让你更新changingY
            if (value.changeing) {
              currentFace[ele[0]].currentY = changeingY;
            }
            // 改变对应高度的控制点
            currentFace[ele[0]].controlPoint.position.set(
              value.x,
              currentFace[ele[0]].currentY,
              value.z
            );
            return {
              x: value.x,
              y: currentFace[ele[0]].currentY,
              z: value.z,
            };
          });
        // 再获取到新的面
        const feedback = BuildSurface(newPoint);
        const geometry = currentFace.operationFace.geometry;
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(feedback.vertices, 3)
        );
        geometry.setIndex(new THREE.BufferAttribute(feedback.indices, 1));
      });
    faceOperationFolder
      .add(currentFace, "material", ["红", "橙", "绿"])
      .name("土壤材质")
      .onChange((val) => {
        const color = colorMap[val];
        currentFace.operationFace.material.color.set(color);
      });
    faceOperationFolder.add(currentFace, "changeMaterial");
    // // 将所有的点给他传上去
    for (const point of firstPointsAll) {
      currentFace[point.name] = {
        changeing: point.exceed === currentColor,
        currentY: point.y,
        ...point,
      };
      if (point.exceed !== currentColor) {
        point.controlPoint.material.color.set(0x000000);
      }
      // 创建一个checkbox
      faceOperationFolder
        .add(currentFace[point.name], "changeing")
        .name(point.name)
        .onChange((val) => {
          if (val) {
            point.controlPoint.material.color.set(0xffffff);
          } else {
            point.controlPoint.material.color.set(0x000000);
          }
        });
    }
    console.log(currentFace);
    currentFace["folder"] = faceOperationFolder;
    this.operationParams.faces[index] = currentFace;
  }
  initApp() {
    const _this = this;
    this.params = {
      scaleValue: 9,
      addFace: () => {
        _this.buildFace();
      },
      buildSoild: () => {
        alert("不能建模");
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
    this.gui.add(this.params, "scaleValue", [3, 6, 9]).onChange(function () {});
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
