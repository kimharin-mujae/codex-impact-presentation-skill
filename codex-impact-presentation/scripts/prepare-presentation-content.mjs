import fs from "node:fs/promises";
import path from "node:path";

const CWD = process.cwd();
const DEFAULT_REFLECTIONS = new Set([
  "반복 검토를 줄이고 판단에 집중할 가능성을 확인",
  "자동화보다 사람의 검토 흐름 설계가 중요함",
]);

function parseArgs(argv) {
  const args = {
    inputDir: null,
    strict: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--strict") {
      args.strict = true;
    } else if (arg === "--input-dir") {
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

function compact(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function trimEnd(text) {
  return compact(text).replace(/[.。]$/u, "");
}

function shorten(text, max = 34) {
  const value = trimEnd(text);
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function firstCount(text) {
  return compact(text).match(/\d+\s*건/u)?.[0]?.replace(/\s+/g, "") ?? "";
}

function lines(items, max = 3) {
  return items.map(trimEnd).filter(Boolean).slice(0, max).join("\n");
}

function splitList(text) {
  return compact(text)
    .split(/\s*(?:->|→|>|,|，|및|와|과)\s*/u)
    .map(trimEnd)
    .filter(Boolean);
}

function flowLines(text, max = 5) {
  return splitList(text)
    .map((step) => step
      .replace(/^AI가\s*/u, "")
      .replace(/^담당자가\s*/u, "")
      .replace(/우선순위 검토표 출력/u, "검토표 출력")
      .replace(/누락 정보와 담당자 확인 질문 생성/u, "확인 질문 생성"))
    .filter(Boolean)
    .slice(0, max)
    .join("\n");
}

function outputLines(text, max = 4) {
  const raw = trimEnd(text)
    .replace(/^우선순위 검토표:\s*/u, "")
    .replace(/접수 ID,\s*/u, "")
    .replace(/AI 판단 신뢰도,\s*/u, "")
    .replace(/사람 검토 메모 칸이 있는\s*/u, "");

  if (/우선순위/u.test(raw) && /담당자 질문|확인 질문/u.test(raw)) {
    return lines([
      "우선순위 검토표",
      "건별 근거 요약",
      "담당자 확인 질문",
      "사람 검토 메모 칸",
    ], max);
  }

  return splitList(raw).slice(0, max).join("\n");
}

async function sourceFilesIn(dir) {
  const files = {
    inputJson: path.join(dir, "input.json"),
    workshopJson: path.join(dir, "workshop.json"),
    planMd: path.join(dir, "PLAN.md"),
    workflowMd: path.join(dir, "WORKFLOW_ANALYSIS.md"),
    caseStudyMd: path.join(dir, "CASE_STUDY.md"),
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

  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  const skip = new Set([".git", ".codex", ".agents", "node_modules", "outputs", "presentation-assets"]);
  for (const entry of entries) {
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
    if (!source) {
      throw new Error(`${inputDir}에서 input.json, workshop.json, PLAN.md 중 하나를 찾을 수 없습니다.`);
    }
    return source;
  }

  const candidates = await findSourceCandidates(CWD);
  if (candidates.length === 0) {
    throw new Error("현재 폴더에서 발표자료 입력 파일을 찾을 수 없습니다. input.json 또는 workshop.json이 있는 참가자 폴더에서 실행하세요.");
  }

  if (candidates.length > 1) {
    const list = candidates
      .map((candidate) => `- ${path.relative(CWD, candidate.dir) || "."} (${candidate.type})`)
      .join("\n");
    throw new Error(`입력 후보가 여러 개입니다. 잘못된 샘플을 읽지 않도록 참가자 폴더를 명시하세요.\n\n${list}\n\n예: node ~/.codex/skills/codex-impact-presentation/scripts/prepare-presentation-content.mjs --input-dir test`);
  }

  return candidates[0];
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

function mdValue(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`-\\s*${escaped}:\\s*(.+)`, "u"));
  return match?.[1]?.trim() ?? "";
}

async function readMarkdownData(inputDir) {
  const planPath = path.join(inputDir, "PLAN.md");
  const workflowPath = path.join(inputDir, "WORKFLOW_ANALYSIS.md");
  const caseStudyPath = path.join(inputDir, "CASE_STUDY.md");

  const plan = await exists(planPath) ? await readText(planPath) : "";
  const workflow = await exists(workflowPath) ? await readText(workflowPath) : "";
  const caseStudy = await exists(caseStudyPath) ? await readText(caseStudyPath) : "";
  const frontmatter = extractFrontmatter(plan || workflow || caseStudy);

  return {
    team: {
      name: frontmatter.team_name ?? "",
      social_innovator: mdValue(plan, "사회혁신가"),
      developer: mdValue(plan, "개발자"),
    },
    project: {
      name: frontmatter.project_name ?? "",
    },
    problem: {
      actual_work_problem: mdValue(plan, "실제 업무 문제") || compact(caseStudy.match(/## 문제 요약\s+([^#]+)/u)?.[1] ?? ""),
      people_affected: mdValue(plan, "가장 어려움을 겪는 사람"),
      blocked_moment: mdValue(plan, "문제가 발생하는 순간"),
    },
    current_workflow: {
      inputs: mdValue(plan, "입력 자료"),
      steps: mdValue(plan, "처리 순서"),
      judgment: mdValue(plan, "판단 기준"),
      outputs: mdValue(plan, "현재 산출물"),
    },
    mvp: {
      problem_slice: mdValue(plan, "해결할 좁은 문제"),
      single_feature: mdValue(plan, "핵심 기능 1개"),
      included_workflow_steps: mdValue(plan, "포함할 업무 단계"),
      demo_input: mdValue(plan, "데모 입력"),
      demo_output: mdValue(plan, "데모 산출물") || compact(caseStudy.match(/## MVP 결과물\s+([^#]+)/u)?.[1] ?? ""),
    },
    existing_workflow: {
      current_pain_points: mdValue(workflow, "불편한 지점"),
      data_count: mdValue(workflow, "데이터 수"),
    },
    ai_agent_design: {
      changed_workflow: mdValue(workflow, "바뀐 업무 흐름") || compact(caseStudy.match(/## AI 에이전트 워크플로\s+([^#]+)/u)?.[1] ?? ""),
      decision_boundary: mdValue(workflow, "판단 경계"),
    },
    human_in_the_loop: {
      review_points: mdValue(workflow, "주요 검수 포인트") || compact(caseStudy.match(/## 사람 검토\s+([^#]+)/u)?.[1] ?? ""),
    },
    case_study: {
      mvp_result: compact(caseStudy.match(/## MVP 결과물\s+([^#]+)/u)?.[1] ?? ""),
      lessons: compact(caseStudy.match(/## 배운 점\s+([^#]+)/u)?.[1] ?? ""),
    },
    library_metadata: {
      workflow_type: mdValue(workflow, "업무 유형"),
    },
    impact_and_reuse: {
      expected_time_change: mdValue(workflow, "기존 대비 소요 시간 변화"),
      quality_change: mdValue(workflow, "품질 변화"),
    },
  };
}

async function readProjectData(source) {
  if (source.type === "input.json" || source.type === "workshop.json") {
    return readJson(source.sourcePath);
  }
  return readMarkdownData(source.dir);
}

async function readPresentationInput(inputDir) {
  const inputPath = path.join(inputDir, "presentation-input.json");
  if (!await exists(inputPath)) return {};
  return readJson(inputPath);
}

function isRealReflection(value) {
  const text = compact(value);
  return Boolean(text) && !DEFAULT_REFLECTIONS.has(text) && !/^\{\{.+\}\}$/u.test(text);
}

function buildSlide1Title(data) {
  const workflowType = data.library_metadata?.workflow_type ?? "";
  const problem = data.problem?.actual_work_problem ?? "";
  const mvp = data.mvp?.single_feature ?? data.automation_target?.selected_task ?? "";
  const text = `${workflowType} ${problem} ${mvp}`;

  if (/신청서검토|신청서|상담 메모|우선순위/u.test(text)) {
    return "반복 검토에 묶인 시간을 우선순위 판단으로 돌립니다";
  }
  if (/제보|분류|라우팅|답변 초안/u.test(text)) {
    return "흩어진 제보를 대응 순서와 답변 초안으로 정리합니다";
  }
  if (/일지|멘토링/u.test(text)) {
    return "놓치기 쉬운 신호를 먼저 볼 순서로 정리합니다";
  }
  return "반복 업무에 묶인 시간을 현장 판단으로 돌립니다";
}

function buildFieldProblemBullets(data) {
  const problem = data.problem?.actual_work_problem ?? "";
  if (/긴급식품지원 신청서와 상담 메모/u.test(problem)) {
    return lines([
      "신청서·상담 메모 반복 검토",
      "긴급도 단서 직접 확인",
      "우선순위 정리 부담",
    ]);
  }
  if (/제보|분류|답변 초안/u.test(problem)) {
    return lines([
      "자유형식 제보 반복 확인",
      "채널별 접수 누락 위험",
      "답변 초안 작성 지연",
    ]);
  }

  return lines([
    shorten(problem, 36),
    shorten(data.current_workflow?.inputs ?? data.problem?.people_affected ?? "", 32),
    shorten(data.current_workflow?.steps ?? data.existing_workflow?.current_steps ?? "", 32),
  ]);
}

function buildBottleneckBullets(data) {
  const blocked = data.problem?.blocked_moment ?? "";
  const pain = data.existing_workflow?.current_pain_points ?? "";
  if (/월요일 오전|주말/u.test(blocked)) {
    return lines([
      "주말 접수 건 월요일 집중",
      "긴급 사례 발견 지연",
      "근거 확인 시간 증가",
    ]);
  }
  if (/제보|채널|시설 파손/u.test(`${blocked} ${pain}`)) {
    return lines([
      "제보가 여러 채널로 동시 접수",
      "유형·담당 후보 판단 지연",
      "답변 톤과 기준 불일치",
    ]);
  }
  return lines([
    shorten(blocked, 34),
    shorten(pain, 34),
    "판단 기준 공유 어려움",
  ]);
}

function buildMvpBullets(data) {
  const count = firstCount(data.mvp?.demo_input ?? data.existing_workflow?.data_count ?? "") || "샘플";
  const output = data.case_study?.mvp_result ?? data.mvp?.demo_output ?? "";
  if (/우선순위/u.test(output)) {
    return lines([
      `가상 샘플 ${count} 입력`,
      "우선순위표 자동 정리",
      "확인 질문까지 생성",
    ]);
  }
  if (/제보|담당 후보|답변 초안/u.test(output)) {
    return lines([
      `익명 제보 ${count} 입력`,
      "유형·담당 후보 정리",
      "확인 질문·답변 초안 생성",
    ]);
  }
  return lines([
    shorten(data.mvp?.demo_input ?? "", 32),
    shorten(data.mvp?.single_feature ?? "", 36),
    shorten(data.mvp?.demo_output ?? output, 34),
  ]);
}

function buildFieldImpactBullets(data) {
  const output = data.case_study?.mvp_result ?? data.mvp?.demo_output ?? "";
  const quality = data.impact_and_reuse?.quality_change ?? "";
  if (/우선순위/u.test(output)) {
    return lines([
      "긴급 사례를 더 빨리 발견",
      "회의 전 판단 근거 공유",
      "담당자 간 검토 기준 일관화",
    ]);
  }
  if (/답변|분류|제보/u.test(output)) {
    return lines([
      "누락될 제보를 먼저 발견",
      "활동가 간 답변 기준 정렬",
      "처리 기록 재사용 기반 확보",
    ]);
  }
  return lines([
    "먼저 볼 대상 빠르게 확인",
    "회의 전 판단 근거 공유",
    "담당자 간 기준 일관화",
  ]);
}

function buildResponsibleUseBullets(data) {
  const boundary = data.ai_agent_design?.decision_boundary ?? data.human_in_the_loop?.review_points ?? "";
  if (/최종 지원 여부/u.test(boundary)) {
    return lines([
      "최종 지원 여부는 담당자 결정",
      "개인정보·민감 정보 출력 금지",
      "상위 사례 중심으로 근거 확인",
    ]);
  }
  if (/제보|담당 후보|활동가|주민|사유지/u.test(`${boundary} ${data.human_in_the_loop?.review_points ?? ""}`)) {
    return lines([
      "담당 후보는 활동가가 확인",
      "연락처·상세 주소 제거",
      "사유지/공공영역 판단 검토",
    ]);
  }
  return lines([
    shorten(boundary || "최종 결정은 담당자 판단", 34),
    "개인정보·민감 정보 출력 금지",
    shorten(data.human_in_the_loop?.review_points ?? "근거와 답변 톤 확인", 34),
  ]);
}

function buildProblemImagePrompt(data) {
  const actual = data.problem?.actual_work_problem ?? "";
  const people = data.problem?.people_affected ?? "";
  const moment = data.problem?.blocked_moment ?? "";

  return `아래 세 가지 답변을 바탕으로, 이 문제가 실제로 발생하는 순간을 한 장의 현실적인 이미지로 표현해줘.

참가자 답변

- 실제 업무 문제: ${actual}
- 가장 어려움을 겪는 사람: ${people}
- 문제가 발생하는 순간: ${moment}

이미지 생성 요청

이 이미지는 해결책을 보여주는 것이 아니라, 아직 해결되지 않은 현재의 문제상황을 보여주기 위한 것이다.

다음 요소가 자연스럽게 드러나게 표현해줘.

1. 문제가 발생하는 시간, 장소, 분위기
2. 가장 어려움을 겪는 사람이 실제로 겪는 부담이나 난감함
3. 문제를 일으키는 자료, 메시지, 서류, 화면, 현장 상황
4. 반복, 지연, 혼란, 누락, 대기, 판단 어려움 같은 업무 병목
5. 왜 이 문제가 해결되어야 하는지 3초 안에 이해되는 장면

단, 다음은 포함하지 말아줘.

- AI가 이미 문제를 해결해주는 장면
- 자동화된 대시보드나 완성된 시스템 화면
- 과장되거나 자극적인 고통 표현
- 특정 개인을 비난하는 듯한 연출
- 실제 개인정보, 이름, 전화번호, 주소, 주민번호, 얼굴이 특정되는 정보
- 읽어야 이해되는 긴 문장이나 복잡한 텍스트

현실적인 사진 스타일로, 발표자료에 넣었을 때 문제상황이 직관적으로 보이는 한 장면으로 만들어줘.`;
}

function buildContent(data, input) {
  const socialReflection = isRealReflection(input.reflection_social_innovator)
    ? input.reflection_social_innovator
    : "{{reflection_social_innovator}}";
  const developerReflection = isRealReflection(input.reflection_developer)
    ? input.reflection_developer
    : "{{reflection_developer}}";

  return {
    team_name: data.team?.name ?? data.team_name ?? "",
    project_name: data.project?.name ?? data.project_name ?? data.case_study?.title ?? "",
    slide1_title: input.slide1_title ?? buildSlide1Title(data),
    field_problem_bullets: input.field_problem_bullets ?? buildFieldProblemBullets(data),
    core_bottleneck_bullets: input.core_bottleneck_bullets ?? buildBottleneckBullets(data),
    mvp_scope_bullets: input.mvp_scope_bullets ?? buildMvpBullets(data),
    workflow_steps: input.workflow_steps ?? flowLines(data.mvp?.included_workflow_steps ?? data.ai_agent_design?.changed_workflow ?? "", 5),
    output_items: input.output_items ?? outputLines(data.case_study?.mvp_result ?? data.mvp?.demo_output ?? "", 4),
    slide3_title: input.slide3_title ?? "AI가 검토의 출발점을 만들고, 결정은 사람이 합니다",
    field_impact_bullets: input.field_impact_bullets ?? buildFieldImpactBullets(data),
    responsible_use_bullets: input.responsible_use_bullets ?? buildResponsibleUseBullets(data),
    reflection_social_innovator: socialReflection,
    reflection_developer: developerReflection,
  };
}

async function writeExampleInput(inputDir) {
  const examplePath = path.join(inputDir, "presentation-input.example.json");
  await fs.writeFile(examplePath, JSON.stringify({
    reflection_social_innovator: "",
    reflection_developer: "",
    slide1_title: "",
    field_problem_bullets: "",
    core_bottleneck_bullets: "",
    mvp_scope_bullets: "",
    workflow_steps: "",
    output_items: "",
    slide3_title: "",
    field_impact_bullets: "",
    responsible_use_bullets: "",
  }, null, 2));
  return examplePath;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const source = await resolveInputDir(args);
  const data = await readProjectData(source);
  const input = await readPresentationInput(source.dir);
  const content = buildContent(data, input);
  const prompt = buildProblemImagePrompt(data);
  const outDir = path.join(source.dir, "outputs");
  const assetsDir = path.join(source.dir, "presentation-assets");

  const missingInputs = [];
  if (!isRealReflection(input.reflection_social_innovator)) {
    missingInputs.push({
      key: "reflection_social_innovator",
      question: "사회혁신가 입장에서 오늘 알게 된 점을 한 문장으로 알려주세요.",
    });
  }
  if (!isRealReflection(input.reflection_developer)) {
    missingInputs.push({
      key: "reflection_developer",
      question: "개발자 입장에서 이번 실습에서 중요하다고 느낀 점을 한 문장으로 알려주세요.",
    });
  }

  const missingAssets = [];
  if (!await exists(path.join(assetsDir, "result_screenshot.png"))) {
    missingAssets.push({
      key: "result_screenshot",
      path: path.join(assetsDir, "result_screenshot.png"),
      question: "2페이지에 넣을 결과물 캡처 이미지가 있으면 presentation-assets/result_screenshot.png로 넣어주세요.",
    });
  }

  if (args.strict && missingInputs.length > 0) {
    const questions = missingInputs.map((item) => `- ${item.question}`).join("\n");
    throw new Error(`발표자료 완성 전에 참가자 회고가 필요합니다.\n\n${questions}`);
  }

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "presentation-placeholder-content.json"), JSON.stringify(content, null, 2));
  await fs.writeFile(path.join(outDir, "problem-image-prompt.txt"), prompt);
  const examplePath = await writeExampleInput(source.dir);

  console.log(JSON.stringify({
    inputDir: source.dir,
    dataSource: source.sourcePath,
    dataSourceType: source.type,
    content: path.join(outDir, "presentation-placeholder-content.json"),
    problemImagePrompt: path.join(outDir, "problem-image-prompt.txt"),
    optionalInput: path.join(source.dir, "presentation-input.json"),
    exampleInput: examplePath,
    missingInputs,
    missingAssets,
    nextAction: missingInputs.length > 0
      ? "회고를 먼저 질문한 뒤 presentation-input.json에 저장하고 다시 실행하세요."
      : "최종 Google Slides 템플릿 사본에 placeholder를 채우세요.",
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
