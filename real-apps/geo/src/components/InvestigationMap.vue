<template>
  <div class="map-shell" :data-map-mode="mapMode" :data-control-source="followPi ? 'pi' : 'local'">
    <div ref="map2dContainer" :class="['map-surface', 'maplibre-surface', { active: mapMode === '2d' }]" :aria-hidden="mapMode !== '2d'"></div>
    <div
      ref="globe3dContainer"
      :class="['map-surface', 'cesium-surface', { active: mapMode === '3d' }]"
      :aria-hidden="mapMode !== '3d'"
      :data-ready="globeReady"
      :data-render-count="globeRenderCount"
      :data-region-features="globeRegionFeatureCount"
      :data-analysis-layer="globeHasAnalysisLayer"
      :data-terrain-state="terrainState"
      :data-terrain-provider="terrainProviderId"
      :data-buildings-state="buildingsState"
      :data-buildings-provider="buildingsProviderId"
    ></div>

    <div class="map-overlay map-title">

      <span>{{ regionName }}</span>
      <strong>{{ periodLabel }}</strong>
      <small v-if="visualizationLoading">{{ t('Loading Earth Engine layer') }}</small>
      <small v-else-if="visualizationError" class="layer-error">{{ visualizationError }}</small>
      <small v-else-if="visualization">{{ t('Live tile') }} · {{ visualization.outputName }}</small>
    </div>

    <div class="map-mode" role="group" :aria-label="t('Switch map view')">
      <button :class="{ active: mapMode === '2d' }" :aria-pressed="mapMode === '2d'" :title="t('2D map')" @click="selectMapMode('2d')">
        <MapIcon :size="15" /><span>2D</span>
      </button>
      <button :class="{ active: mapMode === '3d' }" :aria-pressed="mapMode === '3d'" :title="t('3D globe')" @click="selectMapMode('3d')">
        <Globe2 :size="15" /><span>3D</span>
      </button>
    </div>

    <div v-if="mapMode === '3d'" class="scene-statuses">
      <div class="terrain-status" :class="terrainState" :title="terrainNotice || terrainLabel">
        <LoaderCircle v-if="terrainState === 'loading'" class="spin" :size="13" />
        <Mountain v-else :size="13" />
        <span>{{ terrainState === 'ready' ? t('3D terrain') : terrainState === 'fallback' ? t('Ellipsoid fallback') : t('Loading terrain') }}</span>
      </div>
      <div v-if="hasIonToken && buildingsRequested" class="buildings-status" :class="buildingsState" :title="buildingsNotice || t('OSM 3D buildings')">
        <LoaderCircle v-if="buildingsState === 'loading'" class="spin" :size="13" />
        <Building2 v-else :size="13" />
        <span>{{ buildingsState === 'ready' ? t('OSM 3D buildings') : buildingsState === 'failed' ? t('Buildings unavailable') : t('Loading buildings') }}</span>
      </div>
    </div>

    <button v-if="canFollowPi" :class="['map-follow', { active: followPi }]" :title="followPi ? t('Following Pi spatial focus') : t('Resume following Pi')" @click="emit('toggleFollow')">
      <Crosshair :size="14" /><span>{{ followPi ? t('Pi controls view') : t('Local inspection') }}</span>
    </button>

    <div v-if="mapMode === '3d' && (globeLoading || globeError)" :class="['map-overlay', 'globe-status', { error: globeError }]" role="status">
      <LoaderCircle v-if="globeLoading" class="spin" :size="16" />
      <span>{{ globeError ? t('3D view unavailable') : t('Loading 3D globe') }}</span>
      <small v-if="globeError">{{ globeError }}</small>
    </div>

    <div class="map-overlay map-legend">
      <span><i class="swatch boundary"></i>{{ t('Investigation area') }}</span>
      <button v-for="item in plan?.datasets || []" :key="item.role" :class="{ active: item.role === selectedRole }" @click="$emit('selectRole', item.role)">
        <i v-if="item.role === selectedRole && visualization" class="swatch ramp" :style="{ background: `linear-gradient(90deg, ${visualization.legend.palette.map((color) => `#${color}`).join(', ')})` }"></i>
        <i v-else class="swatch dataset"></i>{{ roleLabel(item.role) }}
      </button>
      <div v-if="visualization" class="legend-range"><code>{{ visualization.legend.min }}</code><span></span><code>{{ visualization.legend.max }}</code></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import "cesium/Build/Cesium/Widgets/widgets.css";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { Building2, Crosshair, Globe2, LoaderCircle, Map as MapIcon, Mountain } from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "../i18n";
