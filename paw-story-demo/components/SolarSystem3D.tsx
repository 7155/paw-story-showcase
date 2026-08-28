"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  Bot,
  TestTube2,
  FileCheck2,
  Check,
  Pause,
  Play,
  RotateCw,
  Compass,
  Eye,
  Sparkles,
  FileText,
} from "lucide-react";

export interface OrbitData {
  id: string;
  name: string;
  tag: string;
  task: string;
  phase: string;
  receipt: string;
  color: string;
  subWorker: string;
  subVerify: string;
  metric: string;
  summary: string;
  tdd: string;
}

interface SolarSystem3DProps {
  orbitalWork: readonly OrbitData[];
  activeStep: number;
  onSelectStep: (step: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
}

export function SolarSystem3D({
  orbitalWork,
  activeStep,
  onSelectStep,
  isPlaying,
  onTogglePlay,
  onRestart,
}: SolarSystem3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"perspective" | "top" | "focus">("perspective");
  const [planetScreenPositions, setPlanetScreenPositions] = useState<
    Array<{ x: number; y: number; visible: boolean }>
  >([]);

  const stateRef = useRef({
    activeStep,
    viewMode,
    isDragging: false,
    prevMouseX: 0,
    prevMouseY: 0,
    targetRotX: 0.35,
    targetRotY: -0.2,
    rotX: 0.35,
    rotY: -0.2,
    targetZoom: 1,
    zoom: 1,
  });

  useEffect(() => {
    stateRef.current.activeStep = activeStep;
    stateRef.current.viewMode = viewMode;
  }, [activeStep, viewMode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060813, 0.0018);

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
    camera.position.set(0, 160, 480);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 2. 3D Cosmos Starfield
    const starCount = 1800;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    const colorPalette = [
      new THREE.Color("#ffffff"),
      new THREE.Color("#a79dff"),
      new THREE.Color("#75e2b5"),
      new THREE.Color("#ffd285"),
      new THREE.Color("#8dc5ff"),
    ];

    for (let i = 0; i < starCount; i++) {
      const radius = 600 + Math.random() * 800;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      starColors[i * 3] = color.r;
      starColors[i * 3 + 1] = color.g;
      starColors[i * 3 + 2] = color.b;

      starSizes[i] = Math.random() * 2.5 + 1.0;
    }

    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));

    // Star point canvas texture
    const starCanvas = document.createElement("canvas");
    starCanvas.width = 32;
    starCanvas.height = 32;
    const starCtx = starCanvas.getContext("2d");
    if (starCtx) {
      const gradient = starCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.3, "rgba(230,240,255,0.8)");
      gradient.addColorStop(0.7, "rgba(167,157,255,0.2)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      starCtx.fillStyle = gradient;
      starCtx.fillRect(0, 0, 32, 32);
    }
    const starTexture = new THREE.CanvasTexture(starCanvas);

    const starMaterial = new THREE.PointsMaterial({
      size: 3.5,
      map: starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const starPoints = new THREE.Points(starGeometry, starMaterial);
    scene.add(starPoints);

    // 3. 3D Cosmic Nebula Dust Clouds
    const nebulaGroup = new THREE.Group();
    const createNebulaCloud = (color: string, x: number, y: number, z: number, size: number) => {
      const count = 300;
      const geom = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i * 3] = x + (Math.random() - 0.5) * size;
        pos[i * 3 + 1] = y + (Math.random() - 0.5) * (size * 0.6);
        pos[i * 3 + 2] = z + (Math.random() - 0.5) * size;
      }
      geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        size: 14,
        map: starTexture,
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      return new THREE.Points(geom, mat);
    };

    nebulaGroup.add(createNebulaCloud("#6e56f8", -180, 60, -220, 220));
    nebulaGroup.add(createNebulaCloud("#40b48c", 200, -40, -180, 200));
    nebulaGroup.add(createNebulaCloud("#ff8c50", 0, -80, 100, 250));
    scene.add(nebulaGroup);

    // 4. 3D Spacetime Gravitational Funnel Grid (Einsteinian Gravity Well)
    const gridRadius = 380;
    const gridSegments = 42;
    const gridGeom = new THREE.BufferGeometry();
    const gridVertices: number[] = [];

