<template>
  <div id="div3d">
    <div id="textDiv">
      <text id="errorText" v-if="showErrorInfo">加载失败，请检查资源</text>
    </div>
    <canvas id="threeCanvas" ref="threeCanvas"></canvas>
    <progress
      id="progress"
      v-if="showProgress"
      :value="progressValue"
      max="100"
    ></progress>
  </div>
</template>

<script>
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/addons/renderers/CSS2DRenderer.js";

let camera, scene, renderer, controls, labelRenderer;

export default {
  props: {
    modelUrl: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      showErrorInfo: false,
      showProgress: true,
      progressValue: 0,
    };
  },
  mounted() {
    this.initScene(this.modelUrl);
  },
  methods: {
    initScene(modelUrl) {
      // 相机far
      const cameraMaxDistance = 20000;

      // 设置初始化状态
      this.$refs.threeCanvas.hidden = true;

      // 添加透视相机，设置fov、初始位置
      camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        1,
        cameraMaxDistance
      );
      camera.position.set(0, 500, 3000);

      // 添加场景及颜色
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xffffff);

      // 添加光源
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
      hemiLight.position.set(0, 200, 0);
      scene.add(hemiLight);

      // 设置直射光
      const dirLight = new THREE.DirectionalLight(0xffffff);
      dirLight.castShadow = true;

      // 添加ground
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(10000, 10000),
        new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      // 添加WebGLRenderer，设置size
      renderer = new THREE.WebGLRenderer({
        canvas: this.$refs.threeCanvas,
        antialias: true,
      });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;

      // 创建labal renderer
      labelRenderer = new CSS2DRenderer();
      labelRenderer.setSize(window.innerWidth, window.innerHeight);
      labelRenderer.domElement.style.position = "absolute";
      labelRenderer.domElement.style.top = "0px";
      document.body.appendChild(labelRenderer.domElement);

      // 添加相机控制器
      controls = new OrbitControls(camera, labelRenderer.domElement);
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.5;
      controls.target.set(0, 0, 0);

      // 加载进度manager
      const manager = new THREE.LoadingManager();
      const loader = new FBXLoader(manager);
      loader.load(
        modelUrl,
        (object) => {
          object.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = false;
            }
          });
          // 根据包围盒设置地面位置，保证阴影投在最下方
          const bbox = new THREE.Box3().setFromObject(object);
          ground.position.set(0, -(bbox.max.y - bbox.min.y) / 2, 0);
          // 根据包围盒设置设置物体中心点为（0，0，0）
          object.position.set(
            -(bbox.min.x + bbox.max.x) / 2,
            -(bbox.min.y + bbox.max.y) / 2,
            -(bbox.min.z + bbox.max.z) / 2
          );
          // 根据物体大小适配相机位置
          const xH = bbox.max.x - bbox.min.x;
          const yH = bbox.max.y - bbox.min.y;
          const zH = bbox.max.z - bbox.min.z;
          const maxValue = xH > yH ? (xH > zH ? xH : zH) : yH > zH ? yH : zH;
          const cameraZ = maxValue * 2;
          camera.position.set(0, cameraZ / 6, cameraZ);

          // 设置zoom limit
          const cameraMaxDistance = maxValue * 3;
          controls.maxDistance =
            cameraMaxDistance < cameraMaxDistance
              ? cameraMaxDistance
              : cameraMaxDistance;
          controls.minDistance = maxValue;

          // 根据物体大小设置相机投影范围
          const dirLightY = maxValue * 1.2;
          const dirLightZ = maxValue * 0.6;
          dirLight.position.set(0, dirLightY, dirLightZ);
          // 设置camera投影范围
          dirLight.shadow.camera.top = dirLightY;
          dirLight.shadow.camera.bottom = -dirLightY;
          dirLight.shadow.camera.left = -dirLightY;
          dirLight.shadow.camera.right = dirLightY;
          dirLight.shadow.camera.near = 1;
          dirLight.shadow.camera.far = dirLightY * 2;
          // 开启灯光投影
          dirLight.castShadow = true;
          scene.add(dirLight);
          // 显示投影框
          // scene.add( new THREE.CameraHelper( dirLight.shadow.camera ) );

          // 添加object到场景里
          scene.add(object);

          // 包围位置为世界坐标，每次使用需要重新计算
          const bbox1 = new THREE.Box3().setFromObject(object);
          const rightDownPoint = new THREE.Vector3(
            bbox1.max.x,
            bbox1.min.y,
            bbox1.max.z
          );
          const leftDownPoint = new THREE.Vector3(
            -bbox1.max.x,
            bbox1.min.y,
            bbox1.max.z
          );
          // 创建线的材质
          const material = new THREE.LineBasicMaterial({ color: 0x000000 });
          // 设置线的关键点
          const points = [rightDownPoint, leftDownPoint];
          // 生成线
          this.generateLine(points, material);
          // 生成label
          this.generateLabel(
            object,
            new THREE.Vector3(
              (bbox.max.x + bbox.min.x) / 2,
              bbox.min.y,
              bbox.max.z
            ),
            bbox.max.x - bbox.min.x
          );

          const rightUpPoint = new THREE.Vector3(
            bbox1.max.x,
            bbox1.max.y,
            bbox1.max.z
          );
          const points1 = [rightDownPoint, rightUpPoint];
          this.generateLine(points1, material);
          // 生成label
          this.generateLabel(
            object,
            new THREE.Vector3(
              bbox.max.x,
              (bbox.max.y + bbox.min.y) / 2,
              bbox.max.z
            ),
            bbox.max.y - bbox.min.y
          );

          const rightBackPoint = new THREE.Vector3(
            bbox1.max.x,
            bbox1.min.y,
            bbox1.min.z
          );
          const points2 = [rightDownPoint, rightBackPoint];
          this.generateLine(points2, material);
          // 生成label
          this.generateLabel(
            object,
            new THREE.Vector3(
              bbox.max.x,
              bbox.min.y,
              (bbox.max.z + bbox.min.z) / 2
            ),
            bbox.max.z - bbox.min.z
          );

          // 生成标尺的四个点
          const radius = 7;
          this.generatePoint(rightDownPoint, radius, material);
          this.generatePoint(leftDownPoint, radius, material);
          this.generatePoint(rightUpPoint, radius, material);
          this.generatePoint(rightBackPoint, radius, material);

          // 隐藏进度条
          this.showProgress = false;
          // 显示canvas
          this.$refs.threeCanvas.hidden = false;
        },
        this.onProgress,
        this.onError
      );

      // 监听窗口reszie事件
      window.addEventListener("resize", this.onWindowResize);
      // 监听窗口reszie事件
      window.addEventListener("mousedown", this.onMouseDown);
      // 设置tick
      this.animate();
    },

    // 生成线
    generateLine(points, material) {
      // 生成线的geometry
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      // 生成line mesh
      const line = new THREE.Line(geometry, material);
      // 添加到场景
      scene.add(line);
    },

    // 生成2d标签
    generateLabel(parentObject, position, distance) {
      // 创建div
      const divLabel = document.createElement("div");
      // 设置标签样式
      divLabel.textContent = Math.floor(distance).toString() + "mm";
      divLabel.style.fontWeight = "600";
      divLabel.style.fontSize = "16px";
      divLabel.style.padding = "0px 10px";
      divLabel.style.backgroundColor = "white";
      divLabel.style.opacity = "0.85";
      divLabel.style.borderRadius = "15px";
      // 创建标签label
      const label = new CSS2DObject(divLabel);
      // 设置label在object中位置
      label.position.set(position.x, position.y, position.z);
      // 添加到object
      parentObject.add(label);
    },

    // 生成标尺点
    generatePoint(position, radius, material) {
      // 生成Sphere
      const geometry = new THREE.SphereGeometry(radius, 32, 16);
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(position.x, position.y, position.z);
      scene.add(sphere);
    },

    // 加载进度
    onProgress(xhr) {
      if (xhr.lengthComputable) {
        const percentComplete = (xhr.loaded / xhr.total) * 100;
        this.progressValue = Math.round(percentComplete, 2);
        // console.log("model " + Math.round(percentComplete, 2) + "% downloaded");
      }
    },

    // 加载失败回掉
    onError(error) {
      console.log(error.message);
      this.showProgress = false;
      this.$refs.threeCanvas.hidden = true;
      this.showErrorInfo = true;
    },

    // 重置窗口大小
    onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      // 更新相机投影矩阵
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      labelRenderer.setSize(window.innerWidth, window.innerHeight);
    },

    // 鼠标点击事件
    onMouseDown() {
      controls.autoRotate = false;
    },

    // 每帧调用
    animate() {
      requestAnimationFrame(this.animate);
      // 更新control状态
      controls.update();
      // 每帧渲染
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    },
  },

  beforeDestroy() {
    // 取消每帧调用
    cancelAnimationFrame(this.animate);
    // 移除resize监听
    window.removeEventListener("resize", this.onWindowResize);
    // 移除mouseDown监听
    window.removeEventListener("mousedown", this.onMouseDown);
  },
};
</script>

<style scoped>
#three {
  width: 100%;
  height: 100%;
  position: fixed;
  left: 0;
  top: 0;
}

#progress {
  width: 40%;
  height: 2rem;
  position: fixed;
  left: 30%;
  top: 47%;
}

#textDiv {
  position: fixed;
  width: 100%;
  height: 40px;
  line-height: 40px;
  text-align: center;
  top: 46%;
}

#div3d {
  width: 100vh;
  height: 100vw;
}
</style>
