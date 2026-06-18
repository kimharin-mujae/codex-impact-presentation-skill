import fs from "node:fs/promises";
import path from "node:path";

const CWD = process.cwd();
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

function stripSentenceEnding(text) {
  return trimEnd(text)
    .replace(/\s*(입니다|합니다|한다|된다|했다|한다는 점|할 수 있다|할 수 있음|해야 한다|필요하다)$/u, "")
    .replace(/\s+(때문|상황|문제)$/u, "");
}

function truncateCleanly(text, max) {
  const value = compact(text);
  if (value.length <= max) return value;

  const words = value.split(/\s+/u);
  if (words.length > 1) {
    let result = "";
    for (const word of words) {
      const next = result ? `${result} ${word}` : word;
      if (next.length > max) break;
      result = next;
    }
    if (result) return result;
  }

  return value.slice(0, max).replace(/[^\p{Letter}\p{Number})\]]+$/u, "").trim();
}

function compactCardLine(text, max = 22) {
  let value = stripSentenceEnding(text)
    .replace(/[“”"']/gu, "")
    .replace(/\s*(?:->|→|>|,|，|;|；)\s*/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  const replacements = [
    [/개인정보와 민감 정보/gu, "개인정보·민감정보"],
    [/개인정보·민감 정보/gu, "개인정보·민감정보"],
    [/긴급 확인이 필요한\s*/gu, "긴급 "],
    [/사람이 늦게 발견/u, "발견 지연"],
    [/늦게 발견/u, "발견 지연"],
    [/([가-힣A-Za-z0-9·\s]{1,14})가 한꺼번에 제출되는.+/u, "$1 집중 제출"],
    [/([가-힣A-Za-z0-9·\s]{1,14})이 한꺼번에 제출되는.+/u, "$1 집중 제출"],
    [/많은\s+(.+)\s+속\s+(.+)\s+지연/u, "$2 지연"],
    [/최종 판단/u, "최종 판단"],
    [/최종 결정/u, "최종 결정"],
    [/출력 금지/u, "제외"],
  ];
  for (const [from, to] of replacements) value = value.replace(from, to);

  if (value.length <= max) return value;

  const particles = value.split(/\s+(?:때|에서|으로|로|을|를|이|가|은|는|및|와|과)\s*/u).filter(Boolean);
  if (particles[0] && particles[0].length <= max) return particles[0];

  return truncateCleanly(value, max);
}

function cardLines(items, max = 3) {
  const result = [];
  const seen = new Set();
  for (const item of items) {
    const line = compactCardLine(item);
    if (!line || seen.has(line)) continue;
    seen.add(line);
    result.push(line);
    if (result.length >= max) break;
  }
  return result.join("\n");
}

function materialName(text) {
  const cleaned = trimEnd(text)
    .replace(/^(담당자|멘토|활동가|코디네이터|사용자|직원|실무자)가 작성한\s*/u, "")
    .replace(/\s*텍스트\s*/gu, " ")
    .replace(/(.+?)(?:으로|로)\s+들어온\s+(.+)/u, "$1 $2")
    .replace(/\s*(문서|자료|데이터|파일)$/u, "")
    .trim();
  const value = compactCardLine(cleaned, 14)
    .replace(/^(담당자|멘토|활동가|코디네이터|사용자|직원|실무자)가 작성한\s*/u, "")
    .replace(/\s*(문서|자료|데이터|파일)$/u, "")
    .trim();
  return value || "현장 자료";
}

function problemDelayLine(problem, fallback) {
  const value = compact(problem);
  const signal = value.match(/([가-힣A-Za-z0-9·\s]{1,16}신호)[^가-힣A-Za-z0-9]*.*(?:늦게 발견|발견.*지연)/u)?.[1];
  if (signal) {
    const core = signal.split(/\s*에서\s*/u).pop();
    return `${compactCardLine(core, 10)} 발견 지연`;
  }

  const target = value.match(/([가-힣A-Za-z0-9·\s]{1,16})(?:을|를)\s*(?:늦게|반복|직접|수동|일일이)/u)?.[1];
  if (target) return `${compactCardLine(target, 10)} 처리 지연`;

  if (/누락|놓치/u.test(value)) return "중요 신호 누락 위험";
  if (/반복|수동|일일이/u.test(value)) return "반복 확인 시간 증가";
  if (/지연|늦/u.test(value)) return "처리 지연 발생";
  return compactCardLine(fallback || "문제 발견 지연", 18);
}

function personRole(text) {
  const value = compact(text).split(/\s*(?:와|과|및|,|，)\s*/u).find(Boolean) ?? "";
  const role = compactCardLine(value.replace(/^가장 어려움을 겪는\s*/u, ""), 10);
  if (!role || /신청|접수|자료|데이터|문서/u.test(role)) return "담당자";
  return role;
}

function reviewLine(text) {
  const value = compact(text);
  if (/공유 전|전달 전|제출 전/u.test(value)) return "공유 전 사람 검토";
  if (/근거/u.test(value)) return "근거 확인 후 사용";
  if (/톤|표현/u.test(value)) return "표현 기준 검토";
  if (/최종|판단|결정/u.test(value)) return "사람이 최종 판단";
  return compactCardLine(value || "사람 검토 후 사용", 18);
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

function firstLine(text) {
  return String(text ?? "").split("\n").map(trimEnd).find(Boolean) ?? "";
}

function buildSlide2Title(data) {
  const projectName = data.project?.name ?? data.project_name ?? "";
  const output = data.case_study?.mvp_result ?? data.mvp?.demo_output ?? "";
  const generated = outputLines(output, 1);
  const outputName = firstLine(generated);

  if (projectName && outputName && !/(도구|에이전트|시스템)$/u.test(projectName)) {
    return `${projectName} 도구`;
  }
  if (projectName && outputName) return projectName;

  if (outputName) {
    const problem = data.problem?.actual_work_problem ?? "";
    if (/멘토링|일지/u.test(problem) && /우선순위/u.test(outputName)) {
      return "멘토링 일지 확인 필요 우선순위표 생성 도구";
    }
    return `${outputName} 생성 도구`;
  }

  const feature = data.mvp?.single_feature ?? data.automation_target?.selected_task ?? "";
  const fromFeature = feature.match(/(?:만들|생성|출력|정리)(?:한다|하는)?\s*([가-힣A-Za-z0-9·\s]{2,24})/u)?.[1];
  if (fromFeature) return `${compactCardLine(fromFeature, 22)} 도구`;

  return projectName || "실습 결과물 생성 도구";
}

function buildSlide3Title(data, content) {
  const impact = firstLine(content.field_impact_bullets);
  const output = data.case_study?.mvp_result ?? data.mvp?.demo_output ?? "";
  const problem = data.problem?.actual_work_problem ?? "";
  const people = data.problem?.people_affected ?? "";
  const context = `${output} ${problem} ${people}`;

  if (/제보|분류|답변/u.test(context)) {
    return "AI가 제보를 분류하고, 사람은 책임 있게 답합니다";
  }
  if (/식품|지원|신청|복지/u.test(context)) {
    return "AI가 긴급도 근거를 정리하고, 사람은 지원을 판단합니다";
  }
  if (/멘토링|청소년|일지|위험|신호/u.test(context)) {
    return "AI가 위험 신호를 정리하고, 사람은 필요한 도움을 판단합니다";
  }
  if (/우선순위|긴급/u.test(context)) {
    return "AI가 우선순위를 정리하고, 사람은 현장 판단에 집중합니다";
  }
  if (impact) {
    return `AI가 반복 단서를 정리하고, 사람은 ${compactCardLine(impact, 10)}합니다`;
  }
  return "AI가 반복 업무를 정리하고, 사람은 현장 판단에 집중합니다";
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

function buildSlide1Title(data) {
  const workflowType = data.library_metadata?.workflow_type ?? "";
  const problem = data.problem?.actual_work_problem ?? "";
  const mvp = data.mvp?.single_feature ?? data.automation_target?.selected_task ?? "";
  const text = `${workflowType} ${problem} ${mvp}`;

  if (/일지|멘토링/u.test(text)) {
    return "놓치기 쉬운 신호를 먼저 볼 순서로 정리합니다";
  }
  if (/제보|분류|라우팅|답변 초안/u.test(text)) {
    return "흩어진 제보를 대응 순서와 답변 초안으로 정리합니다";
  }
  if (/신청서검토|신청서|상담 메모|우선순위/u.test(text)) {
    return "반복 검토에 묶인 시간을 우선순위 판단으로 돌립니다";
  }
  return "반복 업무에 묶인 시간을 현장 판단으로 돌립니다";
}

function buildFieldProblemBullets(data) {
  const problem = data.problem?.actual_work_problem ?? "";
  const input = data.current_workflow?.inputs ?? "";
  const pain = data.existing_workflow?.current_pain_points ?? data.problem?.blocked_moment ?? "";
  const role = personRole(data.problem?.people_affected ?? "");

  return cardLines([
    `${materialName(input || problem)} 반복 확인`,
    problemDelayLine(problem, pain),
    `${role} 판단 부담 증가`,
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
    compactCardLine(blocked, 18),
    compactCardLine(pain, 18),
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
  return cardLines([
    `${materialName(data.mvp?.demo_input ?? "")} 입력`,
    data.mvp?.single_feature ?? "핵심 흐름 자동 정리",
    data.mvp?.demo_output ?? output,
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
  const review = data.human_in_the_loop?.review_points ?? "";
  return cardLines([
    /AI/u.test(boundary) ? "AI는 판단 보조까지만" : "최종 결정은 사람 몫",
    "개인정보·민감정보 제외",
    reviewLine(review || boundary),
  ]);
}

function splitPeopleAffected(text) {
  const parts = compact(text)
    .split(/\s*(?:와|과|및|,|，|\/)\s*/u)
    .map(trimEnd)
    .filter(Boolean);
  return parts;
}

function inferWorkActor(data) {
  const people = splitPeopleAffected(data.problem?.people_affected ?? "");
  const actor = people.find((part) => /담당자|코디네이터|활동가|멘토|복지|기관|실무자|직원|교사|상담사|운영자/u.test(part));
  return actor || people[0] || "업무를 처리하는 사람";
}

function inferBeneficiary(data) {
  const people = splitPeopleAffected(data.problem?.people_affected ?? "");
  const actor = inferWorkActor(data);
  const beneficiary = people.find((part) => part !== actor && /청소년|주민|가구|참여자|수혜|신청|아동|학생|어르신|장애|보호자|지역/u.test(part));
  return beneficiary || people.find((part) => part !== actor) || "도움을 받거나 영향을 받는 사람";
}

function expectedChangeSummary(content) {
  const items = String(content.field_impact_bullets ?? "")
    .split("\n")
    .map(trimEnd)
    .filter(Boolean);
  if (items.length === 0) return "업무 지연과 누락이 줄고 필요한 조치가 더 빠르게 이어진다";
  if (items.length === 1) return items[0];
  return items.join(" / ");
}

function buildProblemImagePrompt(data) {
  const actual = data.problem?.actual_work_problem ?? "";
  const people = data.problem?.people_affected ?? "";
  const moment = data.problem?.blocked_moment ?? "";
  const inputs = data.current_workflow?.inputs ?? "";
  const steps = data.current_workflow?.steps ?? "";
  const pain = data.existing_workflow?.current_pain_points ?? "";

  return `아래 참가자 입력을 바탕으로, 이 팀의 문제가 실제 현장에서 드러나는 순간을 추론해 한 장의 현실적인 이미지로 표현해줘.

참가자 답변

- 실제 업무 문제: ${actual}
- 가장 어려움을 겪는 사람: ${people}
- 문제가 발생하는 순간: ${moment}
- 입력 자료/현장 단서: ${inputs}
- 현재 처리 흐름: ${steps}
- 불편한 지점: ${pain}

이미지 생성 요청

이 이미지는 해결책을 보여주는 것이 아니라, 아직 해결되지 않은 현재의 문제상황을 보여주기 위한 것이다. 입력된 내용을 읽고, 어떤 장소·관계·상황에서 문제가 가장 잘 드러나는지 먼저 판단한 뒤 최종 이미지 1장만 만들어줘.

다음 요소가 자연스럽게 드러나게 표현해줘.

1. 이 팀의 입력에서 드러나는 실제 현장 맥락
2. 가장 어려움을 겪는 사람이 마주한 부담, 지연, 누락, 혼선, 판단 어려움
3. 문제의 사회적 맥락과 왜 해결이 필요한지 3초 안에 이해되는 상태
4. 해결 전 상태임이 분명한 분위기
5. 특정 소품보다 문제의 원인과 결과가 자연스럽게 보이는 장면

중요한 방향

- 사무실, 책상, 노트북, 서류, 회의, 체크리스트 장면으로 기본값처럼 만들지 말아줘.
- 그런 요소는 참가자 입력상 반드시 필요할 때만 보조적으로 사용해줘.
- 팀의 실제 맥락에 더 맞는 현장, 관계, 공간, 상황이 있다면 그것을 우선해줘.

단, 다음은 포함하지 말아줘.

- AI가 이미 문제를 해결해주는 장면
- 자동화된 대시보드나 완성된 시스템 화면
- 과장되거나 자극적인 고통 표현
- 특정 개인을 비난하는 듯한 연출
- 실제 개인정보, 이름, 전화번호, 주소, 주민번호, 얼굴이 특정되는 정보
- 읽어야 이해되는 긴 문장이나 복잡한 텍스트

현실적인 사진 스타일로, 발표자료에 넣었을 때 문제상황이 직관적으로 보이는 최종 한 장면으로 만들어줘.`;
}

function buildSolutionImagePrompt(data, content) {
  const actual = data.problem?.actual_work_problem ?? "";
  const moment = data.problem?.blocked_moment ?? "";
  const workActor = inferWorkActor(data);
  const beneficiary = inferBeneficiary(data);
  const change = expectedChangeSummary(content);

  return `아래 내용을 바탕으로, 문제가 해결된 뒤의 상황을 최종 후보 1장의 현실적인 이미지로 표현해 주세요.

이 이미지는 문제 상황을 보여주는 것이 아니라,
업무 흐름이 개선된 이후 업무당사자와 수혜자가 더 편안하고 자연스럽게 연결되는 장면을 보여주기 위한 것입니다.

입력 정보

* 해결하고 싶은 실제 업무 문제와 맥락: ${actual}${moment ? ` 특히 ${moment}처럼 업무가 몰리거나 지연되기 쉬운 순간에 문제가 두드러진다.` : ""}
* 업무를 처리하는 사람: ${workActor}
* 도움을 받거나 영향을 받는 사람: ${beneficiary}
* 개선 후 기대되는 변화: ${change}

이미지 방향

* 분위기는 밝고 차분하며, 안도감과 정리된 느낌이 나야 합니다.
* 업무당사자와 수혜자가 서로 분리되어 있지 않고, 같은 흐름 안에서 자연스럽게 연결되어 보여야 합니다.
* 도움이나 처리가 더 빠르고 편안하게 이어지는 상태를 사람들의 자세, 시선, 거리감, 공간 분위기, 상호작용으로 표현해 주세요.
* 한국어/국내 맥락처럼 자연스럽게 보이되, 읽을 수 있는 글자나 영어 포스터는 넣지 마세요.
* 수혜자는 배경에 혼자 떨어져 있지 않고, 업무당사자와 같은 상호작용 안에서 장면의 한 축으로 보여야 합니다.
* 실제 얼굴이 식별되지 않도록 해 주세요. 단, 사람들을 모두 뒷모습으로만 표현하지 말고, 옆모습, 손동작, 시선 방향, 열린 자세 등으로 긍정적인 상호작용이 느껴지게 해 주세요.
* 문서나 화면은 중심이 아니라 보조 단서로만 작게 표현해 주세요.
* 화면, 문서, 자료가 등장해도 실제 이름, 연락처, 주소, 기관명, 학교명, 민감한 내용, 읽을 수 있는 개인정보는 절대 보이지 않게 해 주세요.

피해야 할 것

* 문제가 아직 해결되지 않은 것처럼 보이는 장면
* 읽을 수 있는 글자, 영어 포스터, 기관 표어, 안내문이 눈에 띄는 장면
* 실제 개인정보나 민감한 문장이 읽히는 화면 또는 문서
* 특정 숫자, 실제 기관명, 실제 이름이 보이는 장면

핵심 의도

이 이미지의 중심은 “문제를 겪는 사람”이 아니라,
개선된 흐름 덕분에 사람들이 더 빠르고 편안하게 연결되는 상태입니다.
여러 후보를 만들지 말고 발표자료에 바로 넣을 최종 이미지 1장만 만들어 주세요.`;
}

function buildContent(data, input) {
  return {
    team_name: data.team?.name ?? data.team_name ?? "",
    project_name: data.project?.name ?? data.project_name ?? data.case_study?.title ?? "",
    slide1_title: input.slide1_title ?? buildSlide1Title(data),
    field_problem_bullets: input.field_problem_bullets ?? buildFieldProblemBullets(data),
    core_bottleneck_bullets: input.core_bottleneck_bullets ?? buildBottleneckBullets(data),
    mvp_scope_bullets: input.mvp_scope_bullets ?? buildMvpBullets(data),
    slide2_title: input.slide2_title ?? buildSlide2Title(data),
    workflow_steps: input.workflow_steps ?? flowLines(data.mvp?.included_workflow_steps ?? data.ai_agent_design?.changed_workflow ?? "", 5),
    output_items: input.output_items ?? outputLines(data.case_study?.mvp_result ?? data.mvp?.demo_output ?? "", 4),
    field_impact_bullets: input.field_impact_bullets ?? buildFieldImpactBullets(data),
    slide3_title: input.slide3_title ?? buildSlide3Title(data, {
      field_impact_bullets: input.field_impact_bullets ?? buildFieldImpactBullets(data),
    }),
    responsible_use_bullets: input.responsible_use_bullets ?? buildResponsibleUseBullets(data),
  };
}

async function writeExampleInput(inputDir) {
  const examplePath = path.join(inputDir, "presentation-input.example.json");
  await fs.writeFile(examplePath, JSON.stringify({
    slide1_title: "",
    field_problem_bullets: "",
    core_bottleneck_bullets: "",
    mvp_scope_bullets: "",
    slide2_title: "",
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
  const problemPrompt = buildProblemImagePrompt(data);
  const solutionPrompt = buildSolutionImagePrompt(data, content);
  const outDir = path.join(source.dir, "outputs");
  const assetsDir = path.join(source.dir, "presentation-assets");

  const optionalAssets = [];
  const generatedAssets = [];
  if (!await exists(path.join(assetsDir, "result_screenshot.png"))) {
    optionalAssets.push({
      key: "result_screenshot",
      path: path.join(assetsDir, "result_screenshot.png"),
      question: "2페이지 결과물 캡처가 있으면 presentation-assets/result_screenshot.png로 넣어주세요. 없으면 사용자가 '2페이지 캡처는 비워도 됩니다'라고 명시한 경우에만 비웁니다.",
    });
  }
  if (!await exists(path.join(assetsDir, "problem_image.png"))) {
    generatedAssets.push({
      key: "problem_image",
      path: path.join(assetsDir, "problem_image.png"),
      prompt: path.join(outDir, "problem-image-prompt.txt"),
      action: "1페이지 문제상황 이미지는 없으면 이 프롬프트로 최종 후보 1장만 생성합니다.",
    });
  }
  if (!await exists(path.join(assetsDir, "solution_image.png"))) {
    generatedAssets.push({
      key: "solution_image",
      path: path.join(assetsDir, "solution_image.png"),
      prompt: path.join(outDir, "solution-image-prompt.txt"),
      action: "3페이지 해결 후 현장 이미지는 없으면 이 프롬프트로 최종 후보 1장만 생성합니다.",
    });
  }

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "presentation-placeholder-content.json"), JSON.stringify(content, null, 2));
  await fs.writeFile(path.join(outDir, "problem-image-prompt.txt"), problemPrompt);
  await fs.writeFile(path.join(outDir, "solution-image-prompt.txt"), solutionPrompt);
  const examplePath = await writeExampleInput(source.dir);

  console.log(JSON.stringify({
    inputDir: source.dir,
    dataSource: source.sourcePath,
    dataSourceType: source.type,
    content: path.join(outDir, "presentation-placeholder-content.json"),
    problemImagePrompt: path.join(outDir, "problem-image-prompt.txt"),
    solutionImagePrompt: path.join(outDir, "solution-image-prompt.txt"),
    optionalInput: path.join(source.dir, "presentation-input.json"),
    exampleInput: examplePath,
    optionalAssets,
    generatedAssets,
    nextAction: "최종 Google Slides 템플릿 사본에 placeholder와 이미지를 채우세요.",
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
