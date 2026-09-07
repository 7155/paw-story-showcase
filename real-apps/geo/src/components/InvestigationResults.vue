<template>
  <div class="investigation-results">
    <section class="result-status" aria-live="polite">
      <div :class="['result-status-line', { working: pending }]">
        <LoaderCircle v-if="pending" :size="17" class="spin" />
        <Check v-else-if="job?.state === 'completed'" :size="17" />
        <AlertCircle v-else-if="job?.state === 'failed' || job?.state === 'blocked_auth'" :size="17" />
        <Clock3 v-else :size="17" />
        <strong>{{ job ? statusLabel(job.state) : t('Ready for investigation') }}</strong>
        <span v-if="job">{{ job.mode === 'live' ? t('Earth Engine calculation') : t('Dry-run record') }}</span>
      </div>
      <p v-if="pending">{{ t('The calculation is still running. Results appear after the service confirms completion.') }}</p>
      <p v-else-if="job?.error">{{ job.error }}</p>
      <p v-else-if="job?.mode === 'dry_run'">{{ t('This record verifies the workflow. It does not contain satellite measurements.') }}</p>
    </section>

    <section v-if="story?.findings.length" class="result-findings"><h2>{{ t('Findings') }}</h2><article v-for="finding in story.findings" :key="finding.hypothesisId"><strong>{{ statusLabel(finding.status) }}</strong><p v-for="evidence in finding.evidence" :key="evidence">{{ evidence }}</p></article></section>

    <section class="observation-section">
      <div class="result-section-heading"><h2>{{ t('Annual observations') }}</h2><span>{{ metric.toUpperCase() }}</span></div>
      <div v-if="loading" class="result-loading" role="status"><span></span><span></span><p>{{ t('Reading calculation results…') }}</p></div>
      <p v-else-if="loadError" class="result-load-error" role="alert">{{ loadError }} <button @click="loadMetrics">{{ t('Retry') }}</button></p>
      <template v-else-if="rows.length && measurementJob">
        <table class="observation-table"><thead><tr><th>{{ t('Year') }}</th><th>{{ metric.toUpperCase() }}</th><th>{{ t('Images') }}</th><th>{{ t('Valid coverage') }}</th></tr></thead><tbody>
          <tr v-for="row in rows" :key="`${row.datasetId}:${row.year}`"><th scope="row">{{ row.year }}</th><td>{{ row.value === null ? t('No measurement') : row.value.toFixed(4) }}</td><td>{{ row.imageCount ?? '—' }}</td><td>{{ row.validPixelFraction === null ? '—' : `${(row.validPixelFraction * 100).toFixed(1)}%` }}</td></tr>
        </tbody></table>
        <p v-if="change !== null" class="observation-change"><span>{{ t('Change between first and last year') }}</span><strong>{{ change > 0 ? '+' : '' }}{{ change.toFixed(4) }}</strong></p>
        <p v-if="metric.toLowerCase() === 'ndvi'" class="result-caveat">{{ t('NDVI describes a vegetation signal. A change alone does not establish restoration success or its cause.') }}</p>
        <p v-if="rows.some(row => row.imageCount === null || row.validPixelFraction === null)" class="result-coverage">{{ t('Some observations lack image counts or valid-pixel coverage. Missing diagnostics are not zero.') }}</p>
        <details v-else class="quality-method"><summary>{{ t('How coverage is measured') }}</summary><p>{{ t('Images counts collection items intersecting this area and period, before pixel masking. Coverage is the fraction of AOI grid cells with a valid final metric after masking and composition; it is not the clear-sky share of every image.') }}</p><p v-for="row in rows" :key="row.year">{{ row.year }} · {{ row.validPixelCount?.toLocaleString(locale) }} / {{ row.totalPixelCount?.toLocaleString(locale) }} {{ t('grid cells') }} · {{ row.scaleMeters }} m · {{ row.crs }}</p></details>
      </template>
      <p v-else class="result-empty">{{ t('No annual measurements are available for this layer and run. Existing files remain available below.') }}</p>
    </section>

    <section class="result-scope">
      <h2>{{ t('Observation scope') }}</h2>
      <dl><div><dt>{{ t('Region') }}</dt><dd>{{ plan.spec.region.name || plan.spec.investigationId }}</dd></div>
        <div><dt>{{ t('Time window') }}</dt><dd>{{ plan.spec.period.startYear }}–{{ plan.spec.period.endYear }}<span v-if="plan.spec.period.startMonth"> · {{ plan.spec.period.startMonth }}–{{ plan.spec.period.endMonth || 12 }} {{ t('months') }}</span></dd></div>
        <div><dt>{{ t('Spatial resolution') }}</dt><dd>{{ dataset?.dataset.scaleMeters }} m</dd></div>
        <div><dt>{{ t('Dataset') }}</dt><dd>{{ dataset?.dataset.title || '—' }}</dd></div></dl>
    </section>

    <section class="result-downloads">
      <div class="result-section-heading"><h2>{{ t('Deliverables') }}</h2><span>{{ files.length }}</span></div>
      <a v-for="artifact in files" :key="`${artifact.jobId}:${artifact.name}`" :href="api.artifactUrl(artifact.jobId, artifact.name)" target="_blank" rel="noopener" download>
        <FileText :size="18" /><span><strong>{{ artifactLabel(artifact.name) }}</strong><small>{{ artifact.name }} · {{ formatBytes(artifact.size) }}</small></span><Download :size="16" />
      </a>
      <p v-if="!files.length" class="result-empty">{{ t('Completed files will appear here.') }}</p>
    </section>
    <details class="result-method-notes"><summary>{{ t('Interpretation notes') }}</summary><ul><li v-for="note in notes" :key="note">{{ note }}</li></ul></details>
    <p v-if="job" class="result-receipt">{{ t('Run') }} <code>{{ job.jobId }}</code><br>{{ new Date(job.updatedAt).toLocaleString(locale) }}</p>
    <p v-if="measurementJob && measurementJob.jobId !== job?.jobId" class="result-receipt">{{ t('Annual statistics source run') }} <code>{{ measurementJob.jobId }}</code></p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { AlertCircle, Check, Clock3, Download, FileText, LoaderCircle } from "lucide-vue-next";