    // Concentric rings curving down near center
    for (let r = 20; r <= gridRadius; r += 24) {
      for (let s = 0; s <= gridSegments; s++) {
        const theta1 = (s / gridSegments) * Math.PI * 2;
        const theta2 = ((s + 1) / gridSegments) * Math.PI * 2;
        const y1 = -Math.max(0, 7500 / (r + 35) - 15);
        const y2 = -Math.max(0, 7500 / (r + 35) - 15);

        gridVertices.push(
          r * Math.cos(theta1), y1, r * Math.sin(theta1),
          r * Math.cos(theta2), y2, r * Math.sin(theta2)
        );
      }
    }
    // Radial spoke lines
    for (let s = 0; s < 18; s++) {
      const theta = (s / 18) * Math.PI * 2;
      for (let r = 20; r < gridRadius; r += 24) {
        const nextR = r + 24;
        const y1 = -Math.max(0, 7500 / (r + 35) - 15);
        const y2 = -Math.max(0, 7500 / (nextR + 35) - 15);

        gridVertices.push(
          r * Math.cos(theta), y1, r * Math.sin(theta),
          nextR * Math.cos(theta), y2, nextR * Math.sin(theta)
        );
      }
    }
    gridGeom.setAttribute("position", new THREE.Float32BufferAttribute(gridVertices, 3));
    const gridMat = new THREE.LineBasicMaterial({
      color: 0x4e478f,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
    });
    const gravityGrid = new THREE.LineSegments(gridGeom, gridMat);
    scene.add(gravityGrid);

    // 5. 3D Sun / Gravity Core (恒星与日冕)
    const sunGroup = new THREE.Group();
    sunGroup.position.set(0, -18, 0);