import { loadMapViewMode, regionBounds, regionFeatureCollection, saveMapViewMode, type MapViewMode } from "../mapRuntime";
import type { EarthVisualization, InvestigationPlan } from "../types";

type CesiumModule = typeof import("cesium");
type CesiumViewer = import("cesium").Viewer;
type CesiumRegionSource = import("cesium").GeoJsonDataSource;
type CesiumImageryLayer = import("cesium").ImageryLayer;
type CesiumTileset = import("cesium").Cesium3DTileset;

const props = defineProps<{ plan?: InvestigationPlan; selectedYear?: number; selectedRole?: string; visualization?: EarthVisualization; visualizationLoading?: boolean; visualizationError?: string; requestedMode?: MapViewMode; followPi?: boolean; canFollowPi?: boolean }>();
const emit = defineEmits<{ selectRole: [role: string]; modeChange: [mode: MapViewMode]; toggleFollow: [] }>();
const { t, roleLabel } = useI18n();

const map2dContainer = ref<HTMLElement>();
const globe3dContainer = ref<HTMLElement>();
const mapMode = ref<MapViewMode>(props.requestedMode ?? loadMapViewMode(typeof window === "undefined" ? undefined : window.localStorage));
const globeLoading = ref(false);
const globeError = ref("");
const globeReady = ref(false);
const globeRenderCount = ref(0);
const globeRegionFeatureCount = ref(0);
const globeHasAnalysisLayer = ref(false);
const terrainState = ref<"idle" | "loading" | "ready" | "fallback">("idle");
const terrainProviderId = ref("none");
const terrainLabel = ref("");
const terrainNotice = ref("");
const buildingsState = ref<"disabled" | "loading" | "ready" | "failed">("disabled");
const buildingsProviderId = ref("none");
const buildingsNotice = ref("");

let map: MapLibreMap | undefined;
let cesium: CesiumModule | undefined;
let viewer: CesiumViewer | undefined;
let cesiumRegionSource: CesiumRegionSource | undefined;
let cesiumAnalysisLayer: CesiumImageryLayer | undefined;
let cesiumBuildings: CesiumTileset | undefined;
let removePostRenderListener: (() => void) | undefined;
let resizeObserver: ResizeObserver | undefined;
let regionSyncPending = false;
let visualizationSyncPending = false;
let cesiumRegionRevision = 0;
let cesiumInitRevision = 0;
let disposed = false;

const defaultTerrainUrl = "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer";
const ionToken = String(import.meta.env.VITE_CESIUM_ION_TOKEN || "").trim();
const hasIonToken = ionToken.length > 0;
const buildingsRequested = String(import.meta.env.VITE_CESIUM_ION_BUILDINGS || "osm").toLowerCase() === "osm";

const regionName = computed(() => props.plan?.spec.region.name || t("No region selected"));
const periodLabel = computed(() => props.visualization ? `${props.visualization.year} · ${props.visualization.datasetId}` : props.plan ? `${props.plan.spec.period.startYear}-${props.plan.spec.period.endYear}` : "-");

