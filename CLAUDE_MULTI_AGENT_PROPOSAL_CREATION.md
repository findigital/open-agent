# Claude Multi-Agent Proposal Creation Playbook

**Document Purpose:** End-to-end guide for orchestrating Claude-based multi-agent proposal generation that consistently delivers "epic" submissions—persuasive, compliant, funder-aligned, and insight-rich. Covers current best-practice architecture, detailed process choreography, skill inventory, quality loops, and high-impact improvement opportunities.

**Audience:** AI product strategists, agent engineers, prompt designers, proposal subject-matter experts, and workflow owners.

---

## 1. Vision & Success Criteria

- **North Star Outcome:** A Claude-centered proposal studio that can ingest raw opportunity intelligence, craft funder-ready narratives, and surface differentiators faster than elite human teams while remaining auditable and customizable.
- **Experience Goals:**
  - Funders perceive deep mission alignment and data-backed credibility in every submission.
  - Proposal teams trust the system to handle 80% of drafting while keeping humans in high-value review loops.
  - Stakeholders gain real-time visibility into readiness, gaps, and win likelihood.
- **Operational Targets:**
  - Reduce time-to-first-draft by 75% versus baseline.
  - Increase compliance pass rates to >98% before human review.
  - Achieve measurable lift in awards (track via win-rate analytics).

---

## 2. Claude Multi-Agent Topology

The orchestration centers on a **Claude Orchestrator** that decomposes work into agent missions, swaps context-rich skill packs, and enforces governance.

### 2.1 Core Agents & Charters

| Agent | Primary Mission | Signature Skills | Human Touchpoints |
| --- | --- | --- | --- |
| **Opportunity Scout** | Qualify and prioritize incoming opportunities. | `grant_source_scan`, `fit_score_estimator`, `risk_heatmap_builder` | Intake manager approves priority queue. |
| **Research Strategist** | Gather funder, sector, and comparator intelligence. | `funder_deep_dive`, `impact_database_query`, `statistical_contextualizer` | SME reviews data gaps. |
| **Solution Architect** | Shape strategy, theory of change, and section blueprint. | `mission_alignment_mapper`, `logic_model_designer`, `section_outline_generator` | Program lead validates framing. |
| **Narrative Composer** | Draft persuasive sections tuned to funder tone. | `voice_clone`, `story_gradient_planner`, `ethos_logos_pathos_balancer` | Editor fine-tunes key sections. |
| **Budget & Metrics Analyst** | Build financials, KPIs, and projections. | `budget_template_loader`, `cost_modeler`, `evidence_linker` | Finance lead approves assumptions. |
| **Compliance Guardian** | Enforce requirements, formatting, and submission readiness. | `checklist_enforcer`, `length_guardrail`, `attachment_tracker` | Proposal manager signs off. |
| **Quality Reviewer** | Perform cross-agent QA, scoring, and risk flagging. | `rubric_evaluator`, `bias_detector`, `readability_optimizer` | Final reviewer resolves alerts. |

### 2.2 Skill Layering Strategy

- **Foundational Skills:** General-purpose tools (summarization, translation, outline building) packaged for reuse. Anchored to Claude's native capabilities.
- **Domain Skill Packs:** Sector or funder-specific prompts that embed taxonomies, success benchmarks, and jargon (e.g., NIH grant language, K-12 education metrics).
- **Meta-Skills:** Orchestrator-level utilities—context routing, memory retrieval, conflict arbitration, and self-critique heuristics.
- **Human-in-the-Loop Skills:** Escalation triggers (`seek_human_validation`) ensure compliance with governance thresholds.

---

## 3. Data & Context Pipeline

1. **Opportunity Intake:** Structured forms + auto-scraping populate a `grant_opportunity` object with funder criteria, deadlines, budget caps, evaluation rubrics.
2. **Knowledge Ingestion:** Document loaders chunk organizational assets, prior proposals, impact reports. Embeddings live in a vector store accessible via `context_retrieval` skill.
3. **Context Weaving:** Orchestrator builds section-level context bundles mixing funder intel, org data, impact evidence, and narrative intent.
4. **State Management:** A proposal session graph tracks each section status, skill usage, and agent outputs for auditability.

---

## 4. Detailed Proposal Creation Workflow

