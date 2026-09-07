export interface AnnualObservation {
  year: number; value: number | null; datasetId: string;
  imageCount: number | null; validPixelCount: number | null; totalPixelCount: number | null;
  validPixelFraction: number | null; scaleMeters: number | null; crs: string | null;
}

export function selectAnnualResultJob<T extends { jobId: string; planId: string; mode: string; state: string; result?: Record<string, unknown> }>(jobs: T[], selected: T | undefined, planId: string): T | undefined {
  const measured = (job: T) => job.planId === planId && job.mode === "live" && job.state === "completed" && typeof job.result?.metricsPath === "string";
  return selected && measured(selected) ? selected : jobs.find(measured);
}

/** A later statistics run must retain the completed map files cited by this story. */
export function referencedLayerArtifacts(jobs: Array<{ jobId: string; planId: string; mode: string; state: string }>, layers: Array<Record<string, unknown>>, planId: string): Array<{ jobId: string; name: string }> {
  const completed = new Set(jobs.filter(job => job.planId === planId && job.mode === "live" && job.state === "completed").map(job => job.jobId));
  const seen = new Set<string>();
  return layers.flatMap(layer => {
    if (typeof layer.jobId !== "string" || !completed.has(layer.jobId) || typeof layer.artifact !== "string") return [];
    const key = `${layer.jobId}:${layer.artifact}`;
    if (seen.has(key)) return [];
    seen.add(key); return [{ jobId: layer.jobId, name: layer.artifact }];
  });
}

/** Preserve missing observations; never coerce null measurements to zero. */
export function annualObservations(value: unknown, role: string, metric: string, datasetId: string): AnnualObservation[] {
  if (!value || typeof value !== "object") return [];
  const features = (value as { features?: unknown }).features;
  if (!Array.isArray(features)) return [];
  return features.flatMap((feature): AnnualObservation[] => {
    const row = feature?.properties;
    if (!row || row.role !== role || row.dataset_id !== datasetId || !Number.isInteger(row.year)) return [];
    const measurement = row[metric];
    const count = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
    const fraction = row.valid_pixel_fraction;
    return [{ year: row.year, value: typeof measurement === "number" && Number.isFinite(measurement) ? measurement : null, datasetId,
      imageCount: count(row.source_image_count), validPixelCount: count(row.valid_pixel_count), totalPixelCount: count(row.total_pixel_count),
      validPixelFraction: typeof fraction === "number" && Number.isFinite(fraction) && fraction >= 0 && fraction <= 1 ? fraction : null,
      scaleMeters: typeof row.analysis_scale_meters === "number" && row.analysis_scale_meters > 0 ? row.analysis_scale_meters : null,
      crs: typeof row.analysis_crs === "string" ? row.analysis_crs : null,
    }];
  }).sort((a, b) => a.year - b.year);
}

export function observedChange(rows: AnnualObservation[]): number | null {
  const first = rows[0]; const last = rows.at(-1);
  if (rows.length < 2 || !first || !last || first.year === last.year || first.value === null || last.value === null) return null;
  return last.value - first.value;
}
