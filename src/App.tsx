import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Html, OrbitControls, useFBX } from '@react-three/drei';
import Model from './Avatar';

const Scene = () => {
  // const man = useFBX("http://rhkbqy9os.hn-bkt.clouddn.com/fbx/man.fbx?e=1662089314&token=OkXHJZMiNUEjV5wqnHmy73EoxxBwOWPqA6co-0Qv:V8wW1rs97cLRKq31yUs1udlE6aI=");
  const dianshi = useFBX("http://rhkbqy9os.hn-bkt.clouddn.com/dianshi.fbx?e=1662361411&token=OkXHJZMiNUEjV5wqnHmy73EoxxBwOWPqA6co-0Qv:qWAtK99_dnHebPBVS0NhzvHQ1ro=");
  // const xiyiji = useFBX("http://rhkbqy9os.hn-bkt.clouddn.com/xiyiji.FBX?e=1662364872&token=OkXHJZMiNUEjV5wqnHmy73EoxxBwOWPqA6co-0Qv:b4RCTXe68s-BM2ud61oRlJ_RzzE=");
  return (<primitive object={dianshi} scale={0.001} position = {[0.0, 0, 0]} >

    <Html className = 'content'>
      <div >
          hello <br />
          world
        </div>
      </Html>
    </primitive>);
};

export default function App() {
  return (
    <Canvas 
      camera = {{position: [2,0,12.25], fov: 15}}
      style = {{
        background: '#111a21',
        width: '100vw',
        height: '100vh'
      }}
    >
      <ambientLight intensity = { 0.4}/>
      <directionalLight intensity={0.4} position = {[0.0, 1, 1]}/>
      <Suspense fallback={null}>
          <Scene/>
          <Model position = {[1.225, -0.9, 0]} />
          <Environment preset="sunset" background />
      </Suspense>
      <OrbitControls />
    </Canvas>
  );
}