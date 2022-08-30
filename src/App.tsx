import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, useFBX } from '@react-three/drei';
import Model from './Avatar';

const Scene = () => {
  const fbx = useFBX("model.fbx");

  return <primitive object={fbx} scale={0.1}  rotation = {[-Math.PI / 2, 0, 0]} position = {[0.0, -1, 0]}/>;
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
          <Scene />
          <Model position = {[1.225, -0.9, 0]} />
          <Environment preset="sunset" background />
      </Suspense>
      <OrbitControls />
    </Canvas>
  );
}