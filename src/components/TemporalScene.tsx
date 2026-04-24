import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ProtocolState } from '../types';

// --------------------------------------------------------------------------
// Star Field
// --------------------------------------------------------------------------

function StarField({ count = 12000 }: { count?: number }) {
  const meshRef = useRef<THREE.Points>(null);

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 400;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 400;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
    sizes[i] = Math.random() * 2.5 + 0.5;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 0.8,
    sizeAttenuation: true,
    color: new THREE.Color('#f0c040'),
    transparent: true,
    opacity: 0.6,
    fog: false,
  });

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.008;
      meshRef.current.rotation.x = clock.getElapsedTime() * 0.003;
    }
  });

  return <points ref={meshRef} geometry={geometry} material={material} />;
}

// --------------------------------------------------------------------------
// Hourglass Wireframe
// --------------------------------------------------------------------------

function HourglassWireframe({ state }: { state: ProtocolState }) {
  const groupRef = useRef<THREE.Group>(null);

  const color = {
    [ProtocolState.ACTIVE]:    '#2dd4bf',
    [ProtocolState.WARNING]:   '#f0c040',
    [ProtocolState.PENDING]:   '#f97316',
    [ProtocolState.EXECUTING]: '#a78bfa',
    [ProtocolState.COMPLETED]: '#2dd4bf',
  }[state];

  const material = new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.45,
    linewidth: 1,
  });

  // Build hourglass from two cones
  const topGeo = new THREE.ConeGeometry(2, 3, 8, 1, true);
  const botGeo = new THREE.ConeGeometry(2, 3, 8, 1, true);
  const topEdges = new THREE.EdgesGeometry(topGeo);
  const botEdges = new THREE.EdgesGeometry(botGeo);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.3;
      groupRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.2) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, -8]}>
      <lineSegments geometry={topEdges} material={material} position={[0, 1.5, 0]} rotation={[0, 0, Math.PI]} />
      <lineSegments geometry={botEdges} material={material} position={[0, -1.5, 0]} />

      {/* Orbit ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4, 0.02, 4, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

// --------------------------------------------------------------------------
// Camera drift
// --------------------------------------------------------------------------

function CameraDrift() {
  const { camera } = useThree();
  useFrame(({ clock }) => {
    camera.position.x = Math.sin(clock.getElapsedTime() * 0.05) * 0.5;
    camera.position.y = Math.cos(clock.getElapsedTime() * 0.04) * 0.3;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// --------------------------------------------------------------------------
// Scene
// --------------------------------------------------------------------------

export default function TemporalScene({ state }: { state: ProtocolState }) {
  return (
    <div className="canvas-layer">
      <Canvas
        camera={{ position: [0, 0, 12], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
        dpr={Math.min(window.devicePixelRatio, 2)}
      >
        <CameraDrift />
        <StarField count={10000} />
        <HourglassWireframe state={state} />
      </Canvas>
    </div>
  );
}
