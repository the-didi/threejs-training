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
