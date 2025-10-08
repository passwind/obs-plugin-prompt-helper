## Trae OBS Plugin Assistant — Extension MVP

Purpose: Provide a developer-facing Trae/Cursor-like extension that injects OBS-plugin-specific context into AI interactions, automates dependency queries and compile commands, and helps parse/fix build errors for OBS plugin development.

⸻

1. Executive summary

Build an extension (TypeScript/Node) that (1) reads per-project OBS configuration, (2) augments every AI request with OBS build/context info, (3) exposes commands to run/monitor builds, (4) parses compiler output and produces actionable repair suggestions (and optional patch files), and (5) integrates with local tooling (CMake, clangd) and the IDE UI. The result: developers no longer must repeatedly type long instructions — the assistant “knows” the project and can run builds, diagnose errors, and propose fixes that match OBS plugin conventions.

⸻

2. Objectives & success criteria

Objectives
	•	Inject OBS build/context automatically into AI prompts.
	•	Provide one-click/mapped commands: obs:build, obs:clean, obs:run, obs:fix-error.
	•	Capture build logs, parse errors, and produce AI suggestions / code patches.
	•	Support macOS and Windows build workflows (CMake + ninja/Makefile/MSVC).
	•	Keep configuration per-project in .obspluginrc.json.

Success criteria (MVP)
	•	Extension injects project context into AI calls 100% of the time.
	•	obs:build runs CMake build and displays parsed errors in UI.
	•	For ≥80% of common compile errors within sample projects, AI suggestions are coherent and actionable (produce a patch or specific edit instructions).
	•	Works on a sample OBS plugin repo (build → error → suggested fix → re-build loop).

⸻

3. High-level architecture

[IDE (Trae)]  
  ├─ UI (commands, panels)  
  ├─ Extension Core (TS)  
      ├─ Config Manager (.obspluginrc)  
      ├─ AI Middleware (Prompt injector)  
      ├─ Build Executor (child_process wrapper)  
      ├─ Log Parser & Error Extractor  
      ├─ Patch Generator (apply / preview)  
      ├─ LSP Connector (clangd) [optional]  
      └─ Telemetry & Security
  └─ Local Tools
      ├─ CMake, ninja, make, msbuild
      ├─ clangd / ccls
      ├─ obs-studio SDK (libobs includes)

Components interact as:
	1.	User issues obs:build or asks AI in editor.
	2.	AI Middleware augments prompt with project context (from Config Manager + recent build logs).
	3.	AI responds (code/commands). If command-like, Build Executor executes.
	4.	Build logs → Log Parser extracts errors.
	5.	Extracted errors sent back to AI via middleware for suggested fixes.
	6.	Patch Generator formats AI suggestion into diff/patch or recommended code edits; user previews & applies.

⸻

4. Component design

4.1 Config Manager
	•	File: .obspluginrc.json at project root.
	•	Responsibilities:
	•	Parse config, provide platform profile (macos/windows), SDK paths, build commands, include paths.
	•	Validate config schema on load.
	•	Schema (example — full schema included in Appendix A):

{
  "sdk_path": "/path/to/obs",
  "build_dir": "build",
  "build_system": "cmake",
  "plugin_entry": "src/plugin.cpp",
  "platform_profiles": {
    "macos": {
      "cmake_args": ["-DCMAKE_BUILD_TYPE=Release"],
      "build_command": "cmake --build build --config Release"
    },
    "windows": {
      "cmake_args": ["-G", "Ninja"],
      "build_command": "cmake --build build --config Release"
    }
  },
  "dependencies": {
    "qt": "/path/to/qt",
    "cef": "/path/to/cef"
  }
}

4.2 AI Middleware
	•	Runs before every AI call.
	•	Actions:
	•	Compose system prompt with: project name, SDK path & version (if detectable), build system, known limitations/constraints, recent build errors (optionally), coding standards (C++17/clang-tidy rules), and a short OBS API orientation snippet.
	•	Attach “intent” flag: intent: compile, intent: fix, intent: code-assist.
	•	Sanitize prompt to avoid leaking secrets (strip API keys, local tokens).
	•	Implementation: wrapper that transforms outgoing model payloads.

Example injected system prompt (short):

You are assisting on an OBS libobs C++ plugin. Project root: /.... OBS SDK: /.../libobs (vX). Build system: CMake. Compiler: clang++ (macOS). When providing code changes, return a unified diff or a precise file path + line edits. Prefer libobs APIs (obs_source_info, obs_module_load). If suggested commands are run, they will be executed locally.