function syncMapRegion() {
  if (!map || !map.isStyleLoaded() || !map.getSource("investigation")) {
    regionSyncPending = true;
    return;
  }
  regionSyncPending = false;
  map.resize();
  const source = map.getSource("investigation") as GeoJSONSource | undefined;
  source?.setData(regionFeatureCollection(props.plan?.spec.region));
  const bounds = regionBounds(props.plan?.spec.region);
  if (bounds) {
    map.fitBounds(new maplibregl.LngLatBounds([bounds[0], bounds[1]], [bounds[2], bounds[3]]), { padding: 72, duration: 0, maxZoom: 12 });
  }
}

function syncMapVisualization() {
  if (!map || !map.isStyleLoaded()) {
    visualizationSyncPending = true;
    return;
  }
  visualizationSyncPending = false;
  if (map.getLayer("earth-analysis")) map.removeLayer("earth-analysis");
  if (map.getSource("earth-analysis")) map.removeSource("earth-analysis");
  if (!props.visualization?.tileUrl) return;
  map.addSource("earth-analysis", { type: "raster", tiles: [props.visualization.tileUrl], tileSize: 256 });
  map.addLayer({ id: "earth-analysis", type: "raster", source: "earth-analysis", paint: { "raster-opacity": 0.72, "raster-resampling": "linear" } }, map.getLayer("investigation-fill") ? "investigation-fill" : undefined);
}

function cesiumRectangle() {
  if (!cesium) return undefined;
  const bounds = regionBounds(props.plan?.spec.region);
  return bounds ? cesium.Rectangle.fromDegrees(bounds[0], bounds[1], bounds[2], bounds[3]) : undefined;
}

function focusCesiumRegion() {
  if (!viewer || !cesium) return;
  const bounds = regionBounds(props.plan?.spec.region);
  if (!bounds) return;
  const [west, south, east, north] = bounds;
  const center = cesium.Cartesian3.fromDegrees((west + east) / 2, (south + north) / 2);
  const diagonal = cesium.Cartesian3.distance(
    cesium.Cartesian3.fromDegrees(west, south),
    cesium.Cartesian3.fromDegrees(east, north),
  );
  viewer.camera.lookAt(
    center,
    new cesium.HeadingPitchRange(
      cesium.Math.toRadians(18),
      cesium.Math.toRadians(-48),
      Math.max(diagonal * 1.65, 2_500),
    ),
  );
  viewer.camera.lookAtTransform(cesium.Matrix4.IDENTITY);
}

async function resolveTerrainProvider(module: CesiumModule) {
  terrainState.value = "loading";
  terrainNotice.value = "";
  const customUrl = String(import.meta.env.VITE_CESIUM_TERRAIN_URL || "").trim();
  if (customUrl) {
    try {
      const provider = await module.CesiumTerrainProvider.fromUrl(customUrl);
      terrainProviderId.value = "custom-cesium-terrain";
      terrainLabel.value = t("Custom terrain");
      terrainState.value = "ready";
      return provider;
    } catch (error) {
      terrainNotice.value = safeCesiumError(error);
    }
  }
  if (hasIonToken) {
    try {
      module.Ion.defaultAccessToken = ionToken;
      const provider = await module.createWorldTerrainAsync({ requestVertexNormals: true, requestWaterMask: true });
      terrainProviderId.value = "cesium-world-terrain";
      terrainLabel.value = "Cesium World Terrain";
      terrainState.value = "ready";
      return provider;
    } catch (error) {
      terrainNotice.value = safeCesiumError(error);
    }
  }
  try {
    const provider = await module.ArcGISTiledElevationTerrainProvider.fromUrl(defaultTerrainUrl);
    terrainProviderId.value = "arcgis-world-elevation-3d";
    terrainLabel.value = "ArcGIS WorldElevation3D";
    terrainState.value = "ready";
    return provider;
  } catch (error) {
    terrainProviderId.value = "ellipsoid-fallback";
    terrainLabel.value = t("Ellipsoid fallback");
    terrainNotice.value = safeCesiumError(error);
    terrainState.value = "fallback";
    return new module.EllipsoidTerrainProvider();
  }
}

