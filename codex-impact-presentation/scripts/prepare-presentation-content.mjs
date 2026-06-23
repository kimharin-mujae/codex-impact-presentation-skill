import fs from "node:fs/promises";
import path from "node:path";

const CWD = process.cwd();

function parseArgs(argv) {
  const args = { inputDir: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input-dir") {
      args.inputDir = argv[i + 1] ?? "";
      i += 1;
    } else if (arg.startsWith("--input-dir=")) {
      args.inputDir = arg.slice("--input-dir=".length);
    } else if (!arg.startsWith("-") && !args.inputDir) {
      args.inputDir = arg;
    }
  }
  return args;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readText(filePath) {
  return fs.readFile(filePath, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await readText(filePath));
}

function compact(value) {
  return String(value ?? "").replace(/\s+/gu, " ").trim();
}

function cleanEnd(value) {
  return compact(value).replace(/[.。]$/u, "");
}

function truncate(value, max) {
  const text = cleanEnd(value);
  if (text.length <= max) return text;
  const words = text.split(/\s+/u);
  let result = "";
  for (const word of words) {
    const next = result ? `${result} ${word}` : word;
    if (next.length > max) break;
    result = next;
  }
  return result || text.slice(0, max).replace(/[^\p{Letter}\p{Number})\]]+$/u, "").trim();
}

function mdValue(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`-\\s*${escaped}:\\s*(.+)`, "u"));
  return match?.[1]?.trim() ?? "";
}

function section(text, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`##\\s*${escaped}\\s+([^#]+)`, "u"));
  return compact(match?.[1] ?? "");
}

function extractFrontmatter(text) {
  if (!text.startsWith("---")) return {};
  const end = text.indexOf("\n---", 3);
  if (end === -1) return {};
  const block = text.slice(3, end).trim();
  const result = {};
  for (const line of block.split("\n")) {
    const match = line.match(/^([^:]+):\s*"?([^"]*)"?\s*$/u);
    if (match) result[match[1].trim()] = match[2].trim();
  }
  return result;
}

async function sourceFilesIn(dir) {
  const files = {
    inputJson: path.join(dir, "input.json"),
    workshopJson: path.join(dir, "workshop.json"),
    planMd: path.join(dir, "PLAN.md"),
  };
  if (await exists(files.inputJson)) return { dir, sourcePath: files.inputJson, type: "input.json" };
  if (await exists(files.workshopJson)) return { dir, sourcePath: files.workshopJson, type: "workshop.json" };
  if (await exists(files.planMd)) return { dir, sourcePath: files.planMd, type: "markdown" };
  return null;
}

async function findSourceCandidates(baseDir) {
  const candidates = [];
  const current = await sourceFilesIn(baseDir);
  if (current) candidates.push(current);
  const skip = new Set([".git", ".codex", ".agents", "node_modules", "outputs", "presentation-assets"]);
  for (const entry of await fs.readdir(baseDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || skip.has(entry.name)) continue;
    const candidate = await sourceFilesIn(path.join(baseDir, entry.name));
    if (candidate) candidates.push(candidate);
  }
  return candidates;
}

async function resolveInputDir(args) {
  if (args.inputDir) {
    const inputDir = path.resolve(CWD, args.inputDir);
    const source = await sourceFilesIn(inputDir);
    if (!source) throw new Error(`${inputDir}에서 input.json, workshop.json, PLAN.md 중 하나를 찾을 수 없습니다.`);
    return source;
  }
  const candidates = await findSourceCandidates(CWD);
  if (candidates.length === 0) throw new Error("현재 폴더에서 발표자료 입력 파일을 찾을 수 없습니다.");
  if (candidates.length > 1) {
    const list = candidates.map((candidate) => `- ${path.relative(CWD, candidate.dir) || "."} (${candidate.type})`).join("\n");
    throw new Error(`입력 후보가 여러 개입니다. 참가자 폴더를 명시하세요.\n\n${list}`);
  }
  return candidates[0];
}