4.3 Build Executor
	•	Runs CMake configure & build commands (child_process).
	•	Streams stdout/stderr to an IDE output panel with timestamps.
	•	Maintains a recent build log buffer (configurable size).
	•	Exposes commands:
	•	obs:configure — run cmake -S . -B build [cmake_args]
	•	obs:build — run cmake --build build --config <cfg>
	•	obs:clean — remove build artifacts
	•	Detects platform and uses profile from config.

4.4 Log Parser & Error Extractor
	•	Parses compiler/linker errors into structured objects:
	•	{ file, line, column, severity, message, raw }
	•	Recognizes common patterns for:
	•	Missing headers/includes
	•	Undefined symbols (linker)
	•	Macro inconsistencies, type errors
	•	Qt/CEF linking issues
	•	OBS-specific API mismatch (signature change)
	•	Output used to:
	•	Highlight problems in editor (Diagnostics)
	•	Send concise context to AI for targeted fixes

4.5 Patch Generator
	•	Accepts AI suggestion (either unified diff or natural language patch).
	•	Validates the patch (syntactic check), produces preview.
	•	Provides:
	•	Apply / Reject UI actions.
	•	If AI returns only edit instructions, convert to edit via LSP textEdits.
	•	Support git staging: create branch trae/ai-fix/<timestamp>, commit patch automatically (optional).

4.6 LSP Connector (Optional but recommended)
	•	Integrate with clangd for:
	•	Accurate symbol resolution
	•	Code actions (rename, include insertion)
	•	Type info for AI augmentation
	•	Use clangd’s diagnostics to cross-check build parser results.

4.7 Telemetry & Security
	•	Telemetry: usage (commands run), error categories (optional), for product improvement — must be opt-in.
	•	Security: never upload local source or API keys to remote; AI calls should be via user-provided model endpoint (or local LLM) — document the privacy model.

⸻

5. Data formats & APIs

5.1 Internal types (TypeScript interfaces)

interface ObsConfig {
  sdk_path: string;
  build_dir: string;
  build_system: 'cmake' | 'meson' | 'make';
  plugin_entry: string;
  platform_profiles: Record<string, PlatformProfile>;
  dependencies?: Record<string,string>;
}

interface PlatformProfile {
  cmake_args?: string[];
  build_command?: string;
  compiler?: string;
}

5.2 AI request envelope

{
  "intent": "compile" | "fix" | "assist",
  "system_prompt": "...",      // injected context
  "user_prompt": "...",        // developer's question
  "file_contexts": [
    {"path": "src/plugin.cpp", "snippet": "...", "cursor_line": 120}
  ],
  "recent_build_log": "..."    // optional
}

5.3 Error representation

{
  "errors": [
    {
      "file": "src/plugin.cpp",
      "line": 45,
      "column": 12,
      "severity": "error",
      "message": "No matching function for call to 'obs_register_source'",
      "raw": "..."
    }
  ]
}


⸻

6. Interaction flows

Flow A — Developer runs build
	1.	User triggers obs:build.
	2.	Build Executor runs config/build commands (streaming).
	3.	Log Parser extracts errors -> show diagnostics + create compact error summary.
	4.	IDE shows errors; user can click an error to see details.

Flow B — Ask AI to fix error
	1.	User clicks Fix on an error or triggers obs:fix-error.
	2.	AI Middleware builds an envelope: system prompt includes project config + error context + relevant file snippet.
	3.	Call model; AI returns either: (a) unified diff, (b) edit instructions, (c) build command suggestion.
	4.	Patch Generator validates & creates git branch + applies patch (preview).
	5.	User reviews & accepts. Re-run build.

Flow C — Developer asks general coding question
	1.	Editor selection + ask AI (e.g., “How should I register this source in OBS 30.x?”).
	2.	Middleware injects OBS API orientation and relevant header snippets.
	3.	AI returns code snippet; user inserts; LSP/clangd check ensures compile plausibility.

⸻

7. Example prompts & prompts templates

System prompt template (injected automatically):

You are an expert C++ developer assisting with building OBS plugins using libobs. The project root is {projectRoot}. OBS SDK is at {sdk_path}. Build system: {build_system}. Platform: {platform}. Recent errors: {shortErrorSummary}. When suggesting code changes, return either a unified diff (git format) or file path + line ranges with precise edits. Do not suggest running commands that require elevated privileges. Prefer safe edits; if uncertain, propose manual steps.

User prompt example:

Fix the linker error: undefined reference to obs_source_info::get_name. Build log attached. Show a patch or exact edit.

⸻

8. UI design (IDE panels & commands)

Commands
	•	obs.configure — configure CMake
	•	obs.build — build
	•	obs.clean — clean
	•	obs.fix-error — send error to AI for fix
	•	obs.show-config — show parsed .obspluginrc.json
	•	obs.run-tests — run unit/regression tests if present

