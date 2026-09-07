# Troubleshooting — root-caused issues & permanent fixes

Every entry here was hit on a **real disconnected GPU cluster** (Zain
`zainksa-testai`, registry-less, air-gapped) and is now fixed in the
images/manifests. Kept as a record so the fixes don't regress and future
debugging starts here.

_Last updated: 2026-08-02_

---

## `/api/tts` returns 504

TTS is now served by **OmniVoice** (a KServe `InferenceService` running
vllm-omni on GPU), so the legacy CPU/ONNX-era root causes (air-gap weight
download, onnxruntime thread explosion, CPU synth timeouts) no longer apply.

If you see a 504:
- **Model not ready:** check `oc get inferenceservice -n $NS` — if the TTS
  `InferenceService` is not `Ready`, check pod events (`oc describe pod`) for
  GPU scheduling, image-pull, or driver issues (same as STT/LLM).
- **Router timeout:** the Route carries
  `haproxy.router.openshift.io/timeout: 120s` (in `webui.yaml`). If synth
  exceeds that (unlikely on GPU), raise it.
- **Endpoint mismatch:** OmniVoice serves `/v1/audio/speech` on port 8080.
  Verify `SVA_TTS_ENDPOINT` points to the correct cluster-internal URL
  (`http://omnivoice-predictor.<ns>.svc.cluster.local:8080/v1`).

---

## Prebuilt image → `ImagePullBackOff: unauthorized`
- **Cause:** the quay repo is **private** and the cluster has no pull secret. The
  installer's auto-secret only works if the **machine running the script** is
  `podman login`'d to quay — a bastion that never logged in has no credential to
  copy, so the pod falls back to anonymous → 401.
- **Fixes:** (a) make the quay repos **public** (simplest for non-secret app
  images); or (b) `podman login quay.io` on the bastion then re-run; or (c)
  `oc create secret docker-registry` (a quay robot account) + `oc secrets link
  default <secret> --for=pull`.

## New `:latest` push not picked up on re-deploy
- **Cause 1:** skip-if-healthy keeps a *running* pod as-is (by design, to avoid
  slow re-pulls). A plain re-run won't replace it → use `--force` or
  `oc rollout restart`.
- **Cause 2:** even on restart, a node can reuse a cached `:latest` layer.
- **Fix (permanent):** the web-UI Deployment sets `imagePullPolicy: Always`.
- **Verify a pod is on the new image:**
  compare `oc get pod ... -o jsonpath='{...imageID}'` to the pushed digest.

## Component-test false negative during rollout
- **Symptom:** post-install test reports TTS/LLM failures on a healthy stack.
- **Cause:** with RollingUpdate, the old pod (empty/stale endpoints) briefly sat
  behind the Route next to the new one; `oc rollout status` returns before the
  router drops the old endpoint, so the test load-balanced onto it.
- **Fix (permanent):** the web-UI Deployment uses `strategy: Recreate` (one pod
  ever); the test also waits for a **populated** `/api/config` before probing.

---

## Cross-platform build notes (macOS → OCP)
- OCP nodes are **x86_64**; a Mac (arm64) must build `--platform linux/amd64`
  (`build-push.sh` defaults to this). An arm64 image silently `CrashLoopBackOff`s.
- podman on macOS occasionally drops the machine connection mid-build
  (`unable to connect to Podman socket`) — `podman machine stop && start`.
- **Don't `podman run --platform linux/amd64 <tag>` right after building** — it can
  re-pull the remote (old) image and overwrite your fresh local tag. Verify by
  **image ID**, then `podman tag` + `podman push`.
