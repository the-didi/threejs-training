import * as THREE from "three";
import GUI from "lil-gui";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Lut } from "three/addons/math/Lut.js";
import { createLinearGradientCanvas } from "utils";

class App {
  constructor() {
    this.initApp();
    this.initGUI();
    this.initGeometry();
    this.addEventListener();
  }
  initApp() {
    // Init params
    this.params = {
      colorMap: "cooltowarm",
    };
    // Init canvas
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
    this.camera = new THREE.PerspectiveCamera(60, width / height, 1, 100);
    this.camera.position.set(0, 0, 10);
    this.scene.add(this.camera);

    // Init Light
    const pointLight = new THREE.PointLight(0xffffff, 3, 0, 0);
    this.camera.add(pointLight);

    // Init Lut
    this.lut = new Lut();

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
  updateColors() {
    let geometry = this.geometry;
    this.lut.setColorMap(this.params.colorMap);
    this.lut.setMax(2000);
    this.lut.setMin(0);
    const pressures = geometry.attributes.pressure;
    const colors = geometry.attributes.color;
    const color = new THREE.Color();
    for (let i = 0; i < pressures.array.length; i++) {
      const colorValue = pressures.array[i];
      color.copy(this.lut.getColor(colorValue)).convertSRGBToLinear();
      colors.setXYZ(i, color.r, color.g, color.b);
    }
    colors.needsUpdate = true;
    this.mesh.geometry = geometry;
  }
  initGeometry() {
    const loader = new THREE.BufferGeometryLoader();
    this.mesh = new THREE.Mesh(
      void 0,
      new THREE.MeshLambertMaterial({
        side: THREE.DoubleSide,
        color: "0xf5f5f5",
        vertexColors: true,
      })
    );
    this.scene.add(this.mesh);
    const _this = this;
    loader.load(
      "../lib/examples/models/json/pressure.json",
      function (geometry) {
        _this.geometry = geometry;
        _this.geometry.center();
        _this.geometry.computeVertexNormals();
        const colors = [];
        for (
          let i = 0, n = _this.geometry.attributes.position.count;
          i < n;
          ++i
        ) {
          colors.push(1, 1, 1);
        }
        _this.geometry.setAttribute(
          "color",
          new THREE.Float32BufferAttribute(colors, 3)
        );
        _this.updateColors();
        _this.mesh.geometry = _this.geometry;
      }
    );
  }
  initGUI() {
    const _this = this;
    this.gui
      .add(this.params, "colorMap", [
        "rainbow",
        "cooltowarm",
        "blackbody",
        "grayscale",
      ])
      .onChange(function () {
        _this.updateColors();
      });
  }
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
