# Curriculum Intelligence

Status: **foundation implemented** (Milestone 2). Sirius can install, list, remove, and offline-browse validated curriculum packs. AI practice, marking, and sync are not implemented.

## Purpose

Represent a national curriculum so Ethiopia (Grades 9–12) can be the first pack, without teaching the rest of the product to special-case one country.

Learning logic should depend on ids in this model. It should not branch on `country === "ET"`.

## Implemented

- Strongly typed model: education system, curriculum version, grade levels, streams, subjects, topics (with parent hierarchy), objectives, cognitive levels, prerequisites (DAG), source references, examination blueprints and topic weights.
- Zod schema + referential validation (unique ids, broken references, prerequisite cycles, blueprint weights summing to 1).
- Content hash (SHA-256 over stable JSON) on every pack.
- Portable `CurriculumPack` format with meta + content.
- IndexedDB `packs` object store (`SIRIUS_DB_VERSION = 2`). Profile and notes stores are untouched.
- Install / replace / skip / remove with duplicate and version handling.
- UI: Study nav item, pack catalog, install from labeled development fixtures, browse subjects → topics → objectives offline.
- Automated tests for schema, cycles, hashes, and install decisions.

## Development fixtures

The shipped packs (`fixture-et-g9-common`, `fixture-et-g11-natural`) are **development fixtures only**. They are clearly labeled in the UI and in pack meta (`isDevelopmentFixture: true`). They are **not** official Ministry of Education curriculum content. Official packs must cite traceable sources (textbook, syllabus, exam blueprint).

## Records

### Education system

`EducationSystem`: `id`, ISO country code, name, languages, default locale.

First fixture system: `ET-MOE`.

### Curriculum version

`CurriculumVersion`: `id`, `systemId`, label, `draft | active | retired`, `effectiveFrom`, `effectiveTo`.

An active version is treated as immutable in product rules; corrections produce a new version id / pack content hash.

### Grade levels and streams

`GradeLevel` and `Stream` rows. Ethiopia structure is expressed as data:

- Grades 9–10: general secondary, no stream required.
- Grades 11–12: preparatory, natural / social streams where applicable.

### Subjects, topics, objectives

Relationships use stable ids. Topics may nest via `parentId`. Objectives carry a cognitive level: `recall`, `understand`, `apply`, `analyze`.

### Prerequisites

Directed edges between objectives. Validated as acyclic within a pack.

### Source references

Citations attached to topics or objectives. Missing URLs do not block study.

### Examination blueprint

Optional `ExamBlueprint` + `BlueprintWeight` rows. Weights in one blueprint must sum to 1.

## Delivery

The distribution unit is a `CurriculumPack`: one curriculum version, one grade, and either one stream or common, plus a content hash.

Installed packs live in IndexedDB store `packs`. Raising `SIRIUS_DB_VERSION` created that store without deleting profile or notes.

## What is not implemented

Question generation, answer checking, misconception detection, adaptive revision, accounts, and sync remain future work. When built, they should store `curriculumVersionId` and `objectiveId` rather than free-text topic names.

## Code map

```text
src/lib/curriculum/types.ts      Model
src/lib/curriculum/schema.ts     Zod + referential validation
src/lib/curriculum/graph.ts      Prerequisite cycle detection
src/lib/curriculum/hash.ts       Stable stringify + SHA-256
src/lib/curriculum/pack.ts       Build, import, install decision
src/lib/curriculum/fixtures.ts   Labeled development fixtures
src/lib/offline/database.ts      packs store (v2)
src/features/curriculum/         Catalog and browse UI
```
