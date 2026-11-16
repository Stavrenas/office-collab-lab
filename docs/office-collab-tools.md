# Open-Source Office Engines: Developer Evaluation

**Candidates:** Collabora CODE, ONLYOFFICE Docs Community, Euro-Office  
**Research date:** 2026-11-16  
**Scope:** Self-hosted browser editing integrated into an existing or custom application. No Nextcloud dependency.  
**Status:** Research-backed evaluation plan—not a completed benchmark or production certification.

## Evaluation objective

Determine which editor can integrate with the application while satisfying document fidelity, collaboration, persistence, security, licensing and operational requirements.

These products provide editing engines. The application must supply document storage, user authorization and the integration layer; the included demonstrations are not substitutes for that application functionality. [cite:390][cite:134]

Evaluate the exact open-source artifacts selected for deployment, rather than attributing commercial-edition features to community packages.

## Scope and exclusions

**In scope**

- Browser-based document, spreadsheet and presentation editing.
- Embedding inside a custom application.
- Application-owned storage, identity and permissions.
- Concurrent editing and durable save behavior.
- Office-format compatibility and round-trip fidelity.
- Container deployment, observability and recovery.
- Open-source license and attribution requirements.

**Optional, requirement-dependent**

- PDF editing and forms.
- Mobile-browser editing.
- Conversion services.
- Plugins and macros.
- Multi-node operation.

**Out of scope**

- Nextcloud connectors or deployment.
- Replacing the application's file-management interface.
- Desktop-office replacement.
- Paid enterprise/developer functionality, unless documented as a potential migration path.

## Candidate overview

