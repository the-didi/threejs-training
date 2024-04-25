import { dataSource } from "data";
import * as THREE from "three";
import GUI from "lil-gui";
import IDW from "idw";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";
import { VolumeRenderShader1 } from "three/addons/shaders/VolumeShader.js";
import {
  createLinearGradientCanvas,
  convexHull,
  BuildSurface,
  createTextureByCanvas,
} from "utils";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import { Lut } from "./Lut.js";
const colorMap = {
  粘土: 10524506.85743665,
  粉砂: 15565814.31318872,
  杂填土: 563564.5098018881,
  粉质粘土: 3614945.4266843526,
};

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

function generatorFaceByPoints(ps1, ps2) {
  const geometry = new THREE.BufferGeometry();
  let points = [];
  // 围面的上半部分
  let count = 0;
  const indexs = [0];
  for (let i = 0, j = 1; i < ps1.length; i++, j++) {
    const pA = ps1[i];
    const pB = ps2[j];
    const pC = ps2[j - 1];
    points.push(pA.x, pA.y, pA.z);
    count += 1;
    indexs.push(count);
    if (i === ps1.length - 1) {
      points.push(ps2[0].x, ps2[0].y, ps2[0].z);
      points.push(pC.x, pC.y, pC.z);
      count += 1;
      indexs.push(count);
      count += 1;
      indexs.push(count);
    } else {
      points.push(pB.x, pB.y, pB.z);
      points.push(pC.x, pC.y, pC.z);
      count += 1;
      indexs.push(count);
      count += 1;
      indexs.push(count);
    }
  }
  // 围面的下半部分
  for (let i = 0, j = 1; i < ps1.length; i++, j++) {
    // 下面两个点，上面一个点
    const pA = ps1[i];
    const pB = ps1[i + 1];
    const pC = ps2[j];
    points.push(pA.x, pA.y, pA.z);
    count += 1;
    indexs.push(count);
    // 如果便利到最后一个点了
    if (i === ps1.length - 1) {
      points.push(ps1[0].x, ps1[0].y, ps1[0].z);
      points.push(ps2[0].x, ps2[0].y, ps2[0].z);
      count += 1;
      indexs.push(count);
      count += 1;
      indexs.push(count);
    } else {
      points.push(pB.x, pB.y, pB.z);
      points.push(pC.x, pC.y, pC.z);
      count += 1;
      indexs.push(count);
      count += 1;
      indexs.push(count);
    }
  }
  geometry.setIndex(indexs);
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(points), 3)
  );
  return geometry;
}

function generatorMaterialBar() {
  const dom = document.getElementById("materialBar");
  // 创建blockbar
  for (const key of Object.keys(colorMap)) {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.flexDirection = "row";
    div.style.alignItems = "center";
    const colorDiv = document.createElement("div");
    colorDiv.style.width = "50%";
    colorDiv.style.height = "50px";
    colorDiv.style.background =
      "#" + new THREE.Color(colorMap[key]).getHexString();
    console.log(new THREE.Color(colorMap[key]).getHexString());
    const textDiv = document.createElement("div");
    textDiv.style.width = "50%";
    textDiv.style.textWrap = "nowrap";
    textDiv.style.color = "#fff";
    textDiv.innerText = `--${key}`;
    div.appendChild(colorDiv);
    div.appendChild(textDiv);
    dom.appendChild(div);
  }
}

function updateVolumnValue(interplotValue) {
  const defaultValue = 27057;
  const dom = document.getElementById("volumnValue");
  dom.innerText = (defaultValue * (1 - interplotValue)).toFixed(2);
}