import { api } from "../api";
import { useI18n } from "../i18n";
import { annualObservations, observedChange, selectAnnualResultJob, referencedLayerArtifacts } from "../resultSummary";
import type { EarthJob, EarthStory, InvestigationPlan, JobArtifact } from "../types";

const props = defineProps<{ plan: InvestigationPlan; job?: EarthJob; jobs: EarthJob[]; artifacts: JobArtifact[]; selectedRole: string; story?: EarthStory }>();
const { t, statusLabel, locale } = useI18n();
const dataset = computed(() => props.plan.datasets.find(item => item.role === props.selectedRole));
const metric = computed(() => dataset.value?.dataset.analysis.outputName || "");
const pending = computed(() => props.job && ["queued", "running"].includes(props.job.state));
const raw = ref<unknown>(); const loading = ref(false); const loadError = ref(""); let revision = 0;
const measurementJob = computed(() => selectAnnualResultJob(props.jobs, props.job, props.plan.planId));
const measurementArtifacts = ref<JobArtifact[]>([]);
const linkedArtifacts = ref<Array<JobArtifact & { jobId: string }>>([]);
const layerFiles = computed(() => referencedLayerArtifacts(props.jobs, props.story?.layers || [], props.plan.planId));
let linkedRevision = 0;
const files = computed(() => [
  ...(props.job ? props.artifacts.map(file => ({ ...file, jobId: props.job!.jobId })) : []),
  ...(measurementJob.value && measurementJob.value.jobId !== props.job?.jobId ? measurementArtifacts.value.map(file => ({ ...file, jobId: measurementJob.value!.jobId })) : []),
  ...linkedArtifacts.value,
].filter((file, index, all) => !["job.json", "request.json", "response.json"].includes(file.name) && all.findIndex(other => other.jobId === file.jobId && other.name === file.name) === index));
const rows = computed(() => annualObservations(raw.value, props.selectedRole, metric.value, dataset.value?.dataset.datasetId || ""));
const change = computed(() => observedChange(rows.value));
const notes = computed(() => [...new Set([...props.plan.spec.confounders, ...(dataset.value?.dataset.limitations || []), ...(props.story?.uncertainties || [])])]);
async function loadMetrics() {
  const current = ++revision; raw.value = undefined; measurementArtifacts.value = []; loadError.value = ""; loading.value = false;
  const job = measurementJob.value;
  if (!job) return;
  loading.value = true;
  try {
    const artifacts = await api.artifacts(job.jobId);
    if (current !== revision) return;
    measurementArtifacts.value = artifacts;
    if (!artifacts.some(file => file.name === "yearly_metrics.json")) return;
    const value = await api.artifactJson(job.jobId, "yearly_metrics.json"); if (current === revision) raw.value = value;
  }
  catch (error) { if (current === revision) loadError.value = error instanceof Error ? error.message : String(error); }
  finally { if (current === revision) loading.value = false; }
}
function artifactLabel(name: string) { return t(({ "yearly_metrics.json": "Annual statistics", "execution_manifest.json": "Calculation record", "impact_assessment.json": "Impact assessment", "yearly_metrics.csv": "Annual statistics CSV" } as Record<string, string>)[name] || name); }
function formatBytes(value: number) { return value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} MB` : value >= 1024 ? `${(value / 1024).toFixed(1)} KB` : `${value} B`; }
watch([() => measurementJob.value?.jobId, () => measurementJob.value?.updatedAt], () => void loadMetrics(), { immediate: true });
watch(layerFiles, async refs => {
  const current = ++linkedRevision; linkedArtifacts.value = [];
  const results = await Promise.allSettled([...new Set(refs.map(ref => ref.jobId))].map(async jobId => {
    const artifacts = await api.artifacts(jobId);
    return artifacts.filter(file => refs.some(ref => ref.jobId === jobId && ref.name === file.name)).map(file => ({ ...file, jobId }));
  }));
  if (current === linkedRevision) linkedArtifacts.value = results.flatMap(result => result.status === "fulfilled" ? result.value : []);
}, { immediate: true });
</script>
