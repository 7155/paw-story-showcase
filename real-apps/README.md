# Original application frontends and recorded results

These are source snapshots of existing applications, replacing the gallery's authored sample business UIs. They are historical, read-only views. No public adapter invokes a Provider, changes a database, or starts an Earth Engine job.

| App | Original frontend | Recorded data |
| --- | --- | --- |
| Songguo support | Standalone v11 App HTML | One completed consultation, original question, result and timestamps |
| Wix knowledge | Standalone v4 App HTML | One completed source retrieval and one failed answer request |
| EnterpriseRAG | `enterprise-rag-eval-lab/viewer` | 5,101 actual experiment input documents, 40 train/validation queries and aggregate results |
| Geo workbench | `scoutpi-workbench/apps/web` Vue frontend | v11 workspace seed: two plans, five jobs, original metrics, story, CSV and GeoTIFF artifacts |

EnterpriseRAG-Bench is a **synthetic enterprise benchmark**, not customer data. Its MIT license is retained in `enterprise-rag/DATA-LICENSE`. Validation gold and all held-out query content remain absent. One example macOS username path inside benchmark document `bb696d...7330.json` is normalized to `/Users/example/`; this does not alter experiment metrics. These metrics predate the display normalization.

Geo data is a completed historical export. The map displays the original public AOI and OpenStreetMap basemap, with the original 2D/3D controls. No authenticated satellite tile URL is published; absence of a satellite layer does not imply a fresh image or computation. Geo source is covered by its included Apache-2.0 license. The evidence graph was not included in the seed, so its public projection has zero nodes; the original story review is retained as a historical record, not a new review of that empty projection.

App HTML and the RAG viewer are PAW derivatives with the PAW GPL-3.0 license retained in `PAW-LICENSE`. Wix excerpts are source material already returned by the original knowledge App, with source titles and URLs retained; they are not represented as PAW-authored text. `provenance.json` files record original source identifiers and hashes. Only API adapters, static deployment paths, historical labels and a guided click script are changed. The guided pointer clicks existing controls and waits for rendered results.

Root `npm run setup && npm run build` installs and builds Geo from the included source and lockfile, then copies all four frontends into the site's static output. Original source repositories, private SQLite files, credentials and local services are not build dependencies.