| Dimension | Collabora CODE | ONLYOFFICE Docs Community | Euro-Office |
|---|---|---|---|
| Main project | [Collabora Online](https://github.com/CollaboraOnline/online) | [DocumentServer](https://github.com/ONLYOFFICE/DocumentServer) | [DocumentServer](https://github.com/Euro-Office/DocumentServer) |
| Documentation | [Collabora SDK](https://sdk.collaboraonline.com/docs/introduction.html) | [Docs API](https://api.onlyoffice.com/docs/docs-api/get-started/) | [Euro-Office documentation](https://euro-office.github.io/documentation/) |
| Main license | MPL 2.0 for the online repository; inspect bundled components separately. [cite:389] | AGPLv3 with additional attribution, modification-notice and trademark-related terms. [cite:363] | AGPLv3; inspect attribution and component/asset licenses. [cite:420] |
| Primary evaluation integration | Application implements a WOPI host and embeds the editor. [cite:389] | Application initializes the JavaScript editor and implements document download/save callbacks. [cite:134][cite:350] | Begin with its integration example; validate the application's API contract against the pinned Euro-Office build. [cite:118][cite:420] |
| Primary implementation structure | Collabora Office core plus browser integration and server processing. [cite:70] | JavaScript editor SDK, web application, backend services and native conversion components. [cite:418] | JavaScript editor SDK, web application, Node.js services and native C++ components. [cite:420] |
| Documents, sheets, slides | Included. [cite:70] | Included. [cite:418] | Included. [cite:420] |
| Application-owned storage | Required integration responsibility. [cite:390] | Required when used independently of a document-management platform. [cite:134] | Requires a compatible storage/application backend. [cite:420] |
| Initial image | `collabora/code` | `onlyoffice/documentserver` | `ghcr.io/euro-office/documentserver` |
| Free-build positioning | Rolling development edition; vendor does not recommend CODE for production. [cite:70] | Community edition; assess its feature restrictions and self-support requirements. [cite:418] | Community builds intended for testing, evaluation and contribution. [cite:420] |

**License note:** Repository-level labels do not replace a review of the exact distributed artifact. Record licenses, bundled fonts, attribution files, UI notices and modification obligations before approving redistribution or customer-facing embedding.

### Version baselines

The following were observed during research. They are reference points, not instructions to deploy an outdated build:

| Candidate | Observed release | Release link |
|---|---|---|
| Collabora CODE | 26.04.6.1, released November 9, 2026. [cite:139] | [CODE release notes](https://www.collaboraonline.com/code-26-04-release-notes/) |
| ONLYOFFICE Docs | Public repository release v10.0.0, October 12, 2026 | [Release](https://github.com/ONLYOFFICE/DocumentServer/releases/tag/v10.0.0) |
| Euro-Office | v9.3.8, released November 13, 2026 | [Release](https://github.com/Euro-Office/DocumentServer/releases/tag/v9.3.8) |

Release versions, container tags and package build numbers are not interchangeable. Record the actual image digest, application version and source revision used.

## Restrictions and decision gates

| Topic | Collabora CODE | ONLYOFFICE Docs Community | Euro-Office |
|---|---|---|---|
| Historical concurrency restrictions | An upstream discussion documents unrestricted default mode and an optional Home Mode with 20 connections / 10 documents. Verify the selected image's configuration. [cite:342] | The old 20-connection restriction was removed starting with 9.4; do not use older comparisons as current evidence. [cite:363] | Do not assume unlimited capacity or repeat an unverified numeric limit. Inspect the selected build and test above expected concurrency. |
| Mobile browser | Include actual mobile-device testing; do not infer desktop parity. | Mobile web editors are excluded from Community in the upstream edition matrix. [cite:407][cite:418] | Mobile-editor work is present in current releases; verify editing and saving on the selected build. [cite:374] |
| Administration and clustering | Evaluate the basic deployment separately from the commercial COOL Controller path. [cite:156] | Upstream matrix excludes Admin Panel and clustering from Community. [cite:418] | Architecture includes AdminPanel and describes horizontal scaling; this is not proof of a tested HA deployment. [cite:420] |
| API compatibility | WOPI integration plus Collabora-specific capabilities. [cite:389][cite:394] | Versioned Docs API behavior. [cite:134] | Related architecture does not establish permanent drop-in compatibility with ONLYOFFICE. Test each required endpoint/event. |
| Production support | CODE is explicitly a development distribution. [cite:70] | Do not assume a vendor SLA for the community deployment. | Community and production-oriented distribution tracks are documented separately. [cite:420] |

### Security release gate

A vendor notice concerning the October 2026 Node.js security update stated that ONLYOFFICE Enterprise and Developer builds had been updated, while the Community update would follow later. This research did not establish whether the exact Community container selected by the team contains that fix. [cite:400]

Before exposing any candidate to real users or untrusted documents:

- Verify the selected artifact against current vendor advisories.
- Inspect embedded runtimes, not just OS-package scanner results.
- Record relevant vulnerabilities and remediation evidence.
- Use synthetic documents in an isolated lab until the security gate passes.
- Do not interpret a closed upstream issue as proof that every edition has received patched binaries.

Relevant links:

- [ONLYOFFICE vendor security notice](https://www.onlyoffice.com/blog/2026/10/onlyoffice-docs-patches-node-js-vulnerability)
- [ONLYOFFICE runtime issue and vendor response](https://github.com/ONLYOFFICE/DocumentServer/issues/3854)
- [Euro-Office security policy](https://github.com/Euro-Office/DocumentServer/blob/main/SECURITY.md)
- [Collabora release notes](https://www.collaboraonline.com/release-notes/)

## Suggested evaluation sequence

The following is a proposed work plan, not an estimate of production integration effort.

| Stage | Work | Exit condition |
|---|---|---|
| Preflight | Select artifacts, inspect licensing/security, prepare corpus | Candidate can enter the isolated lab |
| Smoke test | Start editor and official example | Open/edit/save demonstration works |
| Application integration | Implement application-owned download/save/authorization | Edited bytes survive reopening from application storage |
| Compatibility | Round-trip the same corpus through each editor | Defects are documented and reproducible |
| Collaboration and failure | Concurrent users, network faults, restarts | No unexplained data loss or authorization bypass |
| Operations | Resource measurements, logs, upgrades, backup/restore | Operational requirements and gaps documented |
| Decision | Score only tested capabilities | Recommendation with evidence and remaining blockers |

Start with a single-node deployment. Investigate clustering only after correctness, security and licensing pass.

## Lab preparation

Use the same environment and workload for every candidate.

**Proposed starting point:** one Linux VM with 4 vCPU and 8 GB RAM, evaluating one engine at a time. This is a comparison baseline, not vendor sizing advice or a production-capacity claim.

Prepare:

- Docker and the Docker Compose plugin.
- A development reverse proxy with trusted HTTPS.
- Dedicated browser profiles for separate test users.
- A version-controlled integration harness.
- A read-only corpus of originals.
- A separate directory/object-store prefix for each candidate's outputs.
- A common set of legally usable fonts.
- Container and browser resource monitoring.
- An evidence directory containing sanitized logs and test results.

Do not publish demo endpoints to the internet. A loopback-bound port reduces exposure but is not a complete sandbox or an outbound-network policy.

### Record artifacts

For every test run, capture:

```text
candidate:
edition:
application_version:
image_reference:
image_digest:
source_revision:
host_os_and_kernel:
cpu_and_memory_limits:
browser_and_version:
font_inventory:
configuration_commit:
corpus_commit:
test_timestamp:
```

Use mutable tags only for initial exploration. Pin a digest before collecting comparison results.

Example:

```bash
docker image inspect IMAGE_REFERENCE \
  --format '{{json .RepoDigests}}'
```

If the container cannot be mapped to a published release, report that explicitly.

## Collabora CODE quick start

Official entry points:

- [Docker instructions](https://sdk.collaboraonline.com/docs/installation/CODE_Docker_image.html)
- [Integration concepts](https://sdk.collaboraonline.com/docs/introduction.html)
- [SDK examples](https://github.com/CollaboraOnline/collabora-online-sdk-examples)
- [Node.js example](https://github.com/CollaboraOnline/collabora-online-sdk-examples/tree/master/webapp/nodejs)
- [PostMessage API](https://sdk.collaboraonline.com/docs/postmessage_api.html)

### Start the engine

The upstream Docker guide provides this minimal local startup pattern:

```bash
docker pull collabora/code

docker run -d \
  --name eval-collabora \
  -p 127.0.0.1:9980:9980 \
  collabora/code
```

The upstream guide uses the following local diagnostic:

```bash
curl -k [https://localhost:9980](https://localhost:9980)
```

Expected result is an `OK` response. The `-k` flag is acceptable only for this local diagnostic against the generated certificate; do not carry disabled TLS verification into application integration. [Docker guide](https://sdk.collaboraonline.com/docs/installation/CODE_Docker_image.html)

### Run the integration sample

```bash
git clone [https://github.com/CollaboraOnline/collabora-online-sdk-examples.git](https://github.com/CollaboraOnline/collabora-online-sdk-examples.git)
cd collabora-online-sdk-examples/webapp/nodejs

npm install
npm start
```

Follow the sample README for its URL, certificate configuration and editor-server address. Ensure the editor container can reach the sample host; `localhost` inside the container is not the developer's host machine.

Configure an explicit allowed WOPI host before broader testing. The documented `aliasgroup1` setting identifies the application's WOPI host, not necessarily the editor's hostname. [Docker guide](https://sdk.collaboraonline.com/docs/installation/CODE_Docker_image.html)

### Smoke-test acceptance

- [ ] Editor loads inside the sample application.
- [ ] Edit generates a `PutFile` request.
- [ ] The application receives the updated content.
- [ ] A separate persistence test proves the content survives sample/application restart.

The sample demonstrates protocol wiring; successful logging of a save request is not proof of durable storage.

**Container security:** Do not fix startup failures by automatically adding `--privileged`, disabling confinement or copying old capability recipes. The current guide discusses different isolation/capability approaches; select and document the approach appropriate to the pinned version and host. [Docker guide](https://sdk.collaboraonline.com/docs/installation/CODE_Docker_image.html)

## ONLYOFFICE Community quick start

Official entry points:

- [DocumentServer repository and edition matrix](https://github.com/ONLYOFFICE/DocumentServer)
- [Docker repository](https://github.com/ONLYOFFICE/Docker-DocumentServer)
- [Docs API](https://api.onlyoffice.com/docs/docs-api/get-started/)
- [Save workflow](https://api.onlyoffice.com/docs/docs-api/get-started/how-it-works/saving-file/)
- [Callback contract](https://api.onlyoffice.com/docs/docs-api/usage-api/callback-handler/)
- [JWT/security model](https://api.onlyoffice.com/docs/docs-api/get-started/how-it-works/security/)

### Start the engine

Apply the security release gate first. The following is a local smoke-test configuration adapted from upstream container settings, not a production deployment.

```bash
export OO_JWT_SECRET="$(openssl rand -hex 32)"

docker pull onlyoffice/documentserver:latest

docker run -d \
  --name eval-onlyoffice \
  -p 127.0.0.1:8081:80 \
  -e JWT_ENABLED=true \
  -e JWT_SECRET="$OO_JWT_SECRET" \
  -e EXAMPLE_ENABLED=true \
  onlyoffice/documentserver:latest
```

Open:

```text
http://localhost:8081/
http://localhost:8081/example/
```

If the selected artifact does not enable its example through this setting, use that version's Docker README rather than disabling authentication to bypass the problem.

JWT configuration should be explicit and stable across container recreation. Configure the application with the matching secret, and never expose that signing secret to the browser. [cite:385]

### Smoke-test acceptance

- [ ] Upload/open a synthetic DOCX, XLSX and PPTX.
- [ ] Edit and download the results.
- [ ] Confirm the deployed package is Community, not an enterprise trial.
- [ ] Record the exact build and image digest.
- [ ] Disable the example before any non-lab deployment.
- [ ] Repeat open/edit/save through the real application harness.

Do not confuse browser-local editing or editor-server caching with persistence in application storage.

## Euro-Office quick start

Official entry points:

- [DocumentServer repository](https://github.com/Euro-Office/DocumentServer)
- [Documentation](https://euro-office.github.io/documentation/)
- [Build/distribution tracks](https://euro-office.github.io/documentation/installation/releases/)
- [Architecture](https://euro-office.github.io/documentation/introduction/architecture/)
- [Server configuration](https://github.com/Euro-Office/documentation/blob/main/docs/configuration/server.md)
- [Integration sample](https://github.com/Euro-Office/document-server-integration)
- [Build and example instructions](https://euro-office.github.io/documentation/development/building/)
- [Container registry](https://github.com/euro-office/DocumentServer/pkgs/container/documentserver)
- [Release v9.3.8](https://github.com/Euro-Office/DocumentServer/releases/tag/v9.3.8)

### Start the engine

The project README documents an image with an integrated example application. Adapted for a loopback-only lab:

```bash
export EO_JWT_SECRET="$(openssl rand -hex 32)"

docker pull ghcr.io/euro-office/documentserver:latest

docker run -d \
  --name eval-eurooffice \
  -p 127.0.0.1:8082:80 \
  -e JWT_ENABLED=true \
  -e JWT_SECRET="$EO_JWT_SECRET" \
  -e EXAMPLE_ENABLED=true \
  ghcr.io/euro-office/documentserver:latest
```

Open:

```text
http://localhost:8082/example/
```

The documented configuration requires an appropriately long JWT secret; the command generates 32 random bytes encoded as hexadecimal. [cite:163]

### Smoke-test acceptance

- [ ] Example loads and supports open/edit/save.
- [ ] Record which published release the image represents.
- [ ] Confirm the mobile editing path using actual devices if required.
- [ ] Inspect dependencies and persistent state.
- [ ] Run the same application contract tests used for ONLYOFFICE.
- [ ] Treat every API mismatch as an integration finding.

Euro-Office documents Redis, RabbitMQ and a SQL database in its architecture. Do not assume that ONLYOFFICE Community's post-9.4 simplification also applies to Euro-Office. [cite:363][cite:420]

The project also documents a production-oriented distribution named “Nextcloud Office.” That is a distribution/support distinction; it is not a reason to deploy Nextcloud for this evaluation. Validate non-Nextcloud integration and support expectations separately. [Build tracks](https://euro-office.github.io/documentation/installation/releases/)

## Application integration harness

Build one application-facing abstraction with separate editor adapters.

Suggested internal contract:

```text
createEditorSession(documentId, userId, accessMode) -> launch configuration
getDocumentMetadata(documentId)
readDocument(documentId, revision)
persistDocument(documentId, expectedRevision, bytes, metadata)
recordEditorEvent(sessionId, event)
```

Suggested topology:

```text
Browser
  |
  +-- Application UI / authentication
  |
  +-- Embedded editor
          |
          +-- Editor backend
                  |
                  +-- Application document endpoints
                          |
                          +-- Metadata database
                          +-- Application-owned file/object storage
```

This is a proposed application architecture, not a vendor-provided implementation.

The application remains responsible for:

- Tenant/document authorization.
- Mapping authenticated users to editor identities.
- Issuing session-specific permissions and credentials.
- Reading and committing document revisions.
- Audit events and retention policies.
- Conflict handling and concurrent external modifications.
- Securing download URLs and callbacks.

### Collabora adapter

Implement the WOPI host behavior required by the selected integration, including file metadata, reading content and accepting updated content. Add locking and other operations according to the protocol/features actually advertised. [cite:389]

Use the official sample to establish the initial exchange, then replace demonstration storage with the application's persistence layer.

For iframe interaction, follow the PostMessage handshake and origin requirements. Collabora documents `Host_PostmessageReady` and `PostMessageOrigin`; do not accept arbitrary browser message origins. [cite:394]

Acceptance tests:

- Read-only user cannot write through the file endpoint.
- Invalid, expired and wrong-document tokens are rejected.
- Writes produce an atomic, recoverable application revision.
- Simultaneous sessions join the intended document.
- Unsupported WOPI capabilities are not advertised.
- Host restarts and permission changes have documented behavior.

### ONLYOFFICE adapter

The application supplies the document URL, document key, permissions, user information and callback URL. The callback workflow returns a URL from which the application downloads the updated file. [cite:134][cite:350]

Illustrative configuration shape—not a complete implementation:

```javascript
const config = {
  document: {
    fileType: "docx",
    key: "appA.tenant7.file42.rev3",
    title: "evaluation.docx",
    url: "[https://app.example.test/editor-files/signed-download](https://app.example.test/editor-files/signed-download)"
  },
  documentType: "word",
  editorConfig: {
    callbackUrl: "[https://app.example.test/editor-callbacks/session-id](https://app.example.test/editor-callbacks/session-id)",
    user: {
      id: "user-17",
      name: "Evaluator A"
    }
  },
  token: "SERVER_GENERATED_JWT"
};
```

Generate the JWT server-side from the intended configuration. Do not give the browser the shared signing secret. [cite:376]

**Document keys:** Users intended to co-edit the same revision must receive the intended shared session key. Keys must not collide between independent documents, tenants or integrations; the documentation warns that reusing a known key can return cached content. Rotate revision/session keys according to the documented save lifecycle, not on every browser refresh. [Document configuration](https://api.onlyoffice.com/docs/docs-api/usage-api/config/document/)

**Save handling:** The documented callback statuses include:

| Status | Meaning | Evaluation handling |
|---|---|---|
| 1 | Editing/session activity | Record if needed |
| 2 | Document ready for saving | Fetch and durably persist the updated file |
| 3 | Save error | Alert and investigate |
| 4 | Closed without changes | Do not create a false content revision |
| 6 | Force-save snapshot available | Persist according to the application's snapshot policy |
| 7 | Force-save error | Alert and investigate |

Source: [Callback handler](https://api.onlyoffice.com/docs/docs-api/usage-api/callback-handler/).

Implement:

1. Validate the request using the configured JWT contract.
2. Resolve the session, tenant and document from trusted application state.
3. Validate the callback data against that state.
4. For a valid save event, download only from an approved editor-server origin.
5. Enforce size limits, timeouts and redirect restrictions.
6. Commit the bytes atomically with revision/concurrency checks.
7. Make duplicate and out-of-order events safe.
8. Return the documented `{"error":0}` only when the event has been handled successfully.

For save events, success must mean that the bytes are durably committed or durably staged for retry—not merely that an asynchronous task was started.

The final save commonly occurs after all editors close, with a delay. A force-save can provide an intermediate snapshot. Do not equate the visible Save action with an immediate commit to application storage without testing that configuration. [Save workflow](https://api.onlyoffice.com/docs/docs-api/get-started/how-it-works/saving-file/)

### Euro-Office adapter

Use the Euro-Office integration sample as the implementation reference. The related SDK/component structure makes a shared adapter worth investigating, but compatibility is an evaluation hypothesis—not a guarantee. [cite:420]

Run contract tests for:

- Editor bootstrap and configuration.
- JWT validation in each direction.
- User identities and permissions.
- Document keys and session reuse.
- Source-file download.
- Save and force-save callbacks.
- Error events.
- History metadata, if required.
- Plugins or custom integrations.

Record every difference from ONLYOFFICE explicitly. Do not silently maintain provider-specific branches without tests.

## Document compatibility corpus

Use the same immutable originals for every candidate. The following corpus is a proposed test design.

| Group | Suggested contents | Validate |
|---|---|---|
| DOCX | Styles, headers/footers, tables, images, sections, TOC, footnotes | Pagination, formatting and structure |
| DOCX review | Comments, replies, tracked changes | Preservation and acceptance/rejection behavior |
| XLSX | Formulas, dates, charts, named ranges, validation, conditional formatting, pivots | Numeric correctness and editing behavior |
| PPTX | Master layouts, images, charts, notes, transitions | Layout, fonts, notes and presentation output |
| ODT/ODS/ODP | Representative native ODF documents | Editing and round-trip preservation |
| PDF, optional | Text, forms, annotations, scanned pages | Exact required PDF workflow |
| Localization | Greek/English text, Unicode filenames, decimal/date conventions | Encoding, locale and font behavior |
| Large/complex | Realistically large documents and workbooks | Open time, responsiveness and failures |
| Protected/macro-enabled | Approved representative files | Preservation, warnings and supported behavior |

Do not treat “can open the file” as “can edit and save without loss.” Likewise, macro preservation does not establish macro execution compatibility.

For every file:

1. Preserve the original and calculate its hash.
2. Capture reference output in the originating office application.
3. Open in the candidate.
4. Perform a defined edit.
5. Save into application-owned storage.
6. Close all editor sessions.
7. Reopen the saved artifact in both the candidate and the originating application.
8. Compare content, formulas, layout, comments and warnings.
9. Repeat a second round trip for high-risk formats.

For packaged XML formats, use structural comparisons where appropriate rather than requiring byte-identical ZIP output.

Control font differences before assigning rendering defects to the editor.

## Test matrix

The following are proposed acceptance tests. Thresholds should be agreed before execution.

| ID | Scenario | Pass evidence |
|---|---|---|
| INT-01 | Launch from authenticated application | Correct document and user; no public file exposure |
| INT-02 | Read-only launch | Server-side write attempts are rejected |
| INT-03 | Same document, two users | Both join the intended session and see changes |
| INT-04 | Same filename across tenants | No session/cache/content crossover |
| SAV-01 | Edit, close, reopen | Changes exist in application storage |
| SAV-02 | Intermediate save | Documented snapshot/final-save semantics |
| SAV-03 | Duplicate save callback | No duplicate corruption or unintended revisions |
| SAV-04 | Out-of-order save events | Newer document state is not overwritten |
| SAV-05 | Application storage unavailable | Visible failure or reliable recovery; no silent success |
| SAV-06 | External modification during editing | Explicit conflict policy; no silent overwrite |
| COL-01 | Concurrent edits in same paragraph/cell | Consistent results or documented conflict behavior |
| COL-02 | Browser disconnect/reconnect | Recovery behavior and data-loss window recorded |
| COL-03 | Last editor closes unexpectedly | Final persistence outcome recorded |
| RES-01 | Editor container killed during editing | Recoverable state or clearly quantified loss |
| RES-02 | Host application restarted | Save/download retries behave safely |
| RES-03 | Editor recreated | Required state and secrets survive as designed |
| SEC-01 | Expired/invalid credentials | Request rejected |
| SEC-02 | Wrong-user/wrong-document credential | Request rejected |
| SEC-03 | Forged save request | Rejected before any download or write |
| SEC-04 | Download URL targets internal service | Blocked by application/network policy |
| SEC-05 | Permission revoked mid-session | Behavior measured and judged against requirements |
| OPS-01 | Controlled upgrade and rollback | Existing documents and integrations remain usable |
| OPS-02 | Backup and restore | Application files and required editor state recover |
| MOB-01 | Actual iOS/Android browser, if required | Required edit/save workflow passes on eligible editions |

Run negative security tests only against the authorized lab environment.

### Persistence evidence

For important save tests, keep an evidence chain:

```text
test ID
  -> editor session
  -> callback/WOPI request
  -> received content hash
  -> application revision
  -> stored content hash
  -> reopened content verification
```

Redact bearer tokens, JWTs, signed URLs and document content from shared logs.

## Performance and operations

Measure, do not infer, capacity from architecture.

ONLYOFFICE Community changed its backend architecture in 9.4, removing RabbitMQ/database dependencies according to the release announcement. Euro-Office documents a different dependency topology. Compare the actual pinned deployments rather than old installation diagrams. [cite:363][cite:420]

Suggested workload steps: 1, 5, 10 and 25 concurrent sessions, followed by the expected operational target. These are proposed test points, not supported-capacity claims.

Test both:

- Many users editing one document.
- Many independent documents open simultaneously.

Record:

- Cold-start and warm-start time.
- Time to usable editor.
- Browser memory/CPU and downloaded bytes.
- Server CPU, RSS, disk activity and temporary storage.
- Save latency through application commit.
- Error rates, disconnects and restart count.
- Resource usage after all sessions close.
- Behavior when CPU/memory limits are reached.

Use actual browser sessions for editing-load tests. HTTP requests to a health endpoint do not simulate collaborative editing.

### Network paths

Verify each path separately:

| Path | Check |
|---|---|
| Browser -> application | Authentication, HTTPS, session handling |
| Browser -> editor | Assets, iframe policy, real-time transport |
| Editor -> application/storage | DNS, TLS trust, authorization, download/save access |
| Application -> editor | Save-artifact download and command access |
| Editor -> external services | Unexpected telemetry, plugins, AI or remote resources |

A working browser-to-editor connection does not prove that the editor backend can reach the application's storage endpoints.

## Security and licensing checklist

### Security

- [ ] Exact image digest approved.
- [ ] Embedded runtimes and native converters reviewed.
- [ ] Vendor advisories checked for the deployed edition.
- [ ] Demo interfaces disabled outside the lab.
- [ ] HTTPS verified throughout the intended trust boundaries.
- [ ] JWT/WOPI credentials scoped and protected.
- [ ] Incoming save requests authenticated.
- [ ] Server-side document authorization enforced.
- [ ] URL fetches constrained against SSRF and unsafe redirects.
- [ ] Document IDs cannot escape tenant/storage boundaries.
- [ ] Upload, conversion and decompression resource limits defined.
- [ ] Container isolation validated without unnecessary privileges.
- [ ] Outbound access, plugins and optional AI integrations reviewed.
- [ ] Temporary files, retention and document deletion tested.
- [ ] Logs redact credentials and sensitive content.
- [ ] Cross-tenant session/cache tests pass.

### Licensing

- [ ] Exact release LICENSE/COPYING and attribution files archived.
- [ ] Bundled component, font and asset licenses inspected.
- [ ] Modification and source-availability obligations reviewed.
- [ ] Required UI notices retained.
- [ ] Trademark/branding permissions reviewed separately.
- [ ] Customer-facing embedding and redistribution model approved.
- [ ] Legal review completed where the integration model is uncertain.

Useful license links:

- [Collabora COPYING](https://github.com/CollaboraOnline/online/blob/main/COPYING)
- [ONLYOFFICE LICENSE](https://github.com/ONLYOFFICE/DocumentServer/blob/master/LICENSE)
- [Euro-Office LICENSE](https://github.com/Euro-Office/DocumentServer/blob/main/LICENSE)
- [Euro-Office ATTRIBUTION](https://github.com/Euro-Office/DocumentServer/blob/main/ATTRIBUTION)

Do not assume an iframe automatically resolves copyleft questions, or that an AGPL dependency automatically requires publication of every unrelated application component. Have the actual integration and distribution model reviewed.

## Scoring and decision

Apply hard gates before weighted scoring.

**Proposed hard gates**

- No unresolved critical security exposure accepted by the team.
- No silent loss in mandatory persistence/recovery tests.
- No cross-tenant access or cache leakage.
- Required formats survive agreed round-trip tests.
- Mandatory mobile functionality is available in the selected edition.
- License obligations fit the intended deployment/distribution model.

**Proposed scoring**

| Category | Weight | Collabora | ONLYOFFICE | Euro-Office |
|---|---:|---|---|---|
| Document fidelity | 25% | Not measured | Not measured | Not measured |
| Integration effort/API fit | 20% | Not measured | Not measured | Not measured |
| Persistence and recovery | 20% | Not measured | Not measured | Not measured |
| Security and compliance | 15% | Not measured | Not measured | Not measured |
| Operations and resources | 10% | Not measured | Not measured | Not measured |
| User workflow and accessibility | 10% | Not measured | Not measured | Not measured |

Use a consistent 0–5 scale. Mark untested requirements as “Not measured,” not as zero or a passing score.

Do not let a high weighted score override a failed mandatory gate.

## Developer handoff deliverables

The evaluation is complete when the team provides:

- Pinned deployment configuration for each candidate.
- Application adapters and automated contract tests.
- Corpus manifest with hashes and reference application versions.
- Compatibility defect list with reproducible steps and artifacts.
- Persistence, collaboration and failure-test results.
- Performance measurements with workload and environment details.
- Security findings and patch-verification evidence.
- License/attribution review notes.
- Upgrade, rollback, backup and restore notes.
- A short architecture decision record.

Suggested decision-record structure:

```text
Decision:
Selected candidate and exact edition/version:
Required workflows:
Mandatory gates passed:
Measured strengths:
Measured weaknesses:
Rejected alternatives and reasons:
Remaining blockers:
Production support/security ownership:
Re-evaluation trigger:
```

No overall winner is assigned in this document. The selection should follow the application's measured compatibility, persistence and security results—not feature-list similarity or assumptions inherited from another edition.