import { useState, useEffect, useRef } from "react";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
// import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
// function loadGLTFModel(scene, glbPath, options) {
//   const { receiveShadow, castShadow } = options;
//   return new Promise((resolve, reject) => {
//     const loader = new GLTFLoader();
//     loader.load(
//       glbPath,
//       (gltf) => {
//         const obj = gltf.scene;
//         obj.name = "dinosaur";
//         obj.position.y = 0;
//         obj.position.x = 0;
//         obj.receiveShadow = receiveShadow;
//         obj.castShadow = castShadow;
//         scene.add(obj);

//         obj.traverse(function (child) {
//           if (child.isMesh) {
//             child.castShadow = castShadow;
//             child.receiveShadow = receiveShadow;
//           }
//         });

//         resolve(obj);
//       },
//       undefined,
//       function (error) {
//         console.log(error);
//         reject(error);
//       }
//     );
//   });
// }
function loadFBXModel(scene, glbPath, options) {
  const { receiveShadow, castShadow } = options;
  return new Promise((resolve, reject) => {
    const loader = new FBXLoader();
    loader.load(
      glbPath,
      (obj) => {
        obj.name = "dinosaur";
        obj.position.y = 0;
        obj.position.x = 0;
        obj.receiveShadow = receiveShadow;
        obj.castShadow = castShadow;
        scene.add(obj);

        obj.traverse(function (child) {
          if (child.isMesh) {
            child.castShadow = castShadow;
            child.receiveShadow = receiveShadow;
          }
        });

        resolve(obj);
      },
      undefined,
      function (error) {
        console.log(error);
        reject(error);
      }
    );
  });
}

const Dinosaur = () => {
  const refContainer = useRef();
  const [loading, setLoading] = useState(true);
  const [renderer, setRenderer] = useState();

  useEffect(() => {
    const { current: container } = refContainer;
    if (refContainer && !renderer) {
      console.log('aaa');
      console.log('bb');
      const scW = container.clientWidth;
      const scH = container.clientHeight;
      const threeRenderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
      });
      threeRenderer.setPixelRatio(window.devicePixelRatio);
      threeRenderer.setSize(scW, scH);
      threeRenderer.outputEncoding = THREE.sRGBEncoding;
      threeRenderer.shadowMap.enabled = true;
      container.appendChild(threeRenderer.domElement);
      setRenderer(threeRenderer);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        45, window.innerWidth / window.innerHeight, 1, 20000
      );
      camera.position.set( 0, 500, 3000 );
      const target = new THREE.Vector3(0, 200, 0);

      const ambientLight = new THREE.AmbientLight(0xcccccc, 1);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight( 0xffffff );
			dirLight.position.set( 0, 200, 100 );
			dirLight.castShadow = true;
			dirLight.shadow.camera.top = 1800;
			dirLight.shadow.camera.bottom = - 1000;
			dirLight.shadow.camera.left = - 1200;
			dirLight.shadow.camera.right = 1200;
			scene.add( dirLight );

      const controls = new OrbitControls(camera, threeRenderer.domElement);
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.5;
      controls.target = target;

      const mesh = new THREE.Mesh( new THREE.PlaneGeometry( 2000, 2000 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
			mesh.rotation.x = - Math.PI / 2;
			mesh.receiveShadow = true;
			scene.add( mesh );

      loadFBXModel(scene, "http://rhkbqy9os.hn-bkt.clouddn.com/dianshi.fbx?e=1662428564&token=OkXHJZMiNUEjV5wqnHmy73EoxxBwOWPqA6co-0Qv:M_CvOTJQ8O6SF7LgcB297N8IXX8=", {
        receiveShadow: false,
        castShadow: true
      }).then(() => {
        animate();
        setLoading(false);
      });

      let req = null;
      const animate = () => {
        req = requestAnimationFrame(animate);
        controls.update();
        threeRenderer.render(scene, camera);
      };

      window.addEventListener( 'resize', ()=>{
        camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();
				threeRenderer.setSize( window.innerWidth, window.innerHeight );
      } );

      return () => {
        cancelAnimationFrame(req);
        threeRenderer.dispose();
      };
    }
  }, [renderer]);

  return (
    <div
      style={{ height: '100%', width: '100%', position: "absolute" }}
      ref={refContainer}
    >
      {loading && (
        <span style={{ position: "absolute", left: "50%", top: "50%" }}>
          Loading...
        </span>
      )}
    </div>
  );
};

export default function App() {
  return (
    <div style={{ height: "100%" , width: "100%" }}>
      <Dinosaur />
    </div>
  );
}
