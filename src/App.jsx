
import React, {
  Suspense,
  useMemo,
  useRef,
  useLayoutEffect,
} from "react";

import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import { Box3, Vector3, MathUtils, LoopRepeat } from "three";
import "./App.css";

const MODEL_PATH = `${import.meta.env.BASE_URL}models/phoenix_bird.glb`;
const FORWARD_OFFSET = 0;

function PhoenixBird() {
  const groupRef = useRef(null);
  const modelRef = useRef(null);

  const targetPosition = useRef(new Vector3());
  const currentYaw = useRef(0);
  const hasStarted = useRef(false);

  const { scene, animations } = useGLTF(MODEL_PATH);

  const bird = useMemo(
    () => SkeletonUtils.clone(scene),
    [scene]
  );

  const { actions } = useAnimations(animations, groupRef);

  // Model size and position
  useLayoutEffect(() => {
    const group = groupRef.current;
    const model = modelRef.current;

    if (!group || !model) return;

    model.scale.setScalar(1);
    model.position.set(0, 0, 0);

    const bounds = new Box3().setFromObject(model);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());

    const largest = Math.max(size.x, size.y, size.z);

    if (largest > 0) {
      // Bigger bird
      const scale = 4.5 / largest;

      model.scale.setScalar(scale);

      model.position.set(
        -center.x * scale,
        -center.y * scale,
        -center.z * scale
      );
    }

    group.position.set(0, 0, 0);
    group.rotation.set(0, 0, 0);
    model.rotation.set(0, 0, 0);

    currentYaw.current = FORWARD_OFFSET;
    hasStarted.current = false;
  }, [bird]);

  // Play existing GLB wing animation
  useLayoutEffect(() => {
    const available = Object.entries(actions).filter(
      ([, action]) => Boolean(action)
    );

    console.log(
      "Phoenix animation clips:",
      available.map(([name]) => name)
    );

    if (!available.length) {
      console.warn("No animation clips found in the GLB.");
      return;
    }

    const flightClip = available.find(([name]) =>
      /fly|flight|wing|flap|bird/i.test(name)
    );

    const action = (flightClip || available[0])[1];

    action.reset();
    action.setLoop(LoopRepeat, Infinity);
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(1);
    action.play();

    return () => action.stop();
  }, [actions]);

  // Full-screen cursor movement and smooth rotation
  useFrame((state, delta) => {
    const group = groupRef.current;

    if (!group) return;

    const dt = Math.min(delta, 0.05);
    const elapsed = state.clock.elapsedTime;

    // Calculate the visible camera area
    const camera = state.camera;

    const distance = Math.abs(
      camera.position.z - group.position.z
    );

    const halfHeight =
      Math.tan((camera.fov * Math.PI) / 360) * distance;

    const halfWidth =
      halfHeight * (state.size.width / state.size.height);

    // Follow cursor across the screen
    targetPosition.current.set(
      state.pointer.x * halfWidth * 0.8,
      state.pointer.y * halfHeight * 0.8 +
        Math.sin(elapsed * 2) * 0.05,
      0
    );

    const oldX = group.position.x;

    group.position.lerp(
      targetPosition.current,
      1 - Math.exp(-3.5 * dt)
    );

    const moveX = group.position.x - oldX;

    // Existing left/right rotation logic
    if (Math.abs(moveX) > 0.00005) {
      const targetYaw =
        moveX > 0
          ? FORWARD_OFFSET
          : FORWARD_OFFSET + Math.PI;

      if (!hasStarted.current) {
        currentYaw.current = targetYaw;
        hasStarted.current = true;
      } else {
        const difference = Math.atan2(
          Math.sin(targetYaw - currentYaw.current),
          Math.cos(targetYaw - currentYaw.current)
        );

        currentYaw.current +=
          difference * (1 - Math.exp(-5 * dt));
      }

      group.rotation.y = currentYaw.current;
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={modelRef}>
        <primitive object={bird} />
      </group>
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={2} />

      <hemisphereLight
        intensity={1.5}
        groundColor="#171019"
      />

      <directionalLight
        position={[4, 6, 8]}
        intensity={3}
        color="#fff0d2"
      />

      <pointLight
        position={[-4, 2, 3]}
        intensity={12}
        color="#ff7a32"
      />

      <pointLight
        position={[4, -2, 2]}
        intensity={8}
        color="#49dfff"
      />

      <Suspense fallback={null}>
        <PhoenixBird />
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <main className="phoenix-page">
      <Canvas
        camera={{
          position: [0, 0, 8],
          fov: 45,
          near: 0.1,
          far: 100,
        }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: false,
        }}
      >
        <color attach="background" args={["#000000"]} />
        <Scene />
      </Canvas>
    </main>
  );
}

useGLTF.preload(MODEL_PATH);