function safeCesiumError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const redacted = ionToken ? message.replaceAll(ionToken, "[redacted]") : message;
  return redacted.replace(/access_token=[^&\s]+/gi, "access_token=[redacted]");
}

async function loadIonBuildings(module: CesiumModule) {
  if (!viewer || !hasIonToken || !buildingsRequested) return;
  buildingsState.value = "loading";
  buildingsProviderId.value = "cesium-osm-buildings";
  buildingsNotice.value = "";
  try {
    module.Ion.defaultAccessToken = ionToken;
    const tileset = await module.createOsmBuildingsAsync({ enableShowOutline: false, showOutline: false });
    if (disposed || !viewer || viewer.isDestroyed()) return;
    cesiumBuildings = viewer.scene.primitives.add(tileset);
    buildingsState.value = "ready";
    viewer.scene.requestRender();
  } catch (error) {
    buildingsState.value = "failed";
    buildingsNotice.value = safeCesiumError(error);
  }
}

async function syncCesiumRegion() {
  if (!viewer || !cesium) return;
  const revision = ++cesiumRegionRevision;
  if (cesiumRegionSource) {
    viewer.dataSources.remove(cesiumRegionSource, true);
    cesiumRegionSource = undefined;
  }

  const collection = regionFeatureCollection(props.plan?.spec.region);
  globeRegionFeatureCount.value = collection.features.length;
  if (!collection.features.length) {
    viewer.scene.requestRender();
    return;
  }

  const source = await cesium.GeoJsonDataSource.load(collection, {
    stroke: cesium.Color.fromCssColorString("#14563a"),
    fill: cesium.Color.fromCssColorString("#2f7d59").withAlpha(0.2),
    strokeWidth: 2.5,
    clampToGround: false,
  });
  if (disposed || revision !== cesiumRegionRevision || !viewer || viewer.isDestroyed()) return;
  cesiumRegionSource = source;
  await viewer.dataSources.add(source);
  focusCesiumRegion();
  viewer.scene.requestRender();
}

function syncCesiumVisualization() {
  if (!viewer || !cesium) return;
  if (cesiumAnalysisLayer) {
    viewer.imageryLayers.remove(cesiumAnalysisLayer, true);
    cesiumAnalysisLayer = undefined;
  }
  globeHasAnalysisLayer.value = false;
  if (!props.visualization?.tileUrl) {
    viewer.scene.requestRender();
    return;
  }

  const provider = new cesium.UrlTemplateImageryProvider({
    url: props.visualization.tileUrl,
    rectangle: cesiumRectangle(),
    tileWidth: 256,
    tileHeight: 256,
    credit: "Google Earth Engine",
  });
  cesiumAnalysisLayer = new cesium.ImageryLayer(provider, { alpha: 0.72 });
  viewer.imageryLayers.add(cesiumAnalysisLayer);
  globeHasAnalysisLayer.value = true;
  viewer.scene.requestRender();
}

async function ensureCesium() {
  if (viewer || globeLoading.value || !globe3dContainer.value) return;
  const revision = ++cesiumInitRevision;
  globeLoading.value = true;
  globeError.value = "";
  try {
    const module = await import("cesium");
    if (disposed || revision !== cesiumInitRevision || !globe3dContainer.value) return;
    cesium = module;
    const terrainProvider = await resolveTerrainProvider(module);
    if (disposed || revision !== cesiumInitRevision || !globe3dContainer.value) return;
    viewer = new module.Viewer(globe3dContainer.value, {
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      baseLayer: new module.ImageryLayer(new module.OpenStreetMapImageryProvider({ url: "https://tile.openstreetmap.org/", maximumLevel: 19 })),
      terrainProvider,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      scene3DOnly: true,
      requestRenderMode: true,
      maximumRenderTimeChange: Number.POSITIVE_INFINITY,
      shouldAnimate: false,
      skyBox: false,
      skyAtmosphere: false,
    });
    viewer.scene.backgroundColor = module.Color.fromCssColorString("#dce7e1");
    viewer.scene.globe.baseColor = module.Color.fromCssColorString("#d9dfdc");
    viewer.scene.globe.depthTestAgainstTerrain = terrainState.value === "ready";
    viewer.scene.fog.enabled = false;
    removePostRenderListener = viewer.scene.postRender.addEventListener(() => {
      globeRenderCount.value += 1;
      if (globeRenderCount.value >= 2) {
        globeReady.value = true;
        removePostRenderListener?.();
        removePostRenderListener = undefined;
      }
    });
    await loadIonBuildings(module);
    await syncCesiumRegion();
    syncCesiumVisualization();
    await nextTick();
    viewer.resize();
    viewer.scene.requestRender();
  } catch (error) {
    globeError.value = error instanceof Error ? error.message : String(error);
  } finally {
    if (revision === cesiumInitRevision) globeLoading.value = false;
  }
}

