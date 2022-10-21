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
import { OutlineEffect } from "three/examples/jsm/effects/OutlineEffect";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera,
  scene,
  renderer,
  controls,
  effect,
  model,
  wireLineModeColor,
  wireLinColor,
  ground;
const option = {
  mode: "material",
};

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
      const cameraMaxDistance = 12000;
      // 线框模式时object颜色
      wireLineModeColor = new THREE.Color(1, 1, 1);
      // 线框颜色
      // wireLinColor = [1.0, 0.6, 0];
      wireLinColor = [0, 0, 0];

      // 设置初始化状态
      this.$refs.threeCanvas.hidden = true;

      // 添加透视相机，设置fov、初始位置
      camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        30,
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
      ground = new THREE.Mesh(
        new THREE.PlaneGeometry(10000, 10000),
        new THREE.MeshPhongMaterial({ color: 0xaaaaaa, depthWrite: false })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      // 添加WebGLRenderer，设置size,设置更精确的深度缓冲
      renderer = new THREE.WebGLRenderer({
        canvas: this.$refs.threeCanvas,
        antialias: true,
        // logarithmicDepthBuffer: true,
      });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;

      // 创建线框效果
      effect = new OutlineEffect(renderer, {
        defaultThickness: 0.003,
        defaultColor: wireLinColor,
      });
      // 是否开启
      effect.enabled = false;

      const gui = new GUI();
      gui
        .add(option, "mode")
        .options(["material", "wireFrame", "materialAndWireFrame"])
        .onChange(this.onGUIChange);

      // 添加相机控制器
      controls = new OrbitControls(camera, renderer.domElement);
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.5;
      controls.enablePan = false;
      controls.target.set(0, 0, 0);

      // 加载进度manager
      const manager = new THREE.LoadingManager();
      const loader = new FBXLoader(manager);
      loader.load(
        modelUrl,
        (object) => {
          // 记录object
          model = object;
          // 递归遍历所有child节点
          object.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = false;
              // 线框模式颜色
              if (child.material instanceof Array) {
                // 对于有多个材质的物体遍历
                child.material.forEach((mat) => {
                  // 缓存颜色
                  mat.colorCache = mat.color;
                  mat.specularCache = mat.specular;
                  mat.emissiveCache = mat.emissive;
                  // 缓存顶点色
                  mat.vertexColorsCache = mat.vertexColors;
                  // 缓存贴图
                  mat.mapCache = mat.map;
                });
              } else {
                // 如果存在贴图，先缓存
                child.material.mapCache = child.material.map;
                // 缓存颜色以便恢复
                child.material.colorCache = child.material.color;
                child.material.specularCache = child.material.specular;
                child.material.emissiveCache = child.material.emissive;
                // 缓存顶点色
                child.material.vertexColorsCache = child.material.vertexColors;
              }
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

    onGUIChange() {
      model.traverse((child) => {
        if (child.isMesh) {
          // 线框模式颜色
          if (child.material instanceof Array) {
            // 对于有多个材质的物体遍历
            child.material.forEach((mat) => {
              // needsUpdate为true时更改材质参数才生效
              mat.needsUpdate = true;
              if (option.mode === "material") {
                // 关闭线框
                effect.enabled = false;
                // 设置缓存颜色
                mat.color = mat.colorCache;
                mat.specular = mat.specularCache;
                mat.emissive = mat.emissiveCache;
                mat.vertexColors = mat.vertexColorsCache;
                // 如果存在贴图
                mat.map = mat.mapCache;
              } else if (option.mode === "wireFrame") {
                // 开启线框
                effect.enabled = true;
                // 设置颜色
                mat.color = wireLineModeColor;
                mat.specular = wireLineModeColor;
                mat.emissive = wireLineModeColor;
                mat.vertexColors = false;
                // 设置贴图
                mat.map = null;
              } else if (option.mode === "materialAndWireFrame") {
                // 开启线框
                effect.enabled = true;
                // 设置颜色
                mat.color = mat.colorCache;
                mat.specular = mat.specularCache;
                mat.emissive = mat.emissiveCache;
                mat.vertexColors = mat.vertexColorsCache;
                // 如果存在贴图
                mat.map = mat.mapCache;
              }
            });
          } else {
            // needsUpdate为true时更改材质参数才生效
            child.material.needsUpdate = true;
            if (option.mode === "material") {
              // 开启线框
              effect.enabled = false;
              // 设置缓存map
              child.material.map = child.material.mapCache;
              // 设置颜色
              child.material.color = child.material.colorCache;
              child.material.specular = child.material.specularCache;
              child.material.emissive = child.material.emissiveCache;
              // 消除顶点色
              child.material.vertexColors = child.material.vertexColorsCache;
            } else if (option.mode === "wireFrame") {
              // 开启线框
              effect.enabled = true;
              // 设置map为null
              child.material.map = null;

              // 设置颜色
              child.material.color = wireLineModeColor;
              child.material.specular = wireLineModeColor;
              child.material.emissive = wireLineModeColor;
              // 消除顶点色
              child.material.vertexColors = false;
            } else if (option.mode === "materialAndWireFrame") {
              // 开启线框
              effect.enabled = true;
              // 设置缓存map
              child.material.map = child.material.mapCache;

              // 设置颜色
              child.material.color = child.material.colorCache;
              child.material.specular = child.material.specularCache;
              child.material.emissive = child.material.emissiveCache;
              // 消除顶点色
              child.material.vertexColors = child.material.vertexColorsCache;
            }
          }
        }
      });
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

      // hack:相机看到ground反面出现outline bug
      if (camera.position.y < ground.position.z) {
        ground.visible = false;
      } else {
        ground.visible = true;
      }

      // 每帧渲染
      effect.render(scene, camera);
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
