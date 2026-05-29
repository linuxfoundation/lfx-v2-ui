// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// This file is intentionally empty. Newsletter email envelope rendering
// (HTML + text chrome, inline-style pass, compliance footer) now lives in
// lfx-v2-newsletter-service under internal/service/render/. Express no
// longer renders email bodies — it only proxies the controller request
// shape through to the Go service.
export {};