async function setMapMode(mode: MapViewMode) {
  mapMode.value = mode;
  saveMapViewMode(mode, typeof window === "undefined" ? undefined : window.localStorage);
  await nextTick();
  if (mode === "3d") {
    await ensureCesium();
    viewer?.resize();
    viewer?.scene.requestRender();
  } else {
    map?.resize();
  }
}

async function selectMapMode(mode: MapViewMode) {
  await setMapMode(mode);
  emit("modeChange", mode);
}

onMounted(() => {
  const initialBounds = regionBounds(props.plan?.spec.region);
  map = new maplibregl.Map({
    container: map2dContainer.value!,
    ...(initialBounds
      ? {
          bounds: new maplibregl.LngLatBounds([initialBounds[0], initialBounds[1]], [initialBounds[2], initialBounds[3]]),
          fitBoundsOptions: { padding: 72, maxZoom: 12 },
        }
      : { center: [110, 30] as [number, number], zoom: 3.2 }),
    attributionControl: false,
    style: {
      version: 8,
      sources: {
        osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 19, attribution: "OpenStreetMap" },
      },
      layers: [
        { id: "base", type: "raster", source: "osm", paint: { "raster-saturation": -0.55, "raster-contrast": 0.08, "raster-brightness-max": 0.94 } },
      ],
    },
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");
  map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
  map.on("load", () => {
    map!.addSource("investigation", { type: "geojson", data: regionFeatureCollection(props.plan?.spec.region) });
    map!.addLayer({ id: "investigation-fill", type: "fill", source: "investigation", paint: { "fill-color": "#2f7d59", "fill-opacity": 0.2 } });
    map!.addLayer({ id: "investigation-line", type: "line", source: "investigation", paint: { "line-color": "#14563a", "line-width": 2.5, "line-dasharray": [2, 1] } });
    syncMapVisualization();
    requestAnimationFrame(() => requestAnimationFrame(syncMapRegion));
  });
  map.on("idle", () => {
    if (regionSyncPending) syncMapRegion();
    if (visualizationSyncPending) syncMapVisualization();
  });
  resizeObserver = new ResizeObserver(() => {
    map?.resize();
    viewer?.resize();
    viewer?.scene.requestRender();
  });
  resizeObserver.observe(map2dContainer.value!);
  if (mapMode.value === "3d") void ensureCesium();
});

watch(() => props.plan?.planId, () => {
  syncMapRegion();
  void syncCesiumRegion();
});
watch(() => props.visualization?.tileUrl, () => {
  syncMapVisualization();
  syncCesiumVisualization();
});
watch(() => props.requestedMode, (mode) => {
  if (mode && mode !== mapMode.value) void setMapMode(mode);
});

onBeforeUnmount(() => {
  disposed = true;
  cesiumInitRevision += 1;
  cesiumRegionRevision += 1;
  removePostRenderListener?.();
  resizeObserver?.disconnect();
  map?.remove();
  if (viewer && !viewer.isDestroyed()) viewer.destroy();
  cesiumBuildings = undefined;
});
</script>

<style scoped>
.map-shell { position: relative; width: 100%; height: 100%; min-height: 300px; overflow: hidden; background: #e7ebe3; container-type: inline-size; }
.map-surface { position: absolute; inset: 0; width: 100%; height: 100%; visibility: hidden; pointer-events: none; }.map-surface.active { visibility: visible; pointer-events: auto; }
.map-overlay { position: absolute; z-index: 4; background: #fffffff2; border-radius: 10px; box-shadow: 0 4px 16px rgb(28 51 35 / 12%); }
.map-title { top: 18px; left: 18px; max-width: calc(100% - 152px); padding: 12px 14px; display: grid; gap: 5px; pointer-events: none; }.map-title > span { font-size: 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.map-title strong { color: #627061; font-size: 10px; font-weight: 450; }.map-title small { color: #366750; font-size: 10px; line-height: 1.5; }.map-title .layer-error { color: #913c3c; max-width: 250px; }
.map-mode { position: absolute; top: 18px; right: 18px; z-index: 5; display: flex; padding: 4px; border-radius: 9px; background: #fffffff2; box-shadow: 0 4px 16px rgb(28 51 35 / 12%); }.map-mode button { display: flex; align-items: center; justify-content: center; gap: 5px; padding: 9px; border: 0; border-radius: 6px; background: transparent; color: #607267; font-size: 11px; }.map-mode button.active { background: #286249; color: white; }.map-mode button:hover:not(.active) { background: #e7efe6; }
.map-legend { bottom: 24px; left: 18px; display: grid; gap: 8px; min-width: 140px; max-width: 220px; max-height: 180px; overflow: auto; padding: 12px; font-size: 11px; color: #415c4d; }.map-legend > span, .map-legend button { display: flex; align-items: center; gap: 8px; }.map-legend button { border: 0; padding: 5px 0; background: transparent; text-align: left; font-size: 11px; }.map-legend button.active { color: #165e41; font-weight: 650; }.swatch { width: 12px; height: 12px; flex-shrink: 0; }.boundary { border: 1px dashed #245b41; background: #e1ebde; }.dataset { border-radius: 50%; background: #a67b37; }.ramp { width: 64px; height: 8px; border-radius: 2px; }.legend-range { display: flex; align-items: center; justify-content: space-between; gap: 10px; color: #60715f; font-size: 10px; }.legend-range span { height: 1px; background: #cbd7c9; flex: 1; }
.map-follow { position: absolute; z-index: 5; top: 84px; right: 18px; display: flex; align-items: center; gap: 6px; border: 0; border-radius: 8px; padding: 9px; background: #fffffff2; box-shadow: 0 4px 16px rgb(28 51 35 / 12%); color: #566e5c; font-size: 10px; }.map-follow.active { color: #215c43; }
.scene-statuses { position: absolute; z-index: 5; top: 110px; left: 18px; display: grid; gap: 6px; max-width: calc(100% - 36px); }.terrain-status, .buildings-status { display: flex; align-items: center; gap: 6px; width: fit-content; padding: 6px 8px; border-radius: 6px; background: #fffffff2; color: #536c59; font-size: 10px; }.terrain-status.fallback, .buildings-status.failed { color: #8d6529; }
.globe-status { bottom: 28px; left: 50%; display: flex; align-items: center; gap: 8px; max-width: calc(100% - 36px); padding: 12px; transform: translateX(-50%); font-size: 12px; }.globe-status small { display: none; }.globe-status.error { color: #963c40; }
@container (max-width: 430px) { .map-title { top: 12px; left: 12px; padding: 10px; max-width: calc(100% - 124px); }.map-mode { top: 12px; right: 12px; }.map-mode button { padding: 8px 6px; }.map-mode svg { width: 13px; }.map-legend { bottom: 28px; left: 12px; min-width: 128px; padding: 10px; }.map-follow { right: 12px; top: 70px; max-width: 122px; }.map-follow span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } }
@media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
</style>