Panels / Views
	•	Output Panel: build stdout/stderr streamed
	•	Diagnostics Panel: parsed errors clickable to open file/line
	•	AI Assistant Chat: shows injected prompt (collapsed by default), AI replies, actions (apply patch, run command)
	•	Config Editor: quick edit of .obspluginrc.json and platform profiles

⸻

9. Implementation plan & milestones

Week 0 — Prep
	•	Create repo, scaffolding, define schema (.obspluginrc).
	•	Setup CI for linting/tests.

Week 1 — Core MVP
	•	Implement Config Manager, basic AI Middleware (no LLM call; stub), Build Executor (run cmake build), Output Panel streaming, Log Parser (basic gcc/clang patterns), register commands.

Week 2 — AI integration
	•	Integrate with chosen LLM endpoint (user sets API key or local LLM).
	•	Implement prompt injection, basic obs:fix-error flow that sends error + file snippet to LLM.
	•	Patch Generator: accept unified diff and apply via git apply.

Week 3 — LSP + polish
	•	Add optional clangd integration for better context.
	•	Add platform profiles, error highlight diagnostics.
	•	Add tests & sample OBS plugin repo for E2E.

Week 4 — Beta & docs
	•	UX polish, telemetry opt-in, security review, documentation, release MVP.

⸻

10. Testing strategy

Unit tests
	•	Config parsing, prompt injector formatting, log parser (error patterns).

Integration tests
	•	Use a sample OBS plugin repo:
	•	Test obs:configure, obs:build success/failure.
	•	For known compile errors, assert parser outputs expected structured errors.

E2E
	•	Simulate AI responses by mocking model: unified diff, textual correction, and command responses. Validate apply patch and re-build results.

Manual
	•	Run across macOS and Windows dev VMs. Validate MSVC build path.

⸻

11. Security & privacy
	•	Local-only mode by default: AI calls use user-specified endpoint. Document that sending code to third-party LLM may expose IP — provide explicit consent toggle.
	•	Sanitization: remove local file system absolute paths, API keys, and secrets from prompts.
	•	Telemetry: opt-in only. No source code uploaded to extension telemetry.

⸻

12. Risks & mitigations
	•	Risk: AI suggests unsafe or incorrect code (breaking plugin or upstream API misuse).
Mitigation: require user review & preview before applying patches; run unit/build checks automatically after applying.
	•	Risk: Model hallucinations (inventing API names).
Mitigation: inject local obs headers & clangd symbol info as context; prefer suggestions that match existing symbols.
	•	Risk: Diverse build environments cause failures (CEF/Qt path differences).
Mitigation: provide platform profiles and allow custom preBuild hooks in .obspluginrc.json.

⸻

13. Acceptance criteria (for MVP)
	•	A developer can open a sample OBS plugin repo, configure .obspluginrc.json, run obs:build, and see build logs in the output panel.
	•	On build error, obs:fix-error sends relevant context to model and returns a patch; user can preview and apply patch; re-build shows reduction in the specific error.
	•	The extension must run on macOS and Windows with documented steps.

⸻

14. Appendices

Appendix A — .obspluginrc.json schema (condensed)
	•	sdk_path: string (required)
	•	build_dir: string (default: “build”)
	•	build_system: enum [“cmake”,“make”]
	•	plugin_entry: string
	•	platform_profiles: object keyed by platform:
	•	cmake_args: array[string]
	•	build_command: string
	•	compiler: string
	•	dependencies: object mapping name→path

Appendix B — Example AI prompt (complete)

System: You are an expert assisting with OBS plugin development. [detailed context here]
User: Compiler error: /path/src/plugin.cpp:123: undefined reference to obs_register_source. File snippet: (lines 110–140). Please propose a fix. Return a unified diff if possible.

Appendix C — Sample job: error → patch lifecycle (sequence)
	1.	BuildExecutor → runs build → LogParser outputs error E.
	2.	UI: user clicks Fix on E.
	3.	Middleware creates AI envelope: config + E + file snippet.
	4.	Model returns unified diff.
	5.	PatchGenerator validates git apply --check.
	6.	If ok, create branch, apply patch, commit.
	7.	Re-run BuildExecutor; report results.

⸻

15. Next steps (ready-to-start checklist)
	•	Approve TDD.
	•	Provision repo & CI.
	•	Select AI backend(s) and configure auth model (user-side).
	•	Implement Week 1 deliverables (Config Manager, Build Executor, Output streaming, Log Parser).
	•	Prepare sample OBS plugin repo for testing.
