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
      let index = [];
      let color = [];
      let z = 0;
      for (let i = 0, j = 1; i < ps1.length; i++, j++, z += 3) {
        // 传入PS1的值
        points.push(ps1[i].x, ps1[i].y, ps1[i].z);
        if (j === ps2.length) {
          index.push(z, z - 1, 1);
        } else {
          // 传入ps2-2的值
          points.push(ps2[j - 1].x, ps2[j - 1].y, ps2[j - 1].z);
          // 传入ps2的值
          points.push(ps2[j].x, ps2[j].y, ps2[j].z);
          index.push(z, z + 1, z + 2);
        }
        // color.push(0.0, 1.0, 0.0);
      }
      const vertices = new Float32Array(points);
      const indices = new Float32Array(index);
      // const colors = new Float32Array(color);
      geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
      // geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      const vertexShader = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

      // 定义片元着色器
      const fragmentShader = `
  void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // 红色
  }
`;
      const material = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
      });
      return new THREE.Mesh(geometry, material);
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
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const material2 = new THREE.LineBasicMaterial({ color: 0x0000ff });
    const line1 = new THREE.LineLoop(geometry, material);
    const line2 = new THREE.LineLoop(geometry2, material2);
    // 创建平面
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
