import * as THREE from "three";

export function createLinearGradientCanvas() {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 256;
  canvas.height = 256;
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height / 4);
  gradient.addColorStop(0, "#757373"); // 顶部颜色
  gradient.addColorStop(1, "#242323"); // 底部颜色
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function rotateCanvas90(canvas) {
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const rotatedCanvas = document.createElement("canvas");
  const rotatedCtx = rotatedCanvas.getContext("2d");

  // 交换宽度和高度
  rotatedCanvas.width = canvas.height;
  rotatedCanvas.height = canvas.width;

  // 将图像数据旋转90度
  for (let i = 0; i < canvas.width; i++) {
    for (let j = 0; j < canvas.height; j++) {
      const index = (j * canvas.width + i) * 4;
      const rotatedIndex = (i * canvas.height + (canvas.height - j - 1)) * 4;

      rotatedCtx.fillStyle = `rgba(${imageData.data[index]}, ${
        imageData.data[index + 1]
      }, ${imageData.data[index + 2]}, ${imageData.data[index + 3] / 255})`;
      rotatedCtx.fillRect(canvas.height - j - 1, i, 1, 1);
    }
  }

  return rotatedCanvas;
}

export function createTextureByCanvas(canvas) {
  canvas = rotateCanvas90(canvas);
  console.log(canvas.toDataURL("image/png"));
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export function convexHull(points) {
  points.sort(function (a, b) {
    return a.x != b.x ? a.x - b.x : a.y - b.y;
  });
  var n = points.length;
  var hull = [];
  for (var i = 0; i < 2 * n; i++) {
    var j = i < n ? i : 2 * n - 1 - i;
    while (
      hull.length >= 2 &&
      removeMiddle(hull[hull.length - 2], hull[hull.length - 1], points[j])
    )
      hull.pop();
    hull.push(points[j]);
  }
  hull.pop();
  return hull;
}

function removeMiddle(a, b, c) {
  var cross = (a.x - b.x) * (c.y - b.y) - (a.y - b.y) * (c.x - b.x);
  var dot = (a.x - b.x) * (c.x - b.x) + (a.y - b.y) * (c.y - b.y);
  return cross < 0 || (cross == 0 && dot <= 0);
}

// 计算叉积
export function crossProduct(p1, p2, p3) {
  const dx1 = p2[0] - p1[0];
  const dy1 = p2[1] - p1[1];
  const dx2 = p3[0] - p1[0];
  const dy2 = p3[1] - p1[1];
  return dx1 * dy2 - dy1 * dx2;
}

// 点是否在convexFull里面
export function isPointInConvex(point, convexPoints) {
  const n = convexPoints.length;
  let sign = 0;
  for (let i = 0; i < n; i++) {
    const p1 = convexPoints[i];
    const p2 = convexPoints[(i + 1) % n];
    const cross = crossProduct(point, p1, p2);
    if (i === 0) {
      sign = Math.sign(cross);
    } else if (Math.sign(cross) !== sign) {
      return false;
    }
  }
  return true;
}

export function delaunayCenter(points) {
  // 执行三角剖分
  const delaunay = d3.Delaunay.from(points);
  const triangles = delaunay.triangles;
  // 用于存储所有边的中点
  const midpoints = [];
  // 遍历每个三角形来找到边的中点
  for (let i = 0; i < triangles.length; i += 3) {
    const pointsIndices = [triangles[i], triangles[i + 1], triangles[i + 2]];
    for (let j = 0; j < pointsIndices.length; j++) {
      const startPoint = points[pointsIndices[j]];
      const endPoint = points[pointsIndices[(j + 1) % pointsIndices.length]];
      // 计算中点
      const midpoint = [
        (startPoint[0] + endPoint[0]) / 2,
        (startPoint[1] + endPoint[1]) / 2,
      ];
      midpoints.push(midpoint);
    }
  }
  // 如果需要去除重复的中点，可以使用以下方法
  const uniqueMidpoints = Array.from(
    new Set(midpoints.map((point) => point.join(",")))
  ).map((s) => s.split(",").map(Number));
  // 现在你有了所有初始点和新计算出的中点
  const allPoints = points.concat(uniqueMidpoints);
  return {
    points: allPoints,
    hull: delaunay.triangles,
  };
}

export function BuildSurface(points) {
  let result = [];
  const xArr = points.map((ele) => ele.x);
  const yArr = points.map((ele) => ele.y);
  const zArr = points.map((ele) => ele.z);
  let indexArr = [];
  let newpoints = points.map((ele) => {
    return [Number.parseInt(ele.x), Number.parseInt(ele.z)];
  });
  for (let i = 0; i < 1; i++) {
    const { points, hull } = delaunayCenter(newpoints);
    indexArr = hull;
    newpoints = points;
  }
  let sigma = 0;
  let alpha = 100;
  let model = "exponential";
  var variogram = kriging.train(yArr, xArr, zArr, model, sigma, alpha);
  for (let i = 0; i < newpoints.length; i++) {
    const predict_interplotvalue = kriging.predict(
      newpoints[i][0],
      newpoints[i][1],
      variogram
    );
    result.push(newpoints[i][0], predict_interplotvalue, newpoints[i][1]);
  }
  const indices = new Uint16Array(indexArr);
  const vertices = new Float32Array(result);
  return {
    indices,
    vertices,
  };
}

export function initDataByDataSource(dataSource, scaleValue) {
  let bbox = {
    minLat: Infinity,
    minLon: Infinity,
    minDepth: Infinity,
    maxDepth: -Infinity,
    maxLat: -Infinity,
    maxLon: -Infinity,
  };
  let centerPos = null;
  // 第一次遍历，找到bbox
  dataSource.forEach((ele) => {
    const lat = Number.parseFloat(ele.latitude);
    const lon = Number.parseFloat(ele.longitude);
    const depth = Number.parseFloat(ele.startDepth) * scaleValue;
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
      z: ele.startDepth * scaleValue,
      value: Number.parseFloat(ele.cadmium),
    });
  });
  return {
    result,
    bbox,
  };
}

