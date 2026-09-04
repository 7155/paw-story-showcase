"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

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

// Four implementation planets exchange bounded evidence before the real Room
// starts its later, gated Reviewer phase.
const ORBIT_LINKS = [
  { from: 0, to: 1, label: "输入事件合同" },
  { from: 1, to: 2, label: "召回合同" },
  { from: 2, to: 3, label: "Room 投影合同" },
  { from: 3, to: 0, label: "前端约束回传" },
] as const;

interface SolarSystem3DProps {
  orbitalWork: readonly OrbitData[];
  activeStep: number;
  onSelectStep: (step: number) => void;
  isPlaying: boolean;
}

// Canvas-generated planet surface: banded gradient + speckle, so planets
// read as textured bodies instead of flat circles.
function makePlanetTexture(base: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const col = new THREE.Color(base);
  const light = col.clone().lerp(new THREE.Color("#ffffff"), 0.42);
  const dark = col.clone().lerp(new THREE.Color("#05080a"), 0.5);
  const gradient = ctx.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, `#${light.getHexString()}`);
  gradient.addColorStop(0.48, `#${col.getHexString()}`);
  gradient.addColorStop(1, `#${dark.getHexString()}`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 128);

  for (let i = 0; i < 24; i++) {
    const y = Math.random() * 128;
    const h = 1.5 + Math.random() * 6;
    const alpha = 0.04 + Math.random() * 0.1;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(2,6,8,${alpha})`;
    ctx.fillRect(0, y, 256, h);
  }
  for (let i = 0; i < 260; i++) {
    const alpha = 0.03 + Math.random() * 0.09;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(2,6,8,${alpha})`;
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 128, 0.6 + Math.random() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Canvas-generated sun surface: hot core, granulation, cooler limb.
function makeSunTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  gradient.addColorStop(0, "#fff7dd");
  gradient.addColorStop(0.35, "#ffd98a");
  gradient.addColorStop(0.72, "#ff9e4f");
  gradient.addColorStop(1, "#e85d3d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 950; i++) {
    const alpha = 0.04 + Math.random() * 0.1;
    ctx.fillStyle = Math.random() > 0.45 ? `rgba(255,255,255,${alpha})` : `rgba(170,64,22,${alpha})`;
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 256, 0.5 + Math.random() * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Tiny document packet: the vertically-sliced doc/skill payload that the
// Goal's gravity dispatches to each planet.
function makeDocTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 48;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#f7f3e8";
    ctx.beginPath();
    ctx.roundRect(6, 4, 36, 56, 6);
    ctx.fill();
    ctx.fillStyle = "#d9d2c0";
    ctx.beginPath();
    ctx.roundRect(30, 4, 12, 12, 3);
    ctx.fill();
    ctx.fillStyle = "#7a7462";
    [18, 28, 38, 48].forEach((y, i) => {
      ctx.fillRect(13, y, i === 3 ? 12 : 22, 3);
    });
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Harness chip: the rules, checks and skills that ride the gravity field
// together with the documents (harness = 约束随文档一起派发).
function makeHarnessTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#123f2e";
    ctx.beginPath();
    ctx.roundRect(4, 4, 40, 40, 10);
    ctx.fill();
    ctx.strokeStyle = "#5fd4a8";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.strokeStyle = "#d7f5e8";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(15, 24);
    ctx.lineTo(22, 31);
    ctx.lineTo(34, 17);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.35, "rgba(255,244,220,0.55)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(canvas);
}

export function SolarSystem3D({
  orbitalWork,
  activeStep,
  onSelectStep,
  isPlaying,
}: SolarSystem3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Overlay positions are written straight to the DOM from the render loop —
  // no per-frame React state, so the 60fps loop never triggers a re-render.
  const planetTagRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const planetOriginRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const sunTagRef = useRef<HTMLDivElement>(null);
  const linkLabelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const linkLabelStateRef = useRef<Array<{ active: boolean }>>([]);
  const overlayRef = useRef<{
    write: (positions: Array<{ x: number; y: number; visible: boolean }>, sun: { x: number; y: number; visible: boolean }) => void;
    writeLinks: (labels: Array<{ x: number; y: number; visible: boolean }>) => void;
  } | null>(null);
  const requestRenderRef = useRef<() => void>(() => undefined);
  const requestedPlayingRef = useRef(isPlaying);
  const prefersReducedMotionRef = useRef(false);

  const stateRef = useRef({
    activeStep,
    isPlaying,
    isDragging: false,
    prevMouseX: 0,
    prevMouseY: 0,
    targetRotX: 0.38,
    targetRotY: -0.2,
    rotX: 0.38,
    rotY: -0.2,
  });

  useEffect(() => {
    requestedPlayingRef.current = isPlaying;
    stateRef.current.activeStep = activeStep;
    stateRef.current.isPlaying = isPlaying && !prefersReducedMotionRef.current;
    requestRenderRef.current();
  }, [activeStep, isPlaying]);

  useEffect(() => {
    overlayRef.current = {
      write(positions, sun) {
        const stage = containerRef.current;
        const maxX = (stage?.clientWidth ?? 800) - 76;
        const maxY = (stage?.clientHeight ?? 600) - 28;
        positions.forEach((pos, idx) => {
          const origin = planetOriginRefs.current[idx];
          if (origin) origin.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
          const tag = planetTagRefs.current[idx];
          if (tag) {
            // Tags float above their planet but never leave the stage
            const tagX = Math.min(Math.max(pos.x, 76), maxX);
            const tagY = Math.min(Math.max(pos.y, 92), maxY);
            tag.style.transform = `translate(${tagX}px, ${tagY}px) translate(-50%, -165%)`;
            tag.style.visibility = pos.visible ? "visible" : "hidden";
          }
        });
        const sunTag = sunTagRef.current;
        if (sunTag) {
          const sunY = Math.min(sun.y, maxY - 60);
          sunTag.style.transform = `translate(${Math.min(Math.max(sun.x, 76), maxX)}px, ${sunY}px) translate(-50%, 64px)`;
          sunTag.style.visibility = sun.visible ? "visible" : "hidden";
        }
      },
      writeLinks(labels) {
        labels.forEach((label, idx) => {
          const el = linkLabelRefs.current[idx];
          const link = ORBIT_LINKS[idx];
          if (!el || !link) return;
          el.style.transform = `translate(${label.x}px, ${label.y}px) translate(-50%, -50%)`;
          const prev = linkLabelStateRef.current[idx];
          if (!prev || prev.active !== label.visible) {
            if (label.visible) el.setAttribute("data-active", "true");
            else el.removeAttribute("data-active");
          }
          linkLabelStateRef.current[idx] = { active: label.visible };
        });
      },
    };
  }, [orbitalWork]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotionRef.current = motionPreference.matches;
    stateRef.current.isPlaying = requestedPlayingRef.current && !motionPreference.matches;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070c09, 0.0011);

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
    camera.position.set(0, 215, 700);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // Bloom lifts the sun, beam, pulses and orbit conduits without touching the page DOM
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.5, 0.65, 0.78);
    composer.addPass(bloomPass);

    const glowTexture = makeGlowTexture();

    // ---- Starfield: sparse, small, quiet ----------------------------------
    const starCount = 650;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starPalette = [
      new THREE.Color("#ffffff"),
      new THREE.Color("#dceee4"),
      new THREE.Color("#ffe6bd"),
      new THREE.Color("#c9d4ff"),
    ];
    for (let i = 0; i < starCount; i++) {
      const radius = 620 + Math.random() * 850;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);
      const color = starPalette[Math.floor(Math.random() * starPalette.length)];
      starColors[i * 3] = color.r;
      starColors[i * 3 + 1] = color.g;
      starColors[i * 3 + 2] = color.b;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
    const starPoints = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        size: 2.1,
        map: glowTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    scene.add(starPoints);

    // ---- Spacetime gravity-well grid: the Goal's pull made visible ---------
    const gridVertices: number[] = [];
    const gridRadius = 390;
    const gridSegments = 44;
    for (let r = 24; r <= gridRadius; r += 24) {
      for (let s = 0; s <= gridSegments; s++) {
        const theta1 = (s / gridSegments) * Math.PI * 2;
        const theta2 = ((s + 1) / gridSegments) * Math.PI * 2;
        const y1 = -Math.max(0, 7200 / (r + 36) - 14);
        const y2 = -Math.max(0, 7200 / (r + 36) - 14);
        gridVertices.push(r * Math.cos(theta1), y1, r * Math.sin(theta1), r * Math.cos(theta2), y2, r * Math.sin(theta2));
      }
    }
    for (let s = 0; s < 20; s++) {
      const theta = (s / 20) * Math.PI * 2;
      for (let r = 24; r < gridRadius; r += 24) {
        const nextR = r + 24;
        const y1 = -Math.max(0, 7200 / (r + 36) - 14);
        const y2 = -Math.max(0, 7200 / (nextR + 36) - 14);
        gridVertices.push(r * Math.cos(theta), y1, r * Math.sin(theta), nextR * Math.cos(theta), y2, nextR * Math.sin(theta));
      }
    }
    const gridGeom = new THREE.BufferGeometry();
    gridGeom.setAttribute("position", new THREE.Float32BufferAttribute(gridVertices, 3));
    const gravityGrid = new THREE.LineSegments(
      gridGeom,
      new THREE.LineBasicMaterial({ color: 0x3d6b52, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending }),
    );
    scene.add(gravityGrid);

    // ---- Sun: the original requirement, radiating gravity ------------------
    const sunGroup = new THREE.Group();
    sunGroup.position.set(0, -16, 0);

    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(36, 40, 40),
      new THREE.MeshBasicMaterial({ map: makeSunTexture() }),
    );
    sunGroup.add(sunMesh);

    const innerCorona = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffc06a,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    innerCorona.scale.set(120, 120, 1);
    sunGroup.add(innerCorona);

    const outerCorona = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xff8a4d,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    outerCorona.scale.set(190, 190, 1);
    sunGroup.add(outerCorona);

    // Gravity waves: the dispatch signal travelling outward to the planets
    const waveRings: THREE.Mesh[] = [];
    const waveGeom = new THREE.RingGeometry(38, 40, 64);
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        waveGeom,
        new THREE.MeshBasicMaterial({
          color: 0xffc98a,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      sunGroup.add(ring);
      waveRings.push(ring);
    }
    scene.add(sunGroup);

    // Gravity field: slow dispatch waves travelling from the Goal all the way
    // out to the planet orbits, flat on the orbital plane.
    const fieldRingGeom = new THREE.RingGeometry(0.992, 1, 128);
    const fieldRings = [0, 1].map(() => {
      const ring = new THREE.Mesh(
        fieldRingGeom,
        new THREE.MeshBasicMaterial({
          color: 0xffc98a,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -4;
      scene.add(ring);
      return ring;
    });

    const sunLight = new THREE.PointLight(0xffc98a, 2.4, 1000);
    sunGroup.add(sunLight);
    scene.add(new THREE.AmbientLight(0x24382d, 1.1));

    // ---- Planets: vertical-slice tasks on glowing delivery orbits ----------
    const orbitRadiusConfig = [
      { a: 130, b: 102, angle: 0.12, rotZ: 0.08, color: "#a79dff", planetRadius: 15 },
      { a: 178, b: 139, angle: 0.35, rotZ: -0.1, color: "#ffaa88", planetRadius: 18 },
      { a: 226, b: 176, angle: -0.22, rotZ: 0.14, color: "#75e2b5", planetRadius: 17 },
      { a: 274, b: 214, angle: 0.18, rotZ: -0.06, color: "#8dc5ff", planetRadius: 19 },
      { a: 322, b: 252, angle: -0.16, rotZ: 0.1, color: "#f0a3d8", planetRadius: 18 },
      { a: 372, b: 290, angle: -0.08, rotZ: 0.04, color: "#e9c46a", planetRadius: 19 },
    ];

    interface PlanetNode {
      group: THREE.Group;
      planetMesh: THREE.Mesh;
      moon1: THREE.Mesh;
      moon2: THREE.Mesh;
      orbitMat: THREE.MeshBasicMaterial;
      orbitMatrix: THREE.Matrix4;
      a: number;
      b: number;
      baseSpeed: number;
      currentAngle: number;
      color: THREE.Color;
      particles: THREE.Points;
      particlePositions: Float32Array;
      particleOffsets: Float32Array;
    }

    const planetNodes: PlanetNode[] = [];

    orbitRadiusConfig.forEach((cfg, idx) => {
      const orbitColor = new THREE.Color(cfg.color);

      // Glowing orbit conduit
      const orbitPts: THREE.Vector3[] = [];
      const segs = 110;
      for (let i = 0; i <= segs; i++) {
        const u = (i / segs) * Math.PI * 2;
        const pt = new THREE.Vector3(cfg.a * Math.cos(u), 0, cfg.b * Math.sin(u));
        pt.applyAxisAngle(new THREE.Vector3(1, 0, 0), cfg.angle);
        pt.applyAxisAngle(new THREE.Vector3(0, 0, 1), cfg.rotZ);
        orbitPts.push(pt);
      }
      const orbitCurve = new THREE.CatmullRomCurve3(orbitPts, true);
      const orbitMat = new THREE.MeshBasicMaterial({
        color: orbitColor,
        transparent: true,
        opacity: 0.26,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(orbitCurve, 140, 0.65, 8, true), orbitMat));

      // Photon stream: work packets flowing along the orbit
      const pCount = 40;
      const pGeom = new THREE.BufferGeometry();
      const pPos = new Float32Array(pCount * 3);
      const pOffsets = new Float32Array(pCount);
      for (let i = 0; i < pCount; i++) pOffsets[i] = (i / pCount) * Math.PI * 2;
      pGeom.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
      const orbitParticles = new THREE.Points(pGeom, new THREE.PointsMaterial({
        size: 3.6,
        map: glowTexture,
        color: orbitColor,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      scene.add(orbitParticles);

      // Textured planet body
      const planetGroup = new THREE.Group();
      const planetMesh = new THREE.Mesh(
        new THREE.SphereGeometry(cfg.planetRadius, 36, 36),
        new THREE.MeshStandardMaterial({
          map: makePlanetTexture(cfg.color),
          roughness: 0.62,
          metalness: 0.12,
          emissive: orbitColor,
          emissiveIntensity: 0.14,
        }),
      );
      planetGroup.add(planetMesh);

      // Identity glow + atmosphere rim
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture,
        color: orbitColor,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      glow.scale.set(cfg.planetRadius * 4.6, cfg.planetRadius * 4.6, 1);
      planetGroup.add(glow);

      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(cfg.planetRadius * 1.16, 24, 24),
        new THREE.MeshBasicMaterial({
          color: orbitColor,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          depthWrite: false,
        }),
      );
      planetGroup.add(atmosphere);

      // Moons: the partner's Session worker subagent and its local verifier
      const moonGeom = new THREE.SphereGeometry(cfg.planetRadius * 0.24, 14, 14);
      const moon1 = new THREE.Mesh(moonGeom, new THREE.MeshBasicMaterial({ color: 0xd8d2ff }));
      const moon2 = new THREE.Mesh(new THREE.SphereGeometry(cfg.planetRadius * 0.2, 14, 14), new THREE.MeshBasicMaterial({ color: 0xa9ecc9 }));
      planetGroup.add(moon1);
      planetGroup.add(moon2);

      scene.add(planetGroup);

      // Orbit tilt never changes: precompute the rotation matrix once so the
      // frame loop does zero applyAxisAngle calls and zero Vector3 allocation.
      const orbitMatrix = new THREE.Matrix4()
        .makeRotationZ(cfg.rotZ)
        .multiply(new THREE.Matrix4().makeRotationX(cfg.angle));

      planetNodes.push({
        group: planetGroup,
        planetMesh,
        moon1,
        moon2,
        orbitMat,
        orbitMatrix,
        a: cfg.a,
        b: cfg.b,
        baseSpeed: 0.18 / (idx + 1),
        currentAngle: (idx * Math.PI) / 2 + 0.4,
        color: orbitColor,
        particles: orbitParticles,
        particlePositions: pPos,
        particleOffsets: pOffsets,
      });
    });

    // Dispatch beam: Goal -> active partner
    const beamGeom = new THREE.CylinderGeometry(1.05, 1.05, 1, 10, 1, true);
    beamGeom.translate(0, 0.5, 0);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffd27d,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const gravBeam = new THREE.Mesh(beamGeom, beamMat);
    scene.add(gravBeam);
    const beamUp = new THREE.Vector3(0, 1, 0);
    const beamDir = new THREE.Vector3();
    const beamOrigin = new THREE.Vector3(0, -16, 0);

    // Energy packets travelling along the dispatch beam to the active planet
    const beamPulses = [0, 1].map((i) => {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffe2ae,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const pulse = new THREE.Mesh(new THREE.SphereGeometry(2.6, 10, 10), mat);
      scene.add(pulse);
      return { pulse, mat, phase: i * 0.5 };
    });

    // Inter-orbit gravity channels; pulses carry documents and WorkPatches.
    // Every fourth pulse on a Reviewer channel flows back in red = 打回.
    const linkMeshes = planetNodes.length >= 4
      ? ORBIT_LINKS.map((edge) => {
          const geom = new THREE.CylinderGeometry(0.5, 0.5, 1, 6, 1, true);
          geom.translate(0, 0.5, 0);
          const mat = new THREE.MeshBasicMaterial({
            color: 0x9fbcab,
            transparent: true,
            opacity: 0.16,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });
          const mesh = new THREE.Mesh(geom, mat);
          scene.add(mesh);
          const pulseColor = planetNodes[edge.to]?.color.clone() ?? new THREE.Color(0xffffff);
          const pulseMat = new THREE.MeshBasicMaterial({
            color: pulseColor.clone(),
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });
          const pulse = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 10), pulseMat);
          scene.add(pulse);
          return { mesh, mat, pulse, pulseMat, pulseColor, edge };
        })
      : [];

    // Gravity made literal: a faint dispatch channel from the Goal to every
    // planet, carrying the vertically-sliced document/skill packets.
    const docTexture = makeDocTexture();
    const harnessTexture = makeHarnessTexture();
    const dispatchChannels = planetNodes.map((node, idx) => {
      const geom = new THREE.CylinderGeometry(0.35, 0.35, 1, 6, 1, true);
      geom.translate(0, 0.5, 0);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffc98a,
        transparent: true,
        opacity: 0.07,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geom, mat);
      scene.add(mesh);
      const packetMat = new THREE.SpriteMaterial({
        map: docTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const packet = new THREE.Sprite(packetMat);
      packet.scale.set(8.5, 11.5, 1);
      scene.add(packet);
      // A harness chip rides the same channel, phase-offset from the document
      const chipMat = new THREE.SpriteMaterial({
        map: harnessTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const chip = new THREE.Sprite(chipMat);
      chip.scale.set(7.5, 7.5, 1);
      scene.add(chip);
      return { mesh, mat, packet, packetMat, chip, chipMat, node, phase: idx * 0.27 };
    });

    // Accretion disc: split documents and harness rules swirl around the Goal
    // before gravity dispatches them to the planets.
    const DISC_COUNT = 22;
    const discPages = Array.from({ length: DISC_COUNT }, (_, i) => {
      const isHarness = i % 3 === 2;
      const mat = new THREE.SpriteMaterial({
        map: isHarness ? harnessTexture : docTexture,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      const size = isHarness ? 7 : 6.5;
      sprite.scale.set(size, isHarness ? size : size * 1.35, 1);
      scene.add(sprite);
      return {
        sprite,
        angle: (i / DISC_COUNT) * Math.PI * 2,
        radius: 54 + (i % 4) * 9,
        speed: 0.32 + (i % 5) * 0.045,
        bobPhase: i * 0.7,
      };
    });

    // The gravity field itself is made of documents: pages split from the
    // Goal radiate outward along the orbital plane, then fade and respawn.
    const FIELD_PAGE_COUNT = 12;
    const fieldPages = Array.from({ length: FIELD_PAGE_COUNT }, (_, i) => {
      const mat = new THREE.SpriteMaterial({
        map: docTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(7.5, 10, 1);
      scene.add(sprite);
      return {
        sprite,
        mat,
        angle: (i / FIELD_PAGE_COUNT) * Math.PI * 2 + (i % 3) * 0.21,
        phase: i / FIELD_PAGE_COUNT,
        speed: 0.055 + (i % 4) * 0.012,
      };
    });

    let scheduleFrame: () => void = () => undefined;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      stateRef.current.isDragging = true;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      stateRef.current.prevMouseX = clientX;
      stateRef.current.prevMouseY = clientY;
      scheduleFrame();
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!stateRef.current.isDragging) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      stateRef.current.targetRotY += (clientX - stateRef.current.prevMouseX) * 0.005;
      stateRef.current.targetRotX = Math.max(
        0.08,
        Math.min(1.15, stateRef.current.targetRotX + (clientY - stateRef.current.prevMouseY) * 0.005)
      );
      stateRef.current.prevMouseX = clientX;
      stateRef.current.prevMouseY = clientY;
      scheduleFrame();
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

    const onResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
      composer.setSize(newWidth, newHeight);
      scheduleFrame();
    };
    window.addEventListener("resize", onResize);

    let animationFrameId: number | null = null;
    let previousFrameAt = performance.now();
    let motionElapsed = 0;
    const tempV3 = new THREE.Vector3();
    const tempPos = new THREE.Vector3();
    const tempProject = new THREE.Vector3();
    const sunWarm = new THREE.Color(0xffd27d);

    // Adaptive quality: sustained < ~42fps first drops bloom, then resolution.
    let qualityLevel = 0;
    let slowTime = 0;
    // Overlay DOM writes are throttled to every second frame — 30fps labels
    // track smoothly enough and the main thread stays free for rendering.
    let overlayFrame = 0;
    const degrade = () => {
      if (qualityLevel === 0) {
        qualityLevel = 1;
      } else if (qualityLevel === 1) {
        qualityLevel = 2;
        renderer.setPixelRatio(1);
        renderer.setSize(container.clientWidth, container.clientHeight);
      }
    };

    const animate = (timestamp = performance.now()) => {
      animationFrameId = null;
      const delta = Math.min((timestamp - previousFrameAt) / 1_000, 0.1);
      previousFrameAt = timestamp;
      const st = stateRef.current;
      const motionDelta = st.isPlaying ? delta : 0;
      motionElapsed += motionDelta;
      const elapsed = motionElapsed;

      if (st.isPlaying) {
        if (delta > 1 / 42) slowTime += delta;
        else slowTime = Math.max(0, slowTime - delta * 0.5);
        if (slowTime > 1.6 && qualityLevel < 2) {
          degrade();
          slowTime = 0;
        }
      }

      // Sun breathes; gravity waves radiate outward and fade
      sunMesh.rotation.y += 0.12 * motionDelta;
      const sunScale = 1 + Math.sin(elapsed * 1.8) * 0.03;
      sunMesh.scale.setScalar(sunScale);
      innerCorona.scale.setScalar(120 + Math.sin(elapsed * 2.6) * 7);
      waveRings.forEach((ring, idx) => {
        const phase = (elapsed * 0.32 + idx * 0.33) % 1;
        ring.scale.setScalar(0.9 + phase * 3.4);
        (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.5 * (1 - phase));
      });

      // Gravity-field dispatch waves: expand from the sun to the outermost orbit
      fieldRings.forEach((ring, idx) => {
        const phase = (elapsed * 0.11 + idx * 0.5) % 1;
        ring.scale.setScalar(48 + phase * 340);
        (ring.material as THREE.MeshBasicMaterial).opacity = phase < 0.04 ? 0 : 0.2 * (1 - phase);
      });

      // Document pages riding the field outward
      fieldPages.forEach((page) => {
        const t = (elapsed * page.speed + page.phase) % 1;
        const radius = 44 + t * 340;
        page.sprite.position.set(
          Math.cos(page.angle) * radius,
          -8 + Math.sin(t * Math.PI) * 6,
          Math.sin(page.angle) * radius * 0.78,
        );
        page.mat.opacity = Math.sin(t * Math.PI) * 0.85;
        const scale = 0.7 + t * 0.5;
        page.sprite.scale.set(7.5 * scale, 10 * scale, 1);
      });

      st.rotX += (st.targetRotX - st.rotX) * 0.06;
      st.rotY += (st.targetRotY - st.rotY) * 0.06;

      if (st.isPlaying && !st.isDragging) st.targetRotY += delta * 0.04;
      const camDistance = 700;
      const camY = Math.sin(st.rotX) * camDistance + 58;
      const camXZ = Math.cos(st.rotX) * camDistance;
      camera.position.lerp(
        tempV3.set(Math.sin(st.rotY) * camXZ, camY, Math.cos(st.rotY) * camXZ),
        st.isPlaying ? 0.08 : 1,
      );
      camera.lookAt(0, -14, 0);

      starPoints.rotation.y = elapsed * 0.012;
      starPoints.material.opacity = 0.5 + Math.sin(elapsed * 1.3) * 0.14;
      gravityGrid.rotation.y = elapsed * 0.004;
      // The gravity well breathes — the field is alive, not a static diagram
      gravityGrid.scale.setScalar(1 + Math.sin(elapsed * 0.8) * 0.018);

      // Accretion disc: documents and harness rules swirl around the Goal
      discPages.forEach((page) => {
        const angle = page.angle + elapsed * page.speed;
        page.sprite.position.set(
          Math.cos(angle) * page.radius,
          -16 + Math.sin(elapsed * 1.4 + page.bobPhase) * 3.5,
          Math.sin(angle) * page.radius * 0.82,
        );
      });

      const screenPositions: Array<{ x: number; y: number; visible: boolean }> = [];

      planetNodes.forEach((node, idx) => {
        node.currentAngle += node.baseSpeed * motionDelta;
        tempPos.set(node.a * Math.cos(node.currentAngle), 0, node.b * Math.sin(node.currentAngle)).applyMatrix4(node.orbitMatrix);
        tempPos.y -= Math.max(0, 6000 / (node.a + 40) - 15) * 0.3;
        node.group.position.copy(tempPos);
        node.planetMesh.rotation.y += 0.9 * motionDelta;

        const planetRadius = (node.planetMesh.geometry as THREE.SphereGeometry).parameters.radius;
        const moonAngle1 = elapsed * 2.8 + idx;
        node.moon1.position.set(
          Math.cos(moonAngle1) * planetRadius * 1.9,
          Math.sin(moonAngle1) * planetRadius * 0.7,
          Math.sin(moonAngle1) * planetRadius * 1.9,
        );
        const moonAngle2 = -elapsed * 2.1 + idx * 2;
        node.moon2.position.set(
          Math.cos(moonAngle2) * planetRadius * 2.55,
          Math.sin(moonAngle2) * planetRadius * -1.1,
          Math.sin(moonAngle2) * planetRadius * 2.55,
        );

        const isActive = st.activeStep === idx;
        node.group.scale.lerp(tempV3.setScalar(isActive ? 1.2 : 1.0), 0.1);
        node.orbitMat.opacity = isActive ? 0.75 : 0.26;

        const pPositions = node.particlePositions;
        for (let p = 0; p < node.particleOffsets.length; p++) {
          const u = (node.particleOffsets[p] + elapsed * (0.4 + idx * 0.08)) % (Math.PI * 2);
          tempPos.set(node.a * Math.cos(u), 0, node.b * Math.sin(u)).applyMatrix4(node.orbitMatrix);
          pPositions[p * 3] = tempPos.x;
          pPositions[p * 3 + 1] = tempPos.y;
          pPositions[p * 3 + 2] = tempPos.z;
        }
        node.particles.geometry.attributes.position.needsUpdate = true;

        const screenV = tempProject.copy(node.group.position).project(camera);
        const sx = ((screenV.x + 1) / 2) * width;
        const sy = ((-screenV.y + 1) / 2) * height;
        screenPositions.push({
          x: sx,
          y: sy,
          visible: screenV.z < 1 && sx >= -50 && sx <= width + 50 && sy >= -50 && sy <= height + 50,
        });
      });

      overlayFrame += 1;
      const writeOverlays = overlayFrame % 2 === 0;

      const sunV = tempV3.set(0, -16, 0).project(camera);
      if (writeOverlays) {
        overlayRef.current?.write(screenPositions, {
          x: ((sunV.x + 1) / 2) * width,
          y: ((-sunV.y + 1) / 2) * height,
          visible: sunV.z < 1,
        });
      }

      const nextLinkLabels: Array<{ x: number; y: number; visible: boolean }> = [];
      linkMeshes.forEach(({ mesh, mat, pulse, pulseMat, pulseColor, edge }, edgeIndex) => {
        const fromNode = planetNodes[edge.from];
        const toNode = planetNodes[edge.to];
        if (!fromNode || !toNode) return;
        const from = fromNode.group.position;
        const to = toNode.group.position;
        beamDir.copy(to).sub(from);
        mesh.position.copy(from);
        mesh.scale.set(1, beamDir.length(), 1);
        mesh.quaternion.setFromUnitVectors(beamUp, beamDir.normalize());
        const activeLink = st.activeStep === edge.from || st.activeStep === edge.to;
        mat.opacity = activeLink ? 0.5 : 0.16;

        const cyclePosition = elapsed * 0.45 + edgeIndex * 0.23;
        const t = cyclePosition % 1;
        pulse.position.copy(from).lerp(to, t);
        pulseMat.color.copy(pulseColor);
        pulseMat.opacity = activeLink ? 0.95 : 0.6;

        const midV = tempProject.copy(from).lerp(to, 0.5).project(camera);
        nextLinkLabels.push({
          x: ((midV.x + 1) / 2) * width,
          y: ((-midV.y + 1) / 2) * height,
          visible: midV.z < 1 && activeLink,
        });
      });
      if (writeOverlays) overlayRef.current?.writeLinks(nextLinkLabels);

      const activeNode = planetNodes[st.activeStep];
      if (activeNode) {
        beamDir.copy(activeNode.group.position).sub(beamOrigin);
        gravBeam.position.copy(beamOrigin);
        gravBeam.scale.set(1, beamDir.length(), 1);
        gravBeam.quaternion.setFromUnitVectors(beamUp, beamDir.normalize());
        beamMat.color.copy(activeNode.color).lerp(sunWarm, 0.55);
        beamMat.opacity = 0.26 + Math.sin(elapsed * 2.2) * 0.07;
      }

      // Dispatch channels: docs/skills flow from the Goal to every partner,
      // each channel alternating a document packet and a harness chip
      dispatchChannels.forEach(({ mesh, mat, packet, packetMat, chip, chipMat, node, phase }, idx) => {
        const target = node.group.position;
        beamDir.copy(target).sub(beamOrigin);
        const channelLength = beamDir.length();
        mesh.position.copy(beamOrigin);
        mesh.scale.set(1, channelLength, 1);
        mesh.quaternion.setFromUnitVectors(beamUp, beamDir.normalize());
        const isActive = st.activeStep === idx;
        mat.opacity = isActive ? 0.22 : 0.07;
        const t = (elapsed * (isActive ? 0.5 : 0.3) + phase) % 1;
        packet.position.copy(beamOrigin).lerp(target, t);
        packetMat.opacity = Math.sin(t * Math.PI) * (isActive ? 1 : 0.7);
        const chipT = (t + 0.5) % 1;
        chip.position.copy(beamOrigin).lerp(target, chipT);
        chipMat.opacity = Math.sin(chipT * Math.PI) * (isActive ? 0.95 : 0.6);
      });

      // Beam pulses ride the active dispatch beam
      if (activeNode) {
        beamPulses.forEach(({ pulse, mat, phase }) => {
          const t = (elapsed * 0.65 + phase) % 1;
          pulse.position.copy(beamOrigin).lerp(activeNode.group.position, t);
          mat.opacity = Math.sin(t * Math.PI) * 0.95;
          const scale = 0.8 + Math.sin(t * Math.PI) * 0.5;
          pulse.scale.setScalar(scale);
        });
      }

      if (qualityLevel === 0) composer.render();
      else renderer.render(scene, camera);

      if (stateRef.current.isPlaying || stateRef.current.isDragging) scheduleFrame();
    };

    scheduleFrame = () => {
      if (animationFrameId === null) animationFrameId = window.requestAnimationFrame(animate);
    };
    requestRenderRef.current = scheduleFrame;
    scheduleFrame();

    const onMotionPreferenceChange = (event: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = event.matches;
      stateRef.current.isPlaying = requestedPlayingRef.current && !event.matches;
      if (event.matches && animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      scheduleFrame();
    };
    motionPreference.addEventListener("change", onMotionPreferenceChange);

    return () => {
      requestRenderRef.current = () => undefined;
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      motionPreference.removeEventListener("change", onMotionPreferenceChange);
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
      composer.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="solar-3d-stage" ref={containerRef} aria-label="3D 太阳系引力场与交付轨道">
      <div aria-hidden="true" className="solar-3d-sun-tag" ref={sunTagRef} style={{ visibility: "hidden" }}>
        <span>GOAL · 原始需求</span>
      </div>

      {orbitalWork.length >= 4
        ? ORBIT_LINKS.map((link, index) => (
            <div
              aria-hidden="true"
              className="solar-3d-link-label"
              key={`${link.from}-${link.to}`}
              ref={(el) => { linkLabelRefs.current[index] = el; }}
            >
              <span><i style={{ backgroundColor: orbitalWork[link.to]?.color }} />{link.label}</span>
            </div>
          ))
        : null}

      {orbitalWork.map((p, idx) => (
        <span
          aria-hidden="true"
          className="solar-3d-planet-origin"
          data-planet-origin={p.id}
          key={`${p.id}-origin`}
          ref={(el) => { planetOriginRefs.current[idx] = el; }}
        />
      ))}
      {orbitalWork.map((p, idx) => (
        <button
          className="solar-3d-planet-tag"
          data-active={activeStep === idx}
          key={p.id}
          onClick={() => onSelectStep(idx)}
          ref={(el) => { planetTagRefs.current[idx] = el; }}
          style={{ "--planet-color": p.color, visibility: "hidden" } as React.CSSProperties}
          type="button"
        >
          <i style={{ backgroundColor: p.color }} />
          <span>{p.name}</span>
        </button>
      ))}
    </div>
  );
}