async function readMarkdownData(inputDir) {
  const plan = await exists(path.join(inputDir, "PLAN.md")) ? await readText(path.join(inputDir, "PLAN.md")) : "";
  const workflow = await exists(path.join(inputDir, "WORKFLOW_ANALYSIS.md")) ? await readText(path.join(inputDir, "WORKFLOW_ANALYSIS.md")) : "";
  const caseStudy = await exists(path.join(inputDir, "CASE_STUDY.md")) ? await readText(path.join(inputDir, "CASE_STUDY.md")) : "";
  const frontmatter = extractFrontmatter(plan || workflow || caseStudy);

  return {
    team: {
      name: frontmatter.team_name ?? "",
      social_innovator: mdValue(plan, "사회혁신가"),
      developer: mdValue(plan, "개발자"),
    },
    project: { name: frontmatter.project_name ?? "" },
    problem: {
      actual_work_problem: mdValue(plan, "실제 업무 문제") || section(caseStudy, "문제 요약"),
      people_affected: mdValue(plan, "가장 어려움을 겪는 사람"),
      blocked_moment: mdValue(plan, "문제가 발생하는 순간"),
    },
    current_workflow: {
      inputs: mdValue(plan, "입력 자료"),
      steps: mdValue(plan, "처리 순서"),
    },
    mvp: {
      single_feature: mdValue(plan, "핵심 기능 1개"),
      included_workflow_steps: mdValue(plan, "포함할 업무 단계"),
      demo_input: mdValue(plan, "데모 입력"),
      demo_output: mdValue(plan, "데모 산출물") || section(caseStudy, "MVP 결과물"),
    },
    existing_workflow: {
      current_pain_points: mdValue(workflow, "불편한 지점"),
      data_count: mdValue(workflow, "데이터 수"),
    },
    ai_agent_design: {
      changed_workflow: mdValue(workflow, "바뀐 업무 흐름") || section(caseStudy, "AI 에이전트 워크플로"),
      decision_boundary: mdValue(workflow, "판단 경계"),
    },
    human_in_the_loop: {
      review_points: mdValue(workflow, "주요 검수 포인트") || section(caseStudy, "사람 검토"),
    },
    impact_and_reuse: {
      expected_time_change: mdValue(workflow, "기존 대비 소요 시간 변화"),
      quality_change: mdValue(workflow, "품질 변화"),
    },
    case_study: {
      title: frontmatter.title ?? "",
      mvp_result: section(caseStudy, "MVP 결과물"),
      lessons: section(caseStudy, "배운 점"),
    },
  };
}

async function readProjectData(source) {
  if (source.type === "input.json" || source.type === "workshop.json") return readJson(source.sourcePath);
  return readMarkdownData(source.dir);
}

async function readOverrides(inputDir) {
  const filePath = path.join(inputDir, "presentation-input.json");
  if (!await exists(filePath)) return {};
  return readJson(filePath);
}

function listFrom(text, max = 3) {
  return compact(text)
    .split(/\s*(?:->|→|>|,|，|및|와|과|;|；)\s*/u)
    .map((item) => cleanEnd(item))
    .filter(Boolean)
    .slice(0, max);
}

function cleanWorkflowStep(value) {
  return cleanEnd(value)
    .replace(/^작동\s*\d+\s*단계\s*/u, "")
    .replace(/^단계\s*\d+\s*/u, "")
    .replace(/^\d+\s*단계\s*/u, "")
    .trim();
}

function validateCoverIntros(content) {
  const introKeys = [
    ["social_innovator_intro", "사회혁신가 한줄소개"],
    ["developer_intro", "개발자 한줄소개"],
  ];
  for (const [key, label] of introKeys) {
    const value = String(content[key] ?? "");
    if (value.length > 65) {
      throw new Error(`${label}는 공백 포함 65자 이내여야 합니다. 현재 ${value.length}자입니다.`);
    }
  }
}

function inferProjectTitle(data) {
  return data.project?.name || data.project_name || data.case_study?.title || data.team?.name || data.team_name || "Codex Impact 프로젝트";
}

function inferSubtitle(data) {
  const feature = data.mvp?.single_feature || data.automation_target?.selected_task || "";
  const output = data.mvp?.demo_output || data.case_study?.mvp_result || "";
  if (feature) {
    const phrased = cleanEnd(feature)
      .replace(/신청서와 상담 메모/gu, "신청서·상담 메모")
      .replace(/우선순위와 확인 질문/gu, "우선순위·질문")
      .replace(/정리한다$/u, "정리하는 AI")
      .replace(/생성한다$/u, "생성하는 AI")
      .replace(/분류한다$/u, "분류하는 AI");
    return truncate(phrased, 42);
  }
  if (output) return `${truncate(output, 26)}를 정리하는 AI`;
  return "현장 자료를 먼저 정리하고 사람이 결정하는 AI";
}

