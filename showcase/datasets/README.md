# Public demonstration data

`lab-samples.v1.json` supplies all four Lab imports and independent Apps. It
contains 127 records and 128 curated checks: RAG 32/33, EnterpriseOps 24/24,
CloudOps 24/24, and Memory 47/47 (records/checks). The files are deployment
inputs, not generated build output.

`memory-corpus.v1.json` supplies 44 additional input sources, eight native
Memory topics and 32 current atoms. The same statements appear in the Memory
App dataset. Topic -> atom -> input detail resolves to the same text.

Every row has an `origin` and `sourceId`. `public-design-summary` means a
manually rewritten summary of project rules: execution ownership, recovery,
input boundaries, source references, evaluation and delivery. Other rows are
explicitly synthetic, including all company identities, business policies,
observations and boundary-case inputs. No customer records, original personal
input, private conversations, keys or internal addresses were exported.

`sources.v1.json` records the selected source-document hashes and transformation.
The source files are provenance only; installation, builds and deployment read
these committed public files. No neighboring repository is required.

The checks exercise local rule branches and source retrieval. They are
candidate-aware development examples and do not establish model quality,
generalization, cloud diagnosis accuracy or real business-system write access.
Historical Agent experiment results remain in the separate public evidence
snapshot; these examples never overwrite its quality or cost metrics.
