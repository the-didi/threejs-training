import * as THREE from "three";
import GUI from "lil-gui";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createLinearGradientCanvas, convexHull } from "utils";
class App {
  constructor() {
    this.initApp();
    this.initGUI();
    this.initGeometry();
    this.addEventListener();
  }
  initGeometry() {
    function generatorFaceByPoints(ps1, ps2) {
      const geometry = new THREE.BufferGeometry();
      let points = [];
      // 围面的上半部分
      for (let i = 0, j = 1; i < ps1.length; i++, j++) {
        const pA = ps1[i];
        const pB = ps2[j];
        const pC = ps2[j - 1];
        points.push(pA.x, pA.y, pA.z);
        if (i === ps1.length - 1) {
          points.push(ps2[0].x, ps2[0].y, ps2[0].z);
          points.push(pC.x, pC.y, pC.z);
        } else {
          points.push(pB.x, pB.y, pB.z);
          points.push(pC.x, pC.y, pC.z);
        }
      }
      // 围面的下半部分
      for (let i = 0, j = 1; i < ps1.length; i++, j++) {
        // 下面两个点，上面一个点
        const pA = ps1[i];
        const pB = ps1[i + 1];
        const pC = ps2[j];
        points.push(pA.x, pA.y, pA.z);
        // 如果便利到最后一个点了
        if (i === ps1.length - 1) {
          points.push(ps1[0].x, ps1[0].y, ps1[0].z);
          points.push(ps2[0].x, ps2[0].y, ps2[0].z);
        } else {
          points.push(pB.x, pB.y, pB.z);
          points.push(pC.x, pC.y, pC.z);
        }
      }
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(points), 3)
      );
      const material = new THREE.MeshBasicMaterial({
        color: 0xff0000, // 设置材质的颜色为红色
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      return mesh;
    }
    const points = [
      {
        x: 0.7458059217048607,
        y: 6.5249124179242095,
      },
      {
        x: 7.38699951258914,
        y: 9.537361837661642,
      },
      {
        x: 8.535014747400103,
        y: 4.7306787481195585,
      },
      {
        x: 7.5041549840077675,
        y: 3.3948030414931685,
      },
      {
        x: 5.33246776044326,
        y: 2.038988795446446,
      },
      {
        x: 0.9767993059671731,
        y: 1.5564489873114185,
      },
    ];
    const points2 = points.map((ele) => {
      return new THREE.Vector3(ele.x, 0, ele.y);
    });
    const points3 = points.map((ele) => {
      return new THREE.Vector3(ele.x, 5, ele.y);
    });
    const geometry = new THREE.BufferGeometry().setFromPoints(points3);
    const geometry2 = new THREE.BufferGeometry().setFromPoints(points2);
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const material2 = new THREE.LineBasicMaterial({ color: 0x0000ff });
    const line1 = new THREE.LineLoop(geometry, material);
    const line2 = new THREE.LineLoop(geometry2, material2);
    // 创建平面
    // const slide = generatorFaceByPoints(points2, points3);
    // this.scene.add(slide);
    const slide = generatorFaceByPoints(points2, points3);
    this.scene.add(slide);
    this.scene.add(line1);
    this.scene.add(line2);
  }
  initApp() {
    this.params = {};
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