function inferProblemTitle(data) {
  const moment = data.problem?.blocked_moment || "";
  const problem = data.problem?.actual_work_problem || "";
  if (/월요일|주말/u.test(moment)) return "월요일 아침, 신청이 한 번에 몰립니다";
  if (/제보|민원/u.test(problem)) return "여러 채널의 요청이 한 번에 들어옵니다";
  if (/일지|상담|기록/u.test(problem)) return "중요한 신호가 기록 속에 묻힙니다";
  return truncate(problem || "반복 확인 때문에 중요한 판단이 늦어집니다", 28);
}

function inferProblemPoints(data) {
  const count = compact(data.existing_workflow?.data_count || data.mvp?.demo_input || "").match(/\d+\s*건/u)?.[0]?.replace(/\s+/g, "") || "";
  const input = data.current_workflow?.inputs || "현장 자료";
  const problem = data.problem?.actual_work_problem || "";
  const pain = data.existing_workflow?.current_pain_points || data.problem?.blocked_moment || "";
  const points = [
    count ? `한 번에 확인할 자료가 ${count}까지 늘어남` : `${truncate(input, 16)}를 반복해서 확인해야 함`,
    /우선순위|긴급/u.test(problem) ? "긴급 사례를 늦게 발견할 위험이 있음" : truncate(pain || "중요한 단서를 놓칠 위험이 있음", 30),
    /기준|판단/u.test(`${problem} ${pain}`) ? "사람마다 판단 기준이 달라질 수 있음" : "최종 판단 전에 근거 정리가 필요함",
  ];
  return points.map((item) => truncate(item, 32));
}

function inferSolutionTitle(data) {
  const context = `${data.problem?.actual_work_problem || ""} ${data.mvp?.demo_output || ""}`;
  if (/우선순위|긴급/u.test(context)) return "AI가 검토의 출발점을,\n결정은 사람이 합니다";
  if (/제보|답변/u.test(context)) return "AI가 분류의 출발점을,\n대응은 사람이 합니다";
  return "AI가 반복 정리를 맡고,\n결정은 사람이 합니다";
}

function inferWorkflowSteps(data) {
  const flow = data.mvp?.included_workflow_steps || data.ai_agent_design?.changed_workflow || "";
  const steps = listFrom(flow, 3);
  if (steps.length >= 3) return steps.map((step) => truncate(cleanWorkflowStep(step.replace(/^AI가\s*/u, "")), 24));
  return [
    "샘플 자료 입력",
    "AI가 핵심 단서 정리",
    "사람이 최종 판단",
  ];
}

function inferBefore(data) {
  const inputs = data.current_workflow?.inputs || "자료";
  const problem = data.problem?.actual_work_problem || "";
  if (/우선순위|긴급/u.test(problem)) return `${truncate(inputs, 12)} 등을\n직접 전부 정독하고,\n우선순위를 판단`;
  return `${truncate(inputs, 12)}를\n직접 확인하고,\n필요한 조치를 판단`;
}

function inferAfterAi(data) {
  const output = data.mvp?.demo_output || data.case_study?.mvp_result || "";
  if (/우선순위|긴급/u.test(output)) return "AI\n핵심정보·긴급도·근거·확인질문을\n분석하여 표로 정리";
  if (/답변|제보|분류/u.test(output)) return "AI\n유형·담당 후보·확인질문을\n분류하여 초안으로 정리";
  return "AI\n핵심 단서와 확인 질문을\n한눈에 보이게 정리";
}

function inferAfterHuman(data) {
  const boundary = data.ai_agent_design?.decision_boundary || data.human_in_the_loop?.review_points || "";
  if (/연락|지원/u.test(boundary)) return "사람\nAI 분석물을 기반으로\n최종 지원·연락 순서 결정";
  if (/답변|대응/u.test(boundary)) return "사람\nAI 정리본을 검토하고\n최종 대응 여부 결정";
  return "사람\nAI 정리본을 검토하고\n최종 판단과 책임 수행";
}