### Stage 0 – Opportunity Calibration
- **Trigger:** New opportunity captured by Opportunity Scout.
- **Agent Stack:** Opportunity Scout, Research Strategist.
- **Key Skills:** `fit_score_estimator`, `risk_heatmap_builder`, `funder_deep_dive`.
- **Outputs:** Qualification brief, go/no-go recommendation, prioritized requirements list.
- **Quality Gates:** Confidence score ≥0.7; funder intent keywords validated.
- **Improvement Opportunities:**
  - Integrate competitive intelligence feed to benchmark win likelihood.
  - Automate historical performance lookup for similar opportunities.

### Stage 1 – Strategic Blueprinting
- **Trigger:** Opportunity approved.
- **Agent Stack:** Solution Architect, Research Strategist, Human Program Lead.
- **Key Skills:** `mission_alignment_mapper`, `logic_model_designer`, `section_outline_generator`.
- **Outputs:** Annotated outline, theory of change diagram, evidence plan.
- **Quality Gates:** Alignment matrix covers all funder priorities; logic model validated with data references.
- **Improvement Opportunities:**
  - Introduce `gap_analysis_simulator` to stress-test assumptions.
  - Capture human feedback in reusable `insight_memory` for future prompts.

### Stage 2 – Data & Evidence Assembly
- **Trigger:** Blueprint accepted.
- **Agent Stack:** Research Strategist, Budget & Metrics Analyst.
- **Key Skills:** `impact_database_query`, `cost_modeler`, `evidence_linker`.
- **Outputs:** Evidence packets per section, draft budget tables, KPI catalogue.
- **Quality Gates:** Citation coverage ≥2 per major claim; budget balance checks.
- **Improvement Opportunities:**
  - Deploy `dataset_quality_assessor` to flag outdated stats.
  - Implement auto-mapping between KPIs and evaluation criteria.

### Stage 3 – Narrative Drafting
- **Trigger:** Evidence packets ready.
- **Agent Stack:** Narrative Composer, Claude Orchestrator, human editor (optional real-time co-authoring).
- **Key Skills:** `voice_clone`, `story_gradient_planner`, `ethos_logos_pathos_balancer`, `length_guardrail`.
- **Outputs:** Section drafts with tone annotations, calls-to-action, cross-references.
- **Quality Gates:** Readability target (Flesch 55-65), compliance with word limits, tone adherence to voice profile.
- **Improvement Opportunities:**
  - Add `persona_heatmap` skill that tracks voice drift across sections.
  - Implement reinforcement learning on reviewer feedback for style tuning.

### Stage 4 – Budget & Impact Finalization
- **Trigger:** Draft narrative locked for review.
- **Agent Stack:** Budget & Metrics Analyst, Compliance Guardian.
- **Key Skills:** `budget_template_loader`, `scenario_sensitivity_modeler`, `impact_projection_builder`.
- **Outputs:** Final budget narrative, tables, impact forecasts, ROI summary.
- **Quality Gates:** Funding request within caps, matching requirements satisfied, scenario analysis logged.
- **Improvement Opportunities:**
  - Introduce automated linkage between narrative claims and budget line items.
  - Build `grantor_preference_adapter` to tailor financial framing to funder style.

### Stage 5 – Integrated QA & Submission Prep
- **Trigger:** Draft + budget merged.
- **Agent Stack:** Quality Reviewer, Compliance Guardian, Human Proposal Manager.
- **Key Skills:** `rubric_evaluator`, `bias_detector`, `checklist_enforcer`, `attachment_tracker`.
- **Outputs:** QA report, compliance checklist, submission-ready package, executive summary.
- **Quality Gates:** Rubric scoring ≥ target threshold, zero blocking compliance issues, attachments verified.
- **Improvement Opportunities:**
  - Expand rubric library with funder-specific scoring lenses.
  - Embed `risk_forecaster` to flag sections likely to receive reviewer scrutiny.

### Stage 6 – Post-Submission Learning Loop
- **Trigger:** Submission logged or funder feedback received.
- **Agent Stack:** Quality Reviewer, Opportunity Scout, Data Steward (human).
- **Key Skills:** `outcome_attribution_analyzer`, `lessons_learned_summarizer`, `skill_tuning_planner`.
- **Outputs:** Win/loss debrief, insight updates to knowledge base, skill refinement backlog.
- **Quality Gates:** Insights tagged to opportunity metadata; improvement actions assigned.
- **Improvement Opportunities:**
  - Automate delta analysis between rubric predictions and actual reviewer comments.
  - Maintain `funder_relationship_memory` to personalize future interactions.

---

## 5. Skill Catalog (Initial)

