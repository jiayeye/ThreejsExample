<template>
  <div>
    <text id="errorText">加载失败，请检查资源</text>
    <canvas id="three"></canvas>
    <progress id="progress" value="0" max="100"></progress>
  </div>
</template>

<script>
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export default {
  props: ["modelUrl"],
  // data() {
  //     return {
  //         data: "默认值"
  //     };
  // },

  mounted() {
    console.log(this.modelUrl);
    this.initThree(this.modelUrl);
  },
  methods: {
    initThree(modelUrl) {
      let camera, scene, renderer, controls, cameraMaxDistance, labelRenderer;

      init();
      animate();

      function init() {
        // 设置初始化状态
        const errorText = document.getElementById("errorText");
        errorText.hidden = true;
        const canvas = document.querySelector("#three");
        canvas.hidden = true;
        cameraMaxDistance = 20000;
        camera = new THREE.PerspectiveCamera(
          45,
          window.innerWidth / window.innerHeight,
          1,
          cameraMaxDistance
        );
        camera.position.set(0, 500, 3000);

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
        hemiLight.position.set(0, 200, 0);
        scene.add(hemiLight);

        // 设置直射光
        const dirLight = new THREE.DirectionalLight(0xffffff);
        dirLight.castShadow = true;
        console.log(dirLight.shadow.camera);

        // ground
        const ground = new THREE.Mesh(
          new THREE.PlaneGeometry(10000, 10000),
          new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;

        labelRenderer = new CSS2DRenderer();
		labelRenderer.setSize( window.innerWidth, window.innerHeight );
		labelRenderer.domElement.style.position = 'absolute';
		labelRenderer.domElement.style.top = '0px';
		document.body.appendChild( labelRenderer.domElement );

        controls = new OrbitControls(camera, labelRenderer.domElement);
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.5;
        controls.target.set(0, 0, 0);

        const manager = new THREE.LoadingManager();
        var progress = document.getElementById("progress");

        function onProgress(xhr) {
          if (xhr.lengthComputable) {
            const percentComplete = (xhr.loaded / xhr.total) * 100;
            progress.value = Math.round(percentComplete, 2);
            console.log(
              "model " + Math.round(percentComplete, 2) + "% downloaded"
            );
          }
        }

        function onError(error) {
          console.log(error.message);
          progress.hidden = true;
          canvas.hidden = true;
          errorText.hidden = false;
        }

        // model
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
            // 设置相机投影范围
            const dirLightY = maxValue * 1.2;
            const dirLightZ = maxValue * 0.6;
            dirLight.position.set(0, dirLightY, dirLightZ);
            dirLight.castShadow = true;
            dirLight.shadow.camera.top = dirLightY;
            dirLight.shadow.camera.bottom = -dirLightY;
            dirLight.shadow.camera.left = -dirLightY;
            dirLight.shadow.camera.right = dirLightY;
            dirLight.shadow.camera.near = 1;
            dirLight.shadow.camera.far = dirLightY * 2;
            scene.add(dirLight);
            // 显示投影框
            // scene.add( new THREE.CameraHelper( dirLight.shadow.camera ) );

            scene.add(object);
            console.log("load success");
            // 隐藏进度条
            progress.hidden = true;
            // 显示canvas
            canvas.hidden = false;


            const moonMassDiv = document.createElement( 'div' );
            moonMassDiv.id = "css2d";
			moonMassDiv.textContent = "7.342mm";
            moonMassDiv.style.fontWeight = "600";
            moonMassDiv.style.fontSize = "16px";
            moonMassDiv.style.padding= "0px 10px";
            moonMassDiv.style.backgroundColor = "white";
            moonMassDiv.style.opacity = '0.7';
            moonMassDiv.style.borderRadius = "15px";
			const moonMassLabel = new CSS2DObject( moonMassDiv );
			moonMassLabel.position.set( 0, 0, 0 );
			object.add( moonMassLabel );


            //create a blue LineBasicMaterial
            const material = new THREE.LineBasicMaterial( { color: 0x0000ff } );
            const rightDownPoint = new THREE.Vector3( bbox.max.x, bbox.max.y, bbox.max.z);
            const leftDownPoint = new THREE.Vector3( -bbox.max.x, bbox.max.y, bbox.max.z)

            const points = [rightDownPoint, leftDownPoint];
            const geometry = new THREE.BufferGeometry().setFromPoints( points );

            const line = new THREE.Line( geometry, material );
            scene.add( line );


          },
          onProgress,
          onError
        );
        
        // 监听鼠标点击事件
        window.addEventListener('mousedown', () => { controls.autoRotate = false; },true);
        window.addEventListener("resize", onWindowResize);
      }
      function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        labelRenderer.setSize(window.innerWidth, window.innerHeight);
      }
      function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
        labelRenderer.render( scene, camera );
      }
    },
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
