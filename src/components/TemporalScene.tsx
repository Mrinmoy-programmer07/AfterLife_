import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ProtocolState } from '../types';

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function ringPoints(radius: number, segs = 128): THREE.Vector3[] {
  return Array.from({ length: segs + 1 }, (_, i) => {
    const a = (i / segs) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0);
  });
}

// --------------------------------------------------------------------------
// Star Field
// --------------------------------------------------------------------------

function StarField({ count = 8000 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const geo = useMemo(() => {
    const g   = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 500;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 500;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 400;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);

  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime();
      ref.current.rotation.y = t * 0.006;
      ref.current.rotation.x = t * 0.002;
    }
  });

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.7} sizeAttenuation color="#f0c040" transparent opacity={0.5} fog={false} />
    </points>
  );
}

// --------------------------------------------------------------------------
// Cosmic Clock — drawn with primitives to avoid SVG <line> conflict
// --------------------------------------------------------------------------

function CosmicClock({ state }: { state: ProtocolState }) {
  const rootRef   = useRef<THREE.Group>(null);
  const hourRef   = useRef<THREE.Group>(null);
  const minuteRef = useRef<THREE.Group>(null);
  const secondRef = useRef<THREE.Group>(null);

  const color = {
    [ProtocolState.ACTIVE]:    '#2dd4bf',
    [ProtocolState.WARNING]:   '#f0c040',
    [ProtocolState.PENDING]:   '#f97316',
    [ProtocolState.EXECUTING]: '#c9484c',
    [ProtocolState.COMPLETED]: '#2dd4bf',
  }[state];

  const col = new THREE.Color(color);
  const red = new THREE.Color('#c9484c');

  // Build all line primitives once
  const {
    outerLine, innerLine, midLine,
    minorTicks, majorTicks,
    hourPrim, minutePrim, secondPrim, counterweight,
  } = useMemo(() => {
    const lm = (c: THREE.Color, op: number) =>
      new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: op });

    // Clock rings
    const outerLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(ringPoints(8.5, 160)), lm(col, 0.55));
    const innerLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(ringPoints(7.8, 128)), lm(col, 0.22));
    const midLine   = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(ringPoints(4.3, 80)),  lm(col, 0.18));

    // 60 ticks
    const minorTicks: THREE.Line[] = [];
    const majorTicks: THREE.Line[] = [];
    for (let i = 0; i < 60; i++) {
      const ang    = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const isMaj  = i % 5 === 0;
      const inR    = isMaj ? 7.3 : 7.8;
      const pts    = [
        new THREE.Vector3(Math.cos(ang) * inR,  Math.sin(ang) * inR,  0),
        new THREE.Vector3(Math.cos(ang) * 8.5,  Math.sin(ang) * 8.5,  0),
      ];
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        lm(col, isMaj ? 0.9 : 0.35));
      if (isMaj) majorTicks.push(l); else minorTicks.push(l);
    }

    // Hour hand pivot geometry: tip along +Y
    const hourGeo   = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -0.4, 0), new THREE.Vector3(0, 4.5, 0)]);
    const minuteGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -0.6, 0), new THREE.Vector3(0, 6.8, 0)]);
    const secondGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -1.4, 0), new THREE.Vector3(0, 7.5, 0)]);
    const cwGeo     = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -1.4, 0), new THREE.Vector3(0, -0.4, 0)]);

    const hourPrim    = new THREE.Line(hourGeo,   lm(col, 1.0));
    const minutePrim  = new THREE.Line(minuteGeo, lm(col, 0.9));
    const secondPrim  = new THREE.Line(secondGeo, lm(red, 1.0));
    const counterweight = new THREE.Line(cwGeo,   lm(red, 1.0));

    return { outerLine, innerLine, midLine, minorTicks, majorTicks, hourPrim, minutePrim, secondPrim, counterweight };
  }, [color]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (rootRef.current) {
      rootRef.current.position.y = Math.sin(t * 0.17) * 0.3;
      rootRef.current.rotation.z = Math.sin(t * 0.06) * 0.012;
    }

    // Real-time hands
    const now = new Date();
    const ms  = now.getMilliseconds() / 1000;
    const sec = now.getSeconds() + ms;
    const min = now.getMinutes() + sec / 60;
    const hr  = (now.getHours() % 12) + min / 60;

    if (secondRef.current) secondRef.current.rotation.z = -(sec / 60) * Math.PI * 2;
    if (minuteRef.current) minuteRef.current.rotation.z = -(min / 60) * Math.PI * 2;
    if (hourRef.current)   hourRef.current.rotation.z   = -(hr  / 12) * Math.PI * 2;

    // Pulse inner ring opacity
    (innerLine.material as THREE.LineBasicMaterial).opacity = 0.15 + Math.sin(t * 2.4) * 0.08;
  });

  // 12 o'clock marker dot positions
  const clockDots = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const r = 7.1;
    return [Math.cos(a) * r, Math.sin(a) * r] as [number, number];
  });

  return (
    <group ref={rootRef} position={[0, 0, -12]}>

      {/* Background glow */}
      <mesh>
        <circleGeometry args={[10, 80]} />
        <meshBasicMaterial color={color} transparent opacity={0.05} />
      </mesh>

      {/* Ring primitives */}
      <primitive object={outerLine} />
      <primitive object={innerLine} />
      <primitive object={midLine} />

      {/* Ticks */}
      {minorTicks.map((l, i) => <primitive key={`mt${i}`} object={l} />)}
      {majorTicks.map((l, i) => <primitive key={`mj${i}`} object={l} />)}

      {/* Hour dot markers */}
      {clockDots.map(([x, y], i) => (
        <mesh key={`dot${i}`} position={[x, y, 0]}>
          <circleGeometry args={[i === 0 ? 0.18 : 0.09, 12]} />
          <meshBasicMaterial color={color} transparent opacity={i === 0 ? 1 : 0.7} />
        </mesh>
      ))}

      {/* Hour hand */}
      <group ref={hourRef}>
        <primitive object={hourPrim} />
        <mesh position={[0, 4.5, 0]}>
          <coneGeometry args={[0.13, 0.42, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0.85} />
        </mesh>
      </group>

      {/* Minute hand */}
      <group ref={minuteRef}>
        <primitive object={minutePrim} />
        <mesh position={[0, 6.8, 0]}>
          <coneGeometry args={[0.085, 0.36, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0.65} />
        </mesh>
      </group>

      {/* Second hand */}
      <group ref={secondRef}>
        <primitive object={secondPrim} />
        <primitive object={counterweight} />
        <mesh position={[0, 7.5, 0]}>
          <coneGeometry args={[0.055, 0.28, 5]} />
          <meshBasicMaterial color="#c9484c" transparent opacity={0.85} />
        </mesh>
        {/* Red circle weight */}
        <mesh position={[0, -1.0, 0]}>
          <circleGeometry args={[0.14, 10]} />
          <meshBasicMaterial color="#c9484c" transparent opacity={0.75} />
        </mesh>
      </group>

      {/* Centre hub — outer */}
      <mesh>
        <circleGeometry args={[0.24, 20]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
      {/* Centre — inner void */}
      <mesh position={[0, 0, 0.01]}>
        <circleGeometry args={[0.1, 16]} />
        <meshBasicMaterial color="#050508" />
      </mesh>
    </group>
  );
}

// --------------------------------------------------------------------------
// Orbiting particles around the clock rim
// --------------------------------------------------------------------------

function OrbitalParticles({ state }: { state: ProtocolState }) {
  const groupRef = useRef<THREE.Group>(null);

  const color = {
    [ProtocolState.ACTIVE]:    '#2dd4bf',
    [ProtocolState.WARNING]:   '#f0c040',
    [ProtocolState.PENDING]:   '#f97316',
    [ProtocolState.EXECUTING]: '#c9484c',
    [ProtocolState.COMPLETED]: '#2dd4bf',
  }[state];

  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      angle:  (i / 20) * Math.PI * 2,
      radius: 9.5 + (Math.random() - 0.5) * 1.8,
      speed:  0.07 + Math.random() * 0.07,
      size:   0.04 + Math.random() * 0.07,
      phase:  Math.random() * Math.PI * 2,
      z:      -11.5 + (Math.random() - 0.5) * 0.6,
    })), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      if (i >= particles.length) return;
      const p = particles[i];
      const a = p.angle + t * p.speed;
      child.position.set(Math.cos(a) * p.radius, Math.sin(a) * p.radius, p.z);
      const s = 0.6 + Math.sin(t * 1.8 + p.phase) * 0.4;
      child.scale.setScalar(Math.max(0.1, s));
    });
  });

  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <mesh key={i}>
          <circleGeometry args={[p.size, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  );
}