    // Core sphere
    const sunGeom = new THREE.SphereGeometry(32, 36, 36);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xffd27d,
    });
    const sunMesh = new THREE.Mesh(sunGeom, sunMat);
    sunGroup.add(sunMesh);

    // Sun Inner Corona Sphere
    const innerCoronaGeom = new THREE.SphereGeometry(35, 32, 32);
    const innerCoronaMat = new THREE.MeshBasicMaterial({
      color: 0xff8c42,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    const innerCorona = new THREE.Mesh(innerCoronaGeom, innerCoronaMat);
    sunGroup.add(innerCorona);

    // Corona Sprite Billboard Halo
    const coronaCanvas = document.createElement("canvas");
    coronaCanvas.width = 128;
    coronaCanvas.height = 128;
    const coronaCtx = coronaCanvas.getContext("2d");
    if (coronaCtx) {
      const grad = coronaCtx.createRadialGradient(64, 64, 18, 64, 64, 64);
      grad.addColorStop(0, "rgba(255, 230, 160, 0.9)");
      grad.addColorStop(0.3, "rgba(255, 140, 60, 0.6)");
      grad.addColorStop(0.65, "rgba(180, 50, 60, 0.25)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      coronaCtx.fillStyle = grad;
      coronaCtx.fillRect(0, 0, 128, 128);
    }
    const coronaTexture = new THREE.CanvasTexture(coronaCanvas);
    const coronaSpriteMat = new THREE.SpriteMaterial({
      map: coronaTexture,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const coronaSprite = new THREE.Sprite(coronaSpriteMat);
    coronaSprite.scale.set(135, 135, 1);
    sunGroup.add(coronaSprite);

    // Gravitational Shockwave Rings
    const waveRings: THREE.Mesh[] = [];
    const ringGeom = new THREE.RingGeometry(38, 41, 48);
    for (let i = 0; i < 3; i++) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffc480,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = -2;
      ringMesh.scale.setScalar(1 + i * 0.8);
      waveRings.push(ringMesh);
      sunGroup.add(ringMesh);
    }

    scene.add(sunGroup);

    // Sun Point Light
    const sunLight = new THREE.PointLight(0xffb86c, 2.8, 900);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x283050, 0.9);
    scene.add(ambientLight);

    // 6. 3D Planetary Delivery Orbits & Planet Meshes
    const orbitRadiusConfig = [
      { a: 155, b: 125, angle: 0.12, rotZ: 0.08, color: "#a79dff", planetRadius: 13 },
      { a: 225, b: 175, angle: 0.35, rotZ: -0.1, color: "#ffaa88", planetRadius: 15 },
      { a: 295, b: 235, angle: -0.22, rotZ: 0.14, color: "#75e2b5", planetRadius: 14 },
      { a: 365, b: 295, angle: 0.18, rotZ: -0.06, color: "#8dc5ff", planetRadius: 16 },
    ];

    interface PlanetNode {
      group: THREE.Group;
      planetMesh: THREE.Mesh;
      ringMesh?: THREE.Mesh;
      moon1: THREE.Mesh;
      moon2: THREE.Mesh;
      orbitLine: THREE.Line;
      particles: THREE.Points;
      particlePositions: Float32Array;
      particleOffsets: Float32Array;
      a: number;
      b: number;
      tiltX: number;
      tiltZ: number;
      baseSpeed: number;
      currentAngle: number;
      color: THREE.Color;
    }

    const planetNodes: PlanetNode[] = [];

    orbitRadiusConfig.forEach((cfg, idx) => {
      const orbitColor = new THREE.Color(cfg.color);

      // A. Elliptical Orbit Track
      const orbitCurvePts: THREE.Vector3[] = [];
      const segs = 96;
      for (let i = 0; i <= segs; i++) {
        const u = (i / segs) * Math.PI * 2;
        const x = cfg.a * Math.cos(u);
        const z = cfg.b * Math.sin(u);
        // Tilt
        const pt = new THREE.Vector3(x, 0, z);
        pt.applyAxisAngle(new THREE.Vector3(1, 0, 0), cfg.angle);
        pt.applyAxisAngle(new THREE.Vector3(0, 0, 1), cfg.rotZ);
        orbitCurvePts.push(pt);
      }
      const orbitLineGeom = new THREE.BufferGeometry().setFromPoints(orbitCurvePts);
      const orbitLineMat = new THREE.LineBasicMaterial({
        color: orbitColor,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
      });
      const orbitLine = new THREE.Line(orbitLineGeom, orbitLineMat);
      scene.add(orbitLine);

      // B. 3D Photon Particle Stream on Orbit
      const pCount = 45;
      const pGeom = new THREE.BufferGeometry();
      const pPos = new Float32Array(pCount * 3);
      const pOffsets = new Float32Array(pCount);
      for (let i = 0; i < pCount; i++) {
        pOffsets[i] = (i / pCount) * Math.PI * 2;
      }
      pGeom.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
      const pMat = new THREE.PointsMaterial({
        size: 5.5,
        map: starTexture,
        color: orbitColor,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const orbitParticles = new THREE.Points(pGeom, pMat);
      scene.add(orbitParticles);

      // C. 3D Planet Body & Atmosphere
      const planetGroup = new THREE.Group();
      const pSphereGeom = new THREE.SphereGeometry(cfg.planetRadius, 28, 28);
      const pSphereMat = new THREE.MeshStandardMaterial({
        color: orbitColor,
        roughness: 0.35,
        metalness: 0.45,
        emissive: orbitColor,
        emissiveIntensity: 0.25,
      });
      const planetMesh = new THREE.Mesh(pSphereGeom, pSphereMat);
      planetGroup.add(planetMesh);

      // Planet Atmosphere Rim
      const atmoGeom = new THREE.SphereGeometry(cfg.planetRadius * 1.18, 24, 24);
      const atmoMat = new THREE.MeshBasicMaterial({
        color: orbitColor,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      });
      const atmoMesh = new THREE.Mesh(atmoGeom, atmoMat);
      planetGroup.add(atmoMesh);

      // 3D Planet Ring for specific planets (e.g. Verify & Deliver)
      let ringMesh: THREE.Mesh | undefined;
      if (idx === 1 || idx === 3) {
        const ringGeom = new THREE.RingGeometry(cfg.planetRadius * 1.45, cfg.planetRadius * 1.95, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: orbitColor,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        });
        ringMesh = new THREE.Mesh(ringGeom, ringMat);
        ringMesh.rotation.x = Math.PI / 2.3;
        ringMesh.rotation.y = 0.2;
        planetGroup.add(ringMesh);
      }

      // D. Orbiting Moons (Worker Subagents & Local Verifiers)
      const moonGeom1 = new THREE.SphereGeometry(cfg.planetRadius * 0.28, 16, 16);
      const moonMat1 = new THREE.MeshBasicMaterial({ color: 0xc8bfff });
      const moon1 = new THREE.Mesh(moonGeom1, moonMat1);
      planetGroup.add(moon1);

      const moonGeom2 = new THREE.SphereGeometry(cfg.planetRadius * 0.24, 16, 16);
      const moonMat2 = new THREE.MeshBasicMaterial({ color: 0x82e2b7 });
      const moon2 = new THREE.Mesh(moonGeom2, moonMat2);
      planetGroup.add(moon2);

      scene.add(planetGroup);

      planetNodes.push({
        group: planetGroup,
        planetMesh,
        ringMesh,
        moon1,
        moon2,
        orbitLine,
        particles: orbitParticles,
        particlePositions: pPos,
        particleOffsets: pOffsets,
        a: cfg.a,
        b: cfg.b,
        tiltX: cfg.angle,
        tiltZ: cfg.rotZ,
        baseSpeed: 0.18 / (idx + 1),
        currentAngle: (idx * Math.PI) / 2 + 0.4,
        color: orbitColor,
      });
    });

    // 7. Active Gravitational Connector Beam
    const beamGeom = new THREE.BufferGeometry();
    const beamPositions = new Float32Array(6);
    beamGeom.setAttribute("position", new THREE.BufferAttribute(beamPositions, 3));
    const beamMat = new THREE.LineBasicMaterial({
      color: 0xffd27d,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      linewidth: 2,
    });
    const gravBeam = new THREE.Line(beamGeom, beamMat);
    scene.add(gravBeam);

    // 8. Mouse / Touch Orbit Interaction
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      stateRef.current.isDragging = true;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      stateRef.current.prevMouseX = clientX;
      stateRef.current.prevMouseY = clientY;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!stateRef.current.isDragging) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - stateRef.current.prevMouseX;
      const deltaY = clientY - stateRef.current.prevMouseY;

      stateRef.current.targetRotY += deltaX * 0.005;
      stateRef.current.targetRotX = Math.max(
        -0.1,
        Math.min(1.2, stateRef.current.targetRotX + deltaY * 0.005)
      );

      stateRef.current.prevMouseX = clientX;
      stateRef.current.prevMouseY = clientY;
    };

    const onPointerUp = () => {
      stateRef.current.isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener("mousedown", onPointerDown);
    dom.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    dom.addEventListener("touchstart", onPointerDown, { passive: true });
    dom.addEventListener("touchmove", onPointerMove, { passive: true });
    window.addEventListener("touchend", onPointerUp);

    // 9. Resize handler
    const onResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener("resize", onResize);

    // 10. Animation Loop
    let animationFrameId: number;
    const startedAt = performance.now();
    let previousFrameAt = startedAt;

    const tempV3 = new THREE.Vector3();

    const animate = (timestamp = performance.now()) => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = Math.min((timestamp - previousFrameAt) / 1_000, 0.1);
      const elapsed = (timestamp - startedAt) / 1_000;
      previousFrameAt = timestamp;

      // Sun Pulsing & Gravitational Waves
      const sunScale = 1 + Math.sin(elapsed * 2.2) * 0.04;
      sunMesh.scale.setScalar(sunScale);
      coronaSprite.scale.setScalar(135 + Math.sin(elapsed * 3) * 8);

      waveRings.forEach((ring, idx) => {
        const phase = (elapsed * 0.4 + idx * 0.33) % 1;
        ring.scale.setScalar(0.8 + phase * 2.8);
        (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.65 * (1 - phase));
      });

      // Smooth Rotation Damping
      const st = stateRef.current;
      st.rotX += (st.targetRotX - st.rotX) * 0.06;
      st.rotY += (st.targetRotY - st.rotY) * 0.06;

      // Update Camera based on View Mode
      if (st.viewMode === "top") {
        camera.position.set(0, 560, 30);
        camera.lookAt(0, -20, 0);
      } else if (st.viewMode === "focus") {
        const activeNode = planetNodes[st.activeStep];
        if (activeNode) {
          const targetCamX = activeNode.group.position.x * 1.35;
          const targetCamY = activeNode.group.position.y + 45;
          const targetCamZ = activeNode.group.position.z + 140;
          camera.position.lerp(tempV3.set(targetCamX, targetCamY, targetCamZ), 0.04);
          camera.lookAt(activeNode.group.position);
        }
      } else {
        // Perspective 3D Orbit Camera with mouse drag
        const camDistance = 490;
        const camY = Math.sin(st.rotX) * camDistance + 60;
        const camXZ = Math.cos(st.rotX) * camDistance;
        const camX = Math.sin(st.rotY) * camXZ;
        const camZ = Math.cos(st.rotY) * camXZ;

        camera.position.lerp(tempV3.set(camX, camY, camZ), 0.08);
        camera.lookAt(0, -15, 0);
      }

      // Starfield Slow Rotation
      starPoints.rotation.y = elapsed * 0.015;
      nebulaGroup.rotation.y = elapsed * 0.008;

      // Update 3D Planets & Satellites
      const screenPositions: Array<{ x: number; y: number; visible: boolean }> = [];

      planetNodes.forEach((node, idx) => {
        // Orbital movement
        node.currentAngle += node.baseSpeed * delta;
        const rawX = node.a * Math.cos(node.currentAngle);
        const rawZ = node.b * Math.sin(node.currentAngle);

        const pos = new THREE.Vector3(rawX, 0, rawZ);
        pos.applyAxisAngle(new THREE.Vector3(1, 0, 0), node.tiltX);
        pos.applyAxisAngle(new THREE.Vector3(0, 0, 1), node.tiltZ);
        pos.y -= Math.max(0, 6000 / (node.a + 40) - 15) * 0.3; // Gravity sink curve

        node.group.position.copy(pos);
        node.planetMesh.rotation.y += 0.02;

        // Moons revolution around planet
        const moonRadius1 = node.planetMesh.geometry.parameters.radius * 1.85;
        const moonAngle1 = elapsed * 3.2 + idx;
        node.moon1.position.set(
          Math.cos(moonAngle1) * moonRadius1,
          Math.sin(moonAngle1) * (moonRadius1 * 0.35),
          Math.sin(moonAngle1) * moonRadius1
        );

        const moonRadius2 = node.planetMesh.geometry.parameters.radius * 2.5;
        const moonAngle2 = -elapsed * 2.4 + idx * 2;
        node.moon2.position.set(
          Math.cos(moonAngle2) * moonRadius2,
          Math.sin(moonAngle2) * (moonRadius2 * -0.45),
          Math.sin(moonAngle2) * moonRadius2
        );

        // Highlight active orbit line & planet scale
        const isActive = st.activeStep === idx;
        const targetScale = isActive ? 1.22 : 1.0;
        node.group.scale.lerp(tempV3.setScalar(targetScale), 0.1);
        (node.orbitLine.material as THREE.LineBasicMaterial).opacity = isActive ? 0.75 : 0.22;

        // Animate Photon Stream particles along 3D orbit
        const pPositions = node.particlePositions;
        const pCount = node.particleOffsets.length;
        for (let p = 0; p < pCount; p++) {
          const u = (node.particleOffsets[p] + elapsed * (0.45 + idx * 0.1)) % (Math.PI * 2);
          const px = node.a * Math.cos(u);
          const pz = node.b * Math.sin(u);
          const pt = new THREE.Vector3(px, 0, pz);
          pt.applyAxisAngle(new THREE.Vector3(1, 0, 0), node.tiltX);
          pt.applyAxisAngle(new THREE.Vector3(0, 0, 1), node.tiltZ);

          pPositions[p * 3] = pt.x;
          pPositions[p * 3 + 1] = pt.y;
          pPositions[p * 3 + 2] = pt.z;
        }
        node.particles.geometry.attributes.position.needsUpdate = true;

        // Project 3D planet coordinates to 2D Screen HUD
        const screenV = node.group.position.clone().project(camera);
        const sx = ((screenV.x + 1) / 2) * width;
        const sy = ((-screenV.y + 1) / 2) * height;
        const isVisible = screenV.z < 1 && sx >= -50 && sx <= width + 50 && sy >= -50 && sy <= height + 50;

        screenPositions.push({ x: sx, y: sy, visible: isVisible });
      });

      setPlanetScreenPositions(screenPositions);

      // Update Gravitational Connector Beam to active planet
      const activeNode = planetNodes[st.activeStep];
      if (activeNode) {
        beamPositions[0] = 0;
        beamPositions[1] = -18;
        beamPositions[2] = 0;
        beamPositions[3] = activeNode.group.position.x;
        beamPositions[4] = activeNode.group.position.y;
        beamPositions[5] = activeNode.group.position.z;
        gravBeam.geometry.attributes.position.needsUpdate = true;
        beamMat.color = activeNode.color;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mouseup", onPointerUp);
      window.removeEventListener("touchend", onPointerUp);
      dom.removeEventListener("mousedown", onPointerDown);
      dom.removeEventListener("mousemove", onPointerMove);
      dom.removeEventListener("touchstart", onPointerDown);
      dom.removeEventListener("touchmove", onPointerMove);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const activePlanet = orbitalWork[activeStep] ?? orbitalWork[0];

  return (
    <div className="solar-3d-stage" ref={containerRef} aria-label="3D 太阳系引力场与交付轨道">
      {/* 3D View Modes & Camera Controls Overlay */}
      <div className="solar-3d-controls">
        <div className="solar-3d-btn-group">
          <button
            className="solar-3d-mode-btn"
            data-active={viewMode === "perspective"}
            onClick={() => setViewMode("perspective")}
            type="button"
            title="自由 3D 轨道视角 (拖拽旋转)"
          >
            <Compass size={13} />
            <span>3D 漫游</span>
          </button>
          <button
            className="solar-3d-mode-btn"
            data-active={viewMode === "top"}
            onClick={() => setViewMode("top")}
            type="button"
            title="银河引力俯视视角"
          >
            <Eye size={13} />
            <span>引力俯瞰</span>
          </button>
          <button
            className="solar-3d-mode-btn"
            data-active={viewMode === "focus"}
            onClick={() => setViewMode("focus")}
            type="button"
            title="聚焦追踪当前行星"
          >
            <Sparkles size={13} />
            <span>特写追踪</span>
          </button>
        </div>

        <div className="solar-3d-play-controls">
          <button
            className="solar-3d-action-btn"
            onClick={onTogglePlay}
            type="button"
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            <span>{isPlaying ? "暂停巡览" : "继续公转"}</span>
          </button>
          <button
            className="solar-3d-action-btn"
            onClick={onRestart}
            type="button"
            title="重置视角与轨道"
          >
            <RotateCw size={13} />
          </button>
        </div>
      </div>

      {/* 3D Hologram Gravity Document Backdrop */}
      <div className="solar-3d-doc-card">
        <header>
          <FileText size={13} />
          <span>ORIGINAL_REQUIREMENT.md · 3D GRAVITY CORE</span>
        </header>
        <p>中心引力：以原始需求为唯一事实，驱动 4 大纵向交付轨道与 Session Worker。</p>
      </div>

      {/* Screen-Space 3D Projected Planet HUD Tags */}
      {planetScreenPositions.map((pos, idx) => {
        const p = orbitalWork[idx];
        if (!p || !pos.visible) return null;
        const isActive = activeStep === idx;

        return (
          <div
            className="solar-3d-planet-hud"
            data-active={isActive}
            key={p.id}
            onClick={() => onSelectStep(idx)}
            style={{
              transform: `translate(${pos.x}px, ${pos.y}px) translate(-50%, -130%)`,
              "--planet-color": p.color,
            } as React.CSSProperties}
          >
            <div className="solar-3d-hud-dot" style={{ backgroundColor: p.color }} />
            <div className="solar-3d-hud-card">
              <header>
                <strong>{p.name}</strong>
                <small>{p.tdd.split(" ")[0]}</small>
              </header>
              <span className="solar-3d-hud-task">{p.task}</span>
              <div className="solar-3d-hud-receipt">
                <FileCheck2 size={10} />
                <span>{p.receipt}</span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Bottom 3D Telemetry HUD Drawer */}
      <div className="solar-3d-bottom-telemetry">
        <div className="solar-3d-chips">
          {orbitalWork.map((p, idx) => (
            <button
              aria-pressed={activeStep === idx}
              key={p.id}
              onClick={() => onSelectStep(idx)}
              type="button"
            >
              <i style={{ backgroundColor: p.color }} />
              <span>{p.name}</span>
            </button>
          ))}
        </div>

        <div className="solar-3d-telemetry-body">
          <div className="solar-3d-telemetry-item">
            <span className="telemetry-label">当前交付轨道</span>
            <strong>{activePlanet.tag}</strong>
            <p>{activePlanet.summary}</p>
          </div>

          <div className="solar-3d-telemetry-item">
            <span className="telemetry-label">Session 卫星遥测</span>
            <div className="telemetry-satellite-row">
              <Bot size={12} className="text-violet-400" />
              <span>{activePlanet.subWorker}</span>
            </div>
            <div className="telemetry-satellite-row">
              <TestTube2 size={12} className="text-emerald-400" />
              <span>{activePlanet.subVerify}</span>
            </div>
          </div>

          <div className="solar-3d-telemetry-item telemetry-proof">
            <span className="telemetry-label">验收依据与产物</span>
            <div className="telemetry-badge-row">
              <code>{activePlanet.receipt}</code>
              <span className="tdd-pill"><Check size={11} /> {activePlanet.tdd}</span>
            </div>
            <small>{activePlanet.metric}</small>
          </div>
        </div>
      </div>
    </div>
  );
}