| Skill ID | Description | Consumed By | Dependencies |
| --- | --- | --- | --- |
| `grant_source_scan` | Scrapes metadata from Grants.gov, foundation portals, RSS feeds. | Opportunity Scout | API keys, schedule triggers |
| `fit_score_estimator` | Uses embeddings + historical outcomes to score opportunity fit. | Opportunity Scout | Vector store, analytics DB |
| `mission_alignment_mapper` | Maps organizational mission statements to funder priorities. | Solution Architect | Org knowledge base, ontology |
| `story_gradient_planner` | Plans emotional/analytical cadence across sections. | Narrative Composer | Voice profiles, section outline |
| `cost_modeler` | Builds granular line-item budgets with sensitivity toggles. | Budget Analyst | Financial templates, inflation indices |
| `rubric_evaluator` | Runs proposal against structured evaluation rubric. | Quality Reviewer | Rubric library, scoring weights |
| `insight_memory_write` | Captures key decisions and reviewer feedback snippets. | All agents | Memory store |
| `seek_human_validation` | Escalates decisions beyond automation threshold. | Orchestrator | Notification framework |

**Improvement Backlog Examples:** Add `DEI_language_checker`, `data_viz_generator`, `timeline_optimizer`, `funder_persona_simulator` to broaden creative and compliance coverage.

---

## 6. Governance, Safety & Transparency

- **Audit Trail:** Persist agent decisions, prompts, and outputs with timestamps. Required for compliance reviews and future learning.
- **Guardrails:**
  - Rate-limit autonomous submissions; human approval mandatory.
  - Sensitive data masked and access-controlled per organization.
  - Ethical reviewing skill to catch overstated impact or unsupported claims.
- **Human Roles:** Proposal manager sets strategic direction, SMEs validate content, compliance officers own final sign-off.
- **Explainability:** Provide per-section rationale (data sources, funder alignment notes, risk assessments).

---

## 7. Metrics & Observability

- **Operational:** time-to-draft, agent utilization, context retrieval accuracy, skill latency.
- **Quality:** rubric scores vs. targets, readability, compliance error rate, reviewer change volume.
- **Business Outcomes:** submission volume, win rate, average award size, funder diversification.
- **Feedback Signals:** human satisfaction surveys, reviewer comments sentiment, loop closure rate on improvement tasks.

Instrumentation should feed a `proposal_ops_dashboard` with stage-level burn-down charts and risk alerts.

---

## 8. Opportunities for Advancement

### Quick Wins (0-6 weeks)
- Embed `persona_heatmap` to monitor tone drift automatically.
- Launch auto-generated executive briefings for leadership at Stage 5.
- Integrate lightweight A/B prompt testing for narrative openings.

### Mid-Term (6-16 weeks)
- Develop dynamic `funder_persona_simulator` to rehearse review boards.
- Build knowledge distillation pipelines to convert human edits into prompt refinements.
- Introduce multilingual drafting agents for global funders.

### Moonshots (4-6 months+)
- Real-time co-authoring canvas where humans and Claude agents collaborate simultaneously with attribution trails.
- Predictive analytics that recommends opportunity pursuits based on portfolio strategy and grant landscape trends.
- Modular policy engine enabling configurable compliance profiles (federal vs. corporate vs. philanthropic).

---

## 9. Implementation Roadmap Snapshot

| Phase | Duration | Focus | Milestones |
| --- | --- | --- | --- |
| **Foundation** | Weeks 1-4 | Stand up orchestrator, core agents, knowledge ingestion. | MVP workflow for single-funder template, basic QA. |
| **Expansion** | Weeks 5-10 | Enrich skill catalog, add budgeting + compliance automation. | Multi-agent collaboration live, analytics dashboard v1. |
| **Optimization** | Weeks 11-18 | Close feedback loop, deploy adaptive prompts. | Reviewer feedback ingestion, tone monitoring, funder-specific rubrics. |
| **Intelligence** | Weeks 19+ | Predictive insights, moonshot initiatives. | Opportunity recommendation engine, persona simulator, live co-authoring. |

---

## 10. Next Steps & Ownership

- **Product Lead:** Validate roadmap against organizational OKRs and secure stakeholder alignment.
- **Engineering:** Scope Claude SDK integration, design agent memory schema, establish CI/CD for skills.
- **Content Strategy:** Curate sector-specific style guides, establish QA rubric library.
- **Operations:** Define human-in-loop protocols, training curriculum, KPI baseline.

> With the orchestration, skill layering, and continuous-learning loops outlined above, Claude can anchor the industry's most epic proposal writer—one that scales expert storytelling, compliance rigor, and strategic insight without sacrificing human authenticity.