// --------------------------------------------------------------------------
// Hourglass wireframe (centre foreground)
// --------------------------------------------------------------------------

function HourglassWireframe({ state }: { state: ProtocolState }) {
  const groupRef = useRef<THREE.Group>(null);

  const color = {
    [ProtocolState.ACTIVE]:    '#2dd4bf',
    [ProtocolState.WARNING]:   '#f0c040',
    [ProtocolState.PENDING]:   '#f97316',
    [ProtocolState.EXECUTING]: '#c9484c',
    [ProtocolState.COMPLETED]: '#2dd4bf',
  }[state];

  const { topEdges, botEdges } = useMemo(() => ({
    topEdges: new THREE.EdgesGeometry(new THREE.ConeGeometry(1.5, 2.4, 8, 1, true)),
    botEdges: new THREE.EdgesGeometry(new THREE.ConeGeometry(1.5, 2.4, 8, 1, true)),
  }), []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.rotation.y = t * 0.22;
      groupRef.current.rotation.z = Math.sin(t * 0.14) * 0.055;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, -2]}>
      <lineSegments geometry={topEdges} position={[0, 1.2, 0]} rotation={[0, 0, Math.PI]}>
        <lineBasicMaterial color={color} transparent opacity={0.6} />
      </lineSegments>
      <lineSegments geometry={botEdges} position={[0, -1.2, 0]}>
        <lineBasicMaterial color={color} transparent opacity={0.6} />
      </lineSegments>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3, 0.016, 4, 80]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} />
      </mesh>

      <mesh rotation={[Math.PI / 3, Math.PI / 5, 0]}>
        <torusGeometry args={[3.6, 0.011, 4, 80]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

// --------------------------------------------------------------------------
// Camera
// --------------------------------------------------------------------------

function CameraDrift() {
  const { camera } = useThree();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    camera.position.x = Math.sin(t * 0.04) * 0.5;
    camera.position.y = Math.cos(t * 0.03) * 0.35;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// --------------------------------------------------------------------------
// Export
// --------------------------------------------------------------------------

export default function TemporalScene({ state }: { state: ProtocolState }) {
  return (
    <div className="canvas-layer">
      <Canvas
        camera={{ position: [0, 0, 20], fov: 58 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
        dpr={Math.min(window.devicePixelRatio, 2)}
      >
        <CameraDrift />
        <StarField count={8000} />
        <CosmicClock state={state} />
        <OrbitalParticles state={state} />
        <HourglassWireframe state={state} />
      </Canvas>
    </div>
  );
}