function PointCamp(a, b, center) {
  if (a[0] >= 0 && b[0] < 0) return true;
  if (a[0] == 0 && b[0] == 0) return a[1] > b[1];
  const det =
    (a[0] - center[0]) * (b[1] - center[1]) -
    (b[0] - center[0]) * (a[1] - center[1]);

  if (det < 0) return true;
  if (det > 0) return false;
  const d1 =
    (a[0] - center[0]) * (a[0] - center[0]) +
    (a[1] - center[1]) * (a[1] - center[1]);
  const d2 =
    (b[0] - center[0]) * (b[0] - center[1]) +
    (b[1] - center[1]) * (b[1] - center[1]);
  return d1 > d2;
}

// 排序points,让无序的points变为有序的
export function SortPoints(points) {
  let center = [0, 0];
  let x = 0,
    y = 0;
  for (const point of points) {
    x += point[0];
    y += point[1];
  }
  center[0] = Number.parseInt(x / points.length);
  center[1] = Number.parseInt(y / points.length);

  for (let i = 0; i < points.length; i++) {
    for (let j = 0; j < points.length - i - 1; j++) {
      if (PointCamp(points[j], points[j + 1], center)) {
        const tmp = points[j];
        points[j] = points[j + 1];
        points[j + 1] = tmp;
      }
    }
  }
  return points;
}
// 排斥实验
function IsRectCross(p1, p2, q1, q2) {
  console.log(p1, p2, q1, q2);
  return (
    Math.min(p1[0], p2[0]) <= Math.max(q1[0], q2[0]) &&
    Math.min(q1[0], q2[0]) <= Math.max(p1[0], p2[0]) &&
    Math.min(p1[1], p2[1]) <= Math.max(q1[1], q2[1]) &&
    Math.min(q1[1], q2[1]) <= Math.max(p1[1], p2[1])
  );
}

// 跨立判断
function IsLineSegmentCross(pf1, pf2, ps1, ps2) {
  let line1, line2;
  line1 =
    pf1[0] * (ps1[1] - pf2[1]) +
    pf2[0] * (pf1[1] - ps1[1]) +
    ps1[0] * (pf2[1] - pf1[1]);
  line2 =
    pf1[0] * (ps2[1] - pf2[1]) +
    pf2[0] * (pf1[1] - ps2[1]) +
    ps2[0] * (ps2[1] - ps1[1]);

  if (line1 ^ (line2 >= 0) && !(line1 == 0 && line2 == 0)) return false;
  return true;
}

// 获取两条线段的交点
function GetCrossPoint(p1, p2, q1, q2) {
  if (IsRectCross(p1, p2, q1, q2)) {
    if (IsLineSegmentCross(p1, p2, q1, q2)) {
      let tmpLeft, tmpRight;
      tmpLeft = (q2.x - q1.x) * (p1.y - p2.y) - (p2.x - p1.x) * (q1.y - q2.y);
      tmpRight =
        (p1.y - q1.y) * (p2.x - p1.x) * (q2.x - q1.x) +
        q1.x * (q2.y - q1.y) * (p2.x - p1.x) -
        p1.x * (p2.y - p1.y) * (q2.x - q1.x);
      x = Number.parseInt(tmpRight / tmpLeft);
      tmpLeft = (p1.x - p2.x) * (q2.y - q1.y) - (p2.y - p1.y) * (q1.x - q2.x);
      tmpRight =
        p2.y * (p1.x - p2.x) * (q2.y - q1.y) +
        (q2.x - p2.x) * (q2.y - q1.y) * (p1.y - p2.y) -
        q2.y * (q1.x - q2.x) * (p2.y - p1.y);
      y = Number.parseInt(tmpRight / tmpLeft);
      return { x, y };
    }
  }
  return null;
}

// 计算两个多边形的交集
export function PolygonClip(points1, points2) {
  let cliped_points = [];
  if (points1.length < 3 || points2.length < 3) {
    return;
  }
  for (let i = 0; i < points1.length; i++) {
    let poly1_next_idx = (i + 1) % points2.length;
    for (let j = 0; j < points2.length; j++) {
      let poly2_next_idx = (j + 1) % points2.length;
      const data = GetCrossPoint(
        points1[i],
        points1[poly1_next_idx],
        points2[j],
        points2[poly2_next_idx]
      );
      if (data) {
        let { x, y } = data;
        cliped_points.push([x, y]);
      }
    }
  }
  for (let i = 0; i < points1.length; i++) {
    if (IsPointInpolygon(points2, points1[i])) {
      cliped_points.push(points1[i]);
    }
  }
  for (let i = 0; i < points2.length; i++) {
    if (IsPointInpolygon(points2, points2[i])) {
      cliped_points.push(points2[i]);
    }
  }
  return ClockwiseSortPoints(cliped_points);
}
