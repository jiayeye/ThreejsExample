<template>
  <div>
    <text id="errorText" ref="errorText">加载失败，请检查资源</text>
    <canvas id="threeCanvas" ref="threeCanvas"></canvas>
    <progress id="progress" ref="progress" value="0" max="100"></progress>
  </div>
</template>

<script>
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";

let camera, scene, renderer, controls, cameraMaxDistance;

export default {
  props: {
    modelUrl: {
      type: String,
      required: true,
    },
  },

  mounted() {
    this.initScene(this.modelUrl);
  },
  methods: {
    initScene(modelUrl) {
      // 相机far
      cameraMaxDistance = 20000;

      // 设置初始化状态
      const errorText = this.$refs.errorText;
      errorText.hidden = true;
      const canvas = this.$refs.threeCanvas;
      canvas.hidden = true;

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
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;

      // 添加相机控制器
      controls = new OrbitControls(camera, renderer.domElement);
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.5;
      controls.target.set(0, 0, 0);

      var progress = this.$refs.progress;

      // 加载进度
      function onProgress(xhr) {
        if (xhr.lengthComputable) {
          const percentComplete = (xhr.loaded / xhr.total) * 100;
          progress.value = Math.round(percentComplete, 2);
          // console.log("model " + Math.round(percentComplete, 2) + "% downloaded");
        }
      }

      // 加载失败回掉
      function onError(error) {
        //   console.log(error.message);
        progress.hidden = true;
        canvas.hidden = true;
        errorText.hidden = false;
      }

      // 加载进度manager
      const manager = new THREE.LoadingManager();
      const loader = new FBXLoader(manager);
      loader.load(
        modelUrl,
        function (object) {
          object.traverse(function (child) {
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
          // 隐藏进度条
          progress.hidden = true;
          // 显示canvas
          canvas.hidden = false;
        },
        onProgress,
        onError
      );

      // 监听窗口reszie事件
      window.addEventListener("resize", this.onWindowResize);
      // 设置tick
      this.animate();
    },
    // 重置窗口大小
    onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      // 更新相机投影矩阵
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
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
  top: 50%;
}

#errorText {
  width: 50%;
  height: 2rem;
  position: fixed;
  left: 40%;
  top: 50%;
}
</style>
