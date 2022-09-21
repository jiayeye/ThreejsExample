<template>
  <div>
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

let camera, scene, renderer, controls;

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
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x000000);
      hemiLight.position.set(0, 2000, 0);
      scene.add(hemiLight);

      // 设置直射光
      const dirLight = new THREE.DirectionalLight(0xdddddd);
      dirLight.castShadow = true;

      // 添加ground
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(10000, 10000),
        new THREE.MeshPhongMaterial({ color: 0xaaaaaa, depthWrite: false })
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

      // 添加相机控制器
      controls = new OrbitControls(camera, renderer.domElement);
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
          const dirLightZ = maxValue * 0.8;
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
          dirLight.intensity = 0.6;
          scene.add(dirLight);

          // 设置背面直射光照
          const dirLightBack = new THREE.DirectionalLight(0x999999);
          dirLightBack.position.set(0, dirLightY, -dirLightZ);
          dirLightBack.intensity = 0.15;
          scene.add(dirLightBack);
          // 显示投影框
          // scene.add( new THREE.CameraHelper( dirLight.shadow.camera ) );

          // 添加object到场景里
          scene.add(object);
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
</style>
