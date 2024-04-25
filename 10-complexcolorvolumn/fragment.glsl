precision highp float;
precision mediump sampler3D;

uniform vec3 u_size;
uniform float u_renderthreshold; // 阈值
uniform sample3D u_data; // volumn
uniform sample2D u_cmdata; // 贴图

varying vec3 v_position;
varying vec4 v_nearpos;
varying vec4 v_farpos;

out vec4 FragColor;

void main() {
  FragColor = vec4(1.0, 0.0, 0.0, 1.0); // 红色
}