function inferImpactTitle(data) {
  const output = data.mvp?.demo_output || data.case_study?.mvp_result || "";
  if (/우선순위|긴급/u.test(output)) return "긴급 사례가 빨리 발견되고\n검토 기준이 일관화됩니다";
  if (/답변|제보|분류/u.test(output)) return "누락될 요청이 줄고\n대응 기준이 일관화됩니다";
  return "반복 확인이 줄고\n현장 판단이 빨라집니다";
}

function inferImpactDetails(data) {
  const time = data.impact_and_reuse?.expected_time_change || "";
  const quality = data.impact_and_reuse?.quality_change || "";
  const context = `${time} ${quality} ${data.mvp?.demo_output || ""} ${data.problem?.actual_work_problem || ""}`;
  const timeLabel = /우선|먼저|순서/u.test(context) ? "우선 검토" : "검토 부담 완화";
  const qualityLabel = /위험|신호/u.test(context) ? "위험 신호 기준" : "판단 근거 정리";
  return {
    time_label: timeLabel,
    time_detail: truncate(time || "전체 정독 시간\n→ 먼저 볼 순서 확인", 34),
    quality_label: qualityLabel,
    quality_detail: truncate(quality || "사람마다 다른 기준\n→ 근거·질문 형식 통일", 34),
  };
}

function inferFooterQuote(data) {
  const boundary = data.ai_agent_design?.decision_boundary || data.automation_target?.reason_for_selection || "";
  if (/위험|긴급/u.test(boundary)) return "“위험 신호는 AI가 표시하고, 판단은 코디네이터가 합니다.”";
  if (/분류|답변|대응/u.test(boundary)) return "“AI는 초안을 정리하고, 대응은 사람이 결정합니다.”";
  return "“AI는 정리하고, 사람은 책임 있게 결정합니다.”";
}

function inferSpeakerNotes(content) {
  const workflow = Array.isArray(content.workflow_steps) ? content.workflow_steps : [];
  const problemPoints = Array.isArray(content.problem_points) ? content.problem_points : [];
  const timings = [
    "슬라이드 1 | 25초 | 0:00-0:25",
    "슬라이드 2 | 35초 | 0:25-1:00",
    "슬라이드 3 | 45초 | 1:00-1:45",
    "슬라이드 4 | 40초 | 1:45-2:25",
    "슬라이드 5 | 35초 | 2:25-3:00",
  ];

  return [
    `[전체 발표 시간: 3분]\n시간 관계상 각 슬라이드별 권장 시간을 지켜 발표해 주세요.\n\n[${timings[0]}]\n안녕하세요. 저희는 ${content.project_title} 사례를 소개하겠습니다.\n\n이 프로젝트는 ${content.project_subtitle}입니다.\n\n핵심은 AI가 먼저 정리하고, 사람은 책임 있게 최종 판단하도록 돕는 것입니다.`,
    `[${timings[1]}]\n문제는 ${content.problem_title}는 점입니다.\n\n${problemPoints[0] || "현장 자료가 한꺼번에 몰립니다"}.\n\n${problemPoints[1] || "중요한 단서가 여러 기록 사이에 묻힐 수 있습니다"}.\n\n그래서 공유 전에는 근거와 후속 확인 내용을 사람이 다시 확인할 수 있어야 합니다.`,
    `[${timings[2]}]\n그래서 저희는 ${content.solution_title.replace(/\n/gu, " ")}라는 흐름으로 설계했습니다.\n\n기존에는 ${content.before_summary.replace(/\n/gu, " ")}.\n\n개선 후에는 ${content.after_ai_summary.replace(/^AI\s*/u, "").replace(/\n/gu, " ")}.\n\n이후 ${content.after_human_summary.replace(/^사람\s*/u, "").replace(/\n/gu, " ")}. 즉 AI는 판정자가 아니라 검토 보조 역할입니다.`,
    `[${timings[3]}]\n작동 흐름은 세 단계로 줄였습니다.\n\n첫째, ${workflow[0] || "자료를 입력합니다"}.\n\n둘째, ${workflow[1] || "AI가 핵심 단서를 정리합니다"}.\n\n셋째, ${workflow[2] || "사람이 최종 판단합니다"}.\n\n이렇게 하면 발표나 공유 전에 무엇을 먼저 확인해야 하는지 빠르게 잡을 수 있습니다.`,
    `[${timings[4]}]\n기대 효과는 두 가지입니다.\n\n첫째, ${content.time_label}입니다. ${content.time_detail}.\n\n둘째, ${content.quality_label}입니다. ${content.quality_detail}.\n\n이 도구는 판단을 자동화하려는 것이 아니라, 사람이 더 빠르고 책임 있게 판단할 수 있도록 출발점을 정리하는 데 초점을 둡니다. 감사합니다.`,
  ];
}

