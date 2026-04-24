import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Icosahedron, Torus, Environment, Float } from '@react-three/drei';
import * as THREE from 'three';
import { ProtocolState } from '../types';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      points: any;
      bufferGeometry: any;
      bufferAttribute: any;
      pointsMaterial: any;
      fog: any;
      ambientLight: any;
      pointLight: any;
      spotLight: any;
    }
  }
}

interface SceneProps {
  state: ProtocolState;
}

const CoreMesh: React.FC<{ state: ProtocolState }> = ({ state }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  // Animation parameters derived from state
  const params = useMemo(() => {
    switch (state) {
      case ProtocolState.ACTIVE:
        return { speed: 0.3, distort: 0.2, color: '#e7e5e4', emissive: '#000000' };
      case ProtocolState.WARNING:
        return { speed: 1.5, distort: 0.6, color: '#f59e0b', emissive: '#451a03' };
      case ProtocolState.PENDING:
        return { speed: 0.1, distort: 0.1, color: '#d6d3d1', emissive: '#000000' };
      case ProtocolState.EXECUTING:
        return { speed: 2.0, distort: 0.8, color: '#6366f1', emissive: '#1e1b4b' };
      case ProtocolState.COMPLETED:
        return { speed: 0, distort: 0, color: '#10b981', emissive: '#064e3b' };
      default:
        return { speed: 0.5, distort: 0.2, color: '#ffffff', emissive: '#000000' };
    }
  }, [state]);

  const currentSpeed = useRef(params.speed);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    currentSpeed.current = THREE.MathUtils.lerp(currentSpeed.current, params.speed, 0.05);

    // Rotation
    meshRef.current.rotation.x += delta * currentSpeed.current * 0.2;
    meshRef.current.rotation.y += delta * currentSpeed.current * 0.3;
    
    // Breathing scale
    const t = state.clock.getElapsedTime();
    const breathing = Math.sin(t * 0.5) * 0.05 + 1;
    meshRef.current.scale.setScalar(breathing);

    // Update material color smoothly
    if (materialRef.current) {
        materialRef.current.color.lerp(new THREE.Color(params.color), 0.02);
        materialRef.current.emissive.lerp(new THREE.Color(params.emissive), 0.02);
    }
  });

  return (
    <group>
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <Icosahedron ref={meshRef} args={[1.5, 1]} castShadow receiveShadow>
                <meshStandardMaterial
                    ref={materialRef}
                    wireframe={true}
                    transparent
                    opacity={0.3}
                    roughness={0.2}
                    metalness={0.8}
                />
            </Icosahedron>
             {/* Inner Solid Core */}
            <Icosahedron args={[1, 0]}>
                <meshStandardMaterial
                    color={params.color}
                    transparent
                    opacity={0.1}
                    roughness={0.5}
                />
            </Icosahedron>
        </Float>
        
        {/* Orbital Rings */}
        <group rotation={[Math.PI / 3, 0, 0]}>
             <Torus args={[2.5, 0.02, 16, 100]} rotation={[0,0,0]}>
                 <meshBasicMaterial color="#ffffff" transparent opacity={0.05} />
             </Torus>
        </group>
         <group rotation={[-Math.PI / 4, Math.PI/4, 0]}>
             <Torus args={[3, 0.01, 16, 100]}>
                 <meshBasicMaterial color="#ffffff" transparent opacity={0.03} />
             </Torus>
        </group>
    </group>
  );
};

const Particles: React.FC<{ state: ProtocolState }> = ({ state }) => {
    const count = 300;
    const mesh = useRef<THREE.Points>(null);
    
    const [positions] = useState(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 25; // x
            pos[i * 3 + 1] = (Math.random() - 0.5) * 25; // y
            pos[i * 3 + 2] = (Math.random() - 0.5) * 25 - 5; // z
        }
        return pos;
    });

    const targetColor = useMemo(() => {
        switch (state) {
            case ProtocolState.WARNING: return new THREE.Color('#f59e0b');
            case ProtocolState.EXECUTING: return new THREE.Color('#6366f1');
            case ProtocolState.COMPLETED: return new THREE.Color('#10b981');
            default: return new THREE.Color('#a8a29e');
        }
    }, [state]);

    useFrame((state, delta) => {
        if (!mesh.current) return;
        mesh.current.rotation.y += delta * 0.02;
        mesh.current.rotation.x += delta * 0.01;
        
        // Dynamic material update
        const mat = mesh.current.material as THREE.PointsMaterial;
        mat.color.lerp(targetColor, 0.02);
        
        // Pulse size slightly
        const time = state.clock.getElapsedTime();
        mat.size = 0.05 + Math.sin(time) * 0.01;
    });

    return (
        <points ref={mesh}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.05}
                color="#a8a29e"
                transparent
                opacity={0.6}
                sizeAttenuation
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};

const AmbientEnvironment: React.FC<{ state: ProtocolState }> = ({ state }) => {
    const spotLightRef = useRef<THREE.SpotLight>(null);
    
    useFrame((_, delta) => {
        if (!spotLightRef.current) return;

        // Subtle ambient light drift
        const time = Date.now() * 0.0005;
        spotLightRef.current.position.x = Math.sin(time) * 2 - 5;
        
        // Intensity response to state
        let targetIntensity = 1;
        let targetAngle = 0.5;

        if (state === ProtocolState.WARNING) {
            targetIntensity = 2 + Math.sin(time * 10) * 0.5; // Pulse
            targetAngle = 0.3; // Tighten
        } else if (state === ProtocolState.EXECUTING) {
            targetIntensity = 1.5;
            targetAngle = 0.8; // Widen
        }

        spotLightRef.current.intensity = THREE.MathUtils.lerp(spotLightRef.current.intensity, targetIntensity, 0.05);
        spotLightRef.current.angle = THREE.MathUtils.lerp(spotLightRef.current.angle, targetAngle, 0.05);
    });

    return (
        <>
             <fog attach="fog" args={['#0c0a09', 5, state === ProtocolState.WARNING ? 12 : 18]} />
             <ambientLight intensity={0.5} />
             <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
             <spotLight 
                ref={spotLightRef}
                position={[-5, 5, 5]} 
                angle={0.5} 
                penumbra={1} 
                intensity={1} 
                castShadow 
            />
        </>
    );
}

const TemporalScene: React.FC<SceneProps> = ({ state }) => {
  return (
    <div className="canvas-container">
      <Canvas shadows camera={{ position: [0, 0, 6], fov: 45 }}>
        <AmbientEnvironment state={state} />
        <CoreMesh state={state} />
        <Particles state={state} />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
};

export default TemporalScene;