function generatorColorBar() {
  const lut = new Lut();
  lut.setMax(255);
  lut.setMin(0);
  const canvas = document.getElementById("colorBar");
  lut.updateCanvas(canvas);
  const dom = document.getElementById("unit");
  for (let i = 0; i <= 3.0; i += 0.5) {
    const span = document.createElement("span");
    span.innerText = i.toFixed(2) + "--";
    dom.appendChild(span);
  }
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
    const { result, bbox } = initDataByDataSource(
      dataSource,
      this.params.scaleValue
    );
    this.dataSource = result;
    this.bbox = bbox;
    for (const key of Object.keys(result)) {
      // 渲染点
      for (let i = 0; i < result[key].length; i++) {
        const { renderX, renderY, renderZ } = result[key][i];
        const geometry = new THREE.DodecahedronGeometry(1, 4, 4);
        const material = new THREE.MeshBasicMaterial({
          color: colorMap[result[key][i].material],
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
          color: colorMap[end.material],
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
    let faceStackLength = null;
    let prevFace = null;
    if (!this.faceOperationGroup) {
      this.faceOperationGroup = new THREE.Group();
      this.scene.add(this.faceOperationGroup);
      this.gui.add(this.faceOperationGroup, "visible").name("显示层面");
    }
    if (this.operationParams) {
      faceStackLength = this.operationParams.faces.length - 1;
      prevFace = this.operationParams.faces[faceStackLength];
      prevFace.folder.close();
      for (const key of Object.keys(prevFace)) {
        if (prevFace[key] && prevFace[key].controlPoint !== void 0) {
          prevFace[key].controlPoint.visible = false;
          // prevFace[key].controlPoint.remove();
        }
      }
    }
    // 寻找出当前的第一个点
    let currentColor = null;
    let faceParams = {
      operationFace: null,
      position: 0,
      material: currentColor,
    };
    let firstPointsAll = Object.keys(this.dataSource).map((key) => {
      const currentRender = this.dataSource[key][0];
      let materialName = null;
      let x = null;
      let y = null;
      let z = null;
      let pointNumber = null;
      // 如果说上一层有材质,那么就用上一层的材质
      if (prevFace && prevFace[key].controlPoint) {
        x = prevFace[key].controlPoint.position.x;
        y = prevFace[key].controlPoint.position.z;
        z = prevFace[key].controlPoint.position.y;
        materialName = prevFace[key].material;
        pointNumber = prevFace[key].name;
      } else if (prevFace != null) {
        return null;
      } else {
        x = this.dataSource[key][0].renderX;
        y = this.dataSource[key][0].renderY;
        z = this.dataSource[key][0].renderZ;
        materialName = currentRender.material;
        pointNumber = this.dataSource[key][0].pointNumber;
      }
      currentColor = colorMap[currentRender.material];
      const geometry = new THREE.DodecahedronGeometry(1.5, 1, 1);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        side: THREE.DoubleSide,
      });
      const controlPoint = new THREE.Mesh(geometry, material);
      controlPoint.position.set(x, z, y);
      this.faceOperationGroup.add(controlPoint);
      return {
        x,
        y: z,
        z: y,
        controlPoint,
        name: pointNumber,
        material: materialName,
        range: 0,
      };
    });
    firstPointsAll = firstPointsAll
      .filter((ele) => ele !== null)
      .map((ele) => {
        // 1. 找到判断土壤材质的剩余空间
        for (let i = 0; i < this.dataSource[ele.name]; i++) {
          if (this.dataSource[ele.name][i].renderZ < ele.y) {
            continue;
          }
          if (this.dataSource[ele.name][i].material === ele.material) {
            ele.range = this.dataSource[ele.name][i].renderZ - ele.y;
          } else {
            break;
          }
        }
        return ele;
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
      color: currentColor,
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
    faceParams.operationFace = mesh;
    const wireframeMesh = new THREE.Mesh(geometry, wireframe);
    this.faceOperationGroup.add(mesh);
    this.faceOperationGroup.add(wireframeMesh);
    // this.scene.add(mesh);
    // this.scene.add(wireframeMesh);
    if (!this.operationParams) {
      this.operationParams = {
        faces: [],
      };
    }
    const index = this.operationParams.faces.length;
    this.operationParams.faces.push(faceParams);
    const currentFace = this.operationParams.faces[index];
    // 添加gui条目
    if (!this.faceOperationGUI) {
      this.faceOperationGUI = new GUI({
        container: document.getElementById("custom"),
      });
    }
    const faceOperationFolder = this.faceOperationGUI.addFolder(
      `土层表面${this.operationParams.faces.length}`
    );
    this.faceOperationFolderGUI = faceOperationFolder;
    // 创建一个slider
    faceOperationFolder
      .add(currentFace, "position", 0, 100, 1)
      .name("高度")
      .onChange((val) => {
        // 高度改变的时候，控制点的位置也要变
        // 获取到新的点
        const newPoint = Object.entries(currentFace)
          .filter((ele) => ele[1] && ele[1].changeing !== void 0)
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
    Object.keys(colorMap).forEach((ele) => {
      if (colorMap[ele] === currentColor) {
        currentFace.material = ele;
      }
    });
    faceOperationFolder
      .add(currentFace, "material", Object.keys(colorMap))
      .name("土壤材质")
      .onChange((val) => {
        const color = colorMap[val];
        currentFace.operationFace.material.color.set(color);
        // 土壤材质改变的时候,点也要变
        for (const key of Object.keys(currentFace)) {
          if (currentFace[key].controlPoint === void 0) {
            continue;
          }
          currentFace[key].material = val;
          const ele = currentFace[key];
          for (let i = 0; i < this.dataSource[key].length; i++) {
            if (this.dataSource[key][i].renderZ >= ele.y) {
              continue;
            }
            if (this.dataSource[key][i].material === ele.material) {
              ele.range = Math.abs(this.dataSource[key][i].renderZ - ele.y);
            } else {
              break;
            }
          }
          if (ele.range !== 0) {
            currentFace[key].controlPoint.material.color.set(0xffffff);
            currentFace[key].changeing = true;
          }
          currentFace[key].range = ele.range;
        }
      });
    // // 将所有的点给他传上去
    for (const point of firstPointsAll) {
      currentFace[point.name] = {
        ...currentFace[point.name],
        changeing: colorMap[point.material] === currentColor,
        currentY: point.y,
        ...point,
      };
      if (colorMap[point.material] !== currentColor) {
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
    currentFace["folder"] = faceOperationFolder;
    this.operationParams.faces[index] = currentFace;
  }
  buildSoil() {
    if (!this.operationParams || this.operationParams.faces.length < 0) {
      alert("不能建模土壤");
      return;
    }
    if (this.operationVolumnParams) {
      alert("已经建模过了土壤");
      return;
    }
    if (!this.operationVolumnParams) {
      this.operationVolumnParams = {
        operationGroup: null,
        opacity: 1.0,
        volumns: [],
      };
      this.volumnGroupGUI = new GUI({
        container: document.getElementById("volumn"),
      });
    }
    const volumnGroup = new THREE.Group();
    // 将面建模的数据给清除掉
    for (let i = 0; i < this.operationParams.faces.length - 1; i++) {
      let params = {
        opacity: 1.0,
        mesh: null,
        folder: null,
      };
      const face1 =
        this.operationParams.faces[i].operationFace.geometry.clone();
      // const face2 =
      //   this.operationParams.faces[i + 1].operationFace.geometry.clone();
      const facePoints1 = convexHull(
        Object.keys(this.operationParams.faces[i])
          .filter(
            (key) => this.operationParams.faces[i][key].controlPoint !== void 0
          )
          .map((ele) => {
            const item = this.operationParams.faces[i][ele];
            return {
              x: item.controlPoint.position.x,
              y: item.controlPoint.position.z,
              z: item.controlPoint.position.y,
            };
          })
      ).map((item) => {
        return new THREE.Vector3(item.x, item.z, item.y);
      });
      const facePoints2 = convexHull(
        Object.keys(this.operationParams.faces[i + 1])
          .filter(
            (key) =>
              this.operationParams.faces[i + 1][key].controlPoint !== void 0
          )
          .map((ele) => {
            const item = this.operationParams.faces[i + 1][ele];
            return {
              x: item.controlPoint.position.x,
              y: item.controlPoint.position.z,
              z: item.controlPoint.position.y,
            };
          })
      ).map((item) => {
        return new THREE.Vector3(item.x, item.z, item.y);
      });
      const sliceGeometry = generatorFaceByPoints(facePoints1, facePoints2);
      const soilGeometry = BufferGeometryUtils.mergeGeometries(
        [face1, sliceGeometry],
        true
      );
      const material = new THREE.MeshBasicMaterial({
        color: colorMap[this.operationParams.faces[i + 1].material],
        side: THREE.DoubleSide,
        transparent: true,
      });
      const mesh = new THREE.Mesh(soilGeometry, material);
      params.mesh = mesh;
      volumnGroup.add(mesh);
      console.log(this.volumnGroupGUI);
      params.folder = this.volumnGroupGUI.addFolder(`土壤${i + 1}`);
      params.folder
        .add(params, "opacity", 0, 1, 0.1)
        .name("透明度")
        .onChange((val) => {
          params.mesh.material.opacity = val;
        });
      this.operationVolumnParams.volumns.push(params);
    }
    this.operationVolumnParams.operationGroup = volumnGroup;
    this.scene.add(volumnGroup);
    this.gui.add(volumnGroup, "visible").name("显示土壤");
  }
  buildVoxel() {
    let dataSource = [];
    Object.keys(this.dataSource).forEach((key) => {
      dataSource.push(...this.dataSource[key]);
    });
    const positions = dataSource.map((ele) => [ele.x, ele.y, ele.z]);
    const vs = dataSource.map((ele) => ele.value);
    // this.idw = new IDW(
    //   {
    //     position: positions,
    //     values: vs,
    //   },
    //   {
    //     periodicExtent: [
    //       [0, this.bbox.latRange],
    //       [0, this.bbox.lonRange],
    //       [0, this.bbox.depthRange],
    //     ],
    //   }
    // );
    const lut = new Lut();
    lut.setColorMap("rainbow");
    lut.setMax(255);
    lut.setMin(0);
    console.log(lut.createTransformCanvas());
    const volconfig = {
      clim1: 0,
      clim2: 1,
      renderstyle: "iso",
      isothreshold: 0.15,
      colormap: "rainbow",
    };
    const cmtextures = {
      viridis: new THREE.TextureLoader().load(
        "../lib/examples/textures/cm_viridis.png",
        () => {}
      ),
      gray: new THREE.TextureLoader().load(
        "../lib/examples/textures/cm_gray.png",
        () => {}
      ),
      rainbow: createTextureByCanvas(lut.createCanvas()),
    };
    const width = this.bbox.latRange;
    const height = this.bbox.lonRange;
    const depth = this.bbox.depthRange;
    const data = new Uint8Array(width * height * depth);
    let i = 0;
    const perlin = new ImprovedNoise();
    const vector = new THREE.Vector3();
    for (let z = 0; z < height; z++) {
      for (let y = 0; y < depth; y++) {
        for (let x = 0; x < width; x++) {
          vector.set(x, y, z).divideScalar(256);
          const d = perlin.noise(
            vector.x * 12.5,
            vector.y * 12.5,
            vector.z * 12.5
          );
          data[i++] = d * 128 + 128;
        }
      }
    }
    const texture = new THREE.Data3DTexture(data, width, height, depth);
    texture.format = THREE.RedFormat;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;
    const geometry = new THREE.BoxGeometry(width, depth, height);
    geometry.translate(width / 2 - 0.5, depth / 2 - 0.5, height / 2 - 0.5);
    const shader = VolumeRenderShader1;
    const uniforms = THREE.UniformsUtils.clone(shader.uniforms);
    uniforms["u_data"].value = texture;
    uniforms["u_size"].value.set(width, depth, height);
    uniforms["u_clim"].value.set(volconfig.clim1, volconfig.clim2);
    uniforms["u_renderstyle"].value = volconfig.renderstyle == "mip" ? 0 : 1; // 0: MIP, 1: ISO
    uniforms["u_renderthreshold"].value = volconfig.isothreshold;
    uniforms["u_cmdata"].value = cmtextures[volconfig.colormap];
    console.log(cmtextures[volconfig.colormap]);
    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.5,
    });
    this.voxelMesh = new THREE.Mesh(geometry, material);
    this.voxelMesh.translateY(-height / 4 - 20);
    this.scene.add(this.voxelMesh);
    this.gui.add(this.voxelMesh, "visible").name("显示污染物");
    // 加入GUI
    this.volumeGUI = new GUI({
      container: document.getElementById("volume"),
    });
    this.volumeGUI
      .add(volconfig, "clim1", 0, 1, 0.01)
      .name("亮度")
      .onChange(updateUniforms);
    this.volumeGUI
      .add(volconfig, "clim2", 0, 1, 0.01)
      .name("对比度")
      .onChange(updateUniforms);
    this.volumeGUI
      .add(volconfig, "colormap", { gray: "gray", viridis: "viridis" })
      .onChange(updateUniforms);
    this.volumeGUI
      .add(volconfig, "renderstyle", { mip: "mip", iso: "iso" })
      .name("渲染方式")
      .onChange(updateUniforms);
    this.volumeGUI
      .add(volconfig, "isothreshold", 0, 1, 0.01)
      .name("临界值")
      .onChange(updateUniforms);
    function updateUniforms() {
      material.uniforms["u_clim"].value.set(volconfig.clim1, volconfig.clim2);
      material.uniforms["u_renderstyle"].value =
        volconfig.renderstyle == "mip" ? 0 : 1; // 0: MIP, 1: ISO
      material.uniforms["u_renderthreshold"].value = volconfig.isothreshold; // For ISO renderstyle
      material.uniforms["u_cmdata"].value = cmtextures[volconfig.colormap];
      updateVolumnValue(volconfig.isothreshold);
    }
  }
  initApp() {
    const _this = this;
    generatorMaterialBar();
    generatorColorBar();
    this.params = {
      scaleValue: 9,
      addFace: () => {
        _this.buildFace();
      },
      buildSoild: () => {
        _this.buildSoil();
      },
      voxelBuild: () => {
        _this.buildVoxel();
      },
      buildSliceX: () => {
        _this.buildSliceX();
      },
      buildSliceZ: () => {
        _this.buildSliceZ();
      },
      buildSliceY: () => {
        _this.buildSliceY();
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
    this.gui.add(this.params, "addFace").name("写入表面");
    this.gui.add(this.params, "buildSoild").name("写入土壤");
    this.gui.add(this.params, "buildSoild").name("写入测算范围");
    this.gui.add(this.params, "buildSliceX").name("写入X切面");
    this.gui.add(this.params, "buildSliceY").name("写入Y切面");
    this.gui.add(this.params, "buildSliceZ").name("写入Z切面");
    this.gui.add(this.params, "voxelBuild").name("计算污染物");
  }
  buildSliceX() {
    alert("还未集成");
  }
  buildSliceY() {
    alert("还未集成");
  }
  buildSliceZ() {
    alert("还未集成");
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