function normalizeContent(content) {
  const normalized = {
    ...content,
    workflow_steps: Array.isArray(content.workflow_steps)
      ? content.workflow_steps.map((step) => cleanWorkflowStep(step))
      : content.workflow_steps,
  };
  return {
    ...normalized,
    speaker_notes: Array.isArray(normalized.speaker_notes) ? normalized.speaker_notes : inferSpeakerNotes(normalized),
  };
}

function buildContent(data, overrides) {
  const impact = inferImpactDetails(data);
  const content = {
    project_title: inferProjectTitle(data),
    project_subtitle: inferSubtitle(data),
    developer_name: data.team?.developer || data.developer_name || "",
    developer_intro: "",
    social_innovator_name: data.team?.social_innovator || data.social_innovator_name || "",
    social_innovator_intro: "",
    deck_month: new Date().toISOString().slice(0, 7).replace("-", "."),
    problem_title: inferProblemTitle(data),
    problem_points: inferProblemPoints(data),
    solution_title: inferSolutionTitle(data),
    before_summary: inferBefore(data),
    after_ai_summary: inferAfterAi(data),
    after_human_summary: inferAfterHuman(data),
    workflow_steps: inferWorkflowSteps(data),
    impact_title: inferImpactTitle(data),
    footer_quote: inferFooterQuote(data),
    ...impact,
  };
  const normalized = normalizeContent({ ...content, ...overrides });
  validateCoverIntros(normalized);
  return normalized;
}

async function writeExampleInput(inputDir) {
  const examplePath = path.join(inputDir, "presentation-input.example.json");
  const example = {
    project_title: "",
    project_subtitle: "",
    developer_name: "",
    developer_intro: "",
    social_innovator_name: "",
    social_innovator_intro: "",
    problem_title: "",
    problem_points: ["", "", ""],
    solution_title: "",
    before_summary: "",
    after_ai_summary: "",
    after_human_summary: "",
    workflow_steps: ["", "", ""],
    impact_title: "",
    time_label: "",
    time_detail: "",
    quality_label: "",
    quality_detail: "",
    footer_quote: "",
    speaker_notes: ["", "", "", "", ""],
  };
  await fs.writeFile(examplePath, JSON.stringify(example, null, 2));
  return examplePath;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const source = await resolveInputDir(args);
  const data = await readProjectData(source);
  const overrides = await readOverrides(source.dir);
  const content = buildContent(data, overrides);
  const outDir = path.join(source.dir, "outputs");
  const assetsDir = path.join(source.dir, "presentation-assets");
  const screenshot = path.join(assetsDir, "result_screenshot.png");
  await fs.mkdir(outDir, { recursive: true });
  const contentPath = path.join(outDir, "presentation-content.json");
  await fs.writeFile(contentPath, JSON.stringify(content, null, 2));
  const exampleInput = await writeExampleInput(source.dir);
  console.log(JSON.stringify({
    inputDir: source.dir,
    dataSource: source.sourcePath,
    dataSourceType: source.type,
    googleSlidesTemplate: "https://docs.google.com/presentation/d/13pVNcDsFf1DX6emPLjOt1NvtPE9xpkh02GQAbs3IT1g/edit?usp=sharing",
    content: contentPath,
    exampleInput,
    resultScreenshot: await exists(screenshot) ? screenshot : null,
    nextAction: "Google Slides 템플릿을 복사한 뒤 build-google-slides-requests.mjs를 실행하고 batchUpdate를 적용하세요.",
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
