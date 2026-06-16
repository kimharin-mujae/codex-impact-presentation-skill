---
name: codex-impact-presentation
description: Codex Impact Workshop 참가팀의 PLAN.md, MEMORY.md, WORKFLOW_ANALYSIS.md, CASE_STUDY.md, workshop.json과 발표용 이미지/회고 입력을 바탕으로 3분 발표 Google Slides를 자동으로 채우는 스킬입니다. 사용자가 /codex-impact-presentation 또는 발표자료, 3분 발표, Codex Impact 발표 템플릿 자동채우기를 요청할 때 사용합니다.
---

# Codex Impact Presentation

Codex Impact Workshop 참가팀이 3분 발표자료를 만들 때 사용한다. 목표는 긴 설명 자료가 아니라 “문제 -> 실습 결과 -> 현장 적용 방향”을 짧고 일관된 디자인으로 보여주는 Google Slides를 만드는 것이다.

## 기본 원칙

- 사용자가 만든 디자인 템플릿을 유지하고, 텍스트와 이미지만 채운다.
- 텍스트가 넘칠 것 같으면 문장을 더 짧게 줄인다. 디자인, 카드 크기, 폰트는 가능한 유지한다.
- 회고는 자동 생성하지 말고 참가자에게 직접 한 문장씩 받는다.
- 문제상황 이미지는 사용자가 주면 사용하고, 없으면 `workshop.json`의 문제정의 답변으로 생성한다.
- 결과물 캡처는 사용자가 제공하면 사용하고, 없으면 가능한 경우 Codex가 결과물 화면을 캡처한다.
- 예전 PPTX 생성 스크립트나 `outputs/Codex_Impact_Workshop_Filled_Presentation.pptx` 같은 기존 결과물을 재사용하지 않는다.
- 최종 발표자료는 항상 아래 Google Slides 템플릿의 사본에서 시작한다.
- 발표자 노트는 작성하거나 수정하지 않는다. 이 발표자료는 보이는 슬라이드 3장만 자동채우기 대상이다.

## 스킬용 템플릿

Google Slides placeholder 템플릿:

https://docs.google.com/presentation/d/11UTuEI6wkkPgmTxmAvST2awUkfTgcIcWaOgOXRBfaYc

이 템플릿은 사용자가 만든 디자인을 보존한 사본이다. 원본을 직접 수정하지 말고, 항상 복사본을 만들어 채운다.

## 입력 확인

먼저 참가자 입력 폴더를 확정한다. 사용자가 특정 폴더를 주면 그 폴더만 읽는다. 특정 폴더를 주지 않았고 현재 폴더와 하위 폴더에 입력 후보가 여러 개 있으면, 잘못된 샘플을 읽지 않도록 멈추고 어떤 폴더를 사용할지 물어본다.

참가자 입력 폴더에서 아래 파일을 우선 확인한다.

- `input.json`
- `workshop.json`
- `PLAN.md`
- `MEMORY.md`
- `WORKFLOW_ANALYSIS.md`
- `CASE_STUDY.md`

자동 문구 생성은 `input.json`을 최우선으로 사용하고, 없으면 `workshop.json`, 그것도 없으면 `PLAN.md`/`WORKFLOW_ANALYSIS.md`/`CASE_STUDY.md`를 읽는다. 사용자가 제목이나 문구를 직접 덮어쓰고 싶어하면 같은 입력 폴더 안에 `presentation-input.json`을 만들어 반영한다.

`presentation-input.example.json`은 예시 양식일 뿐이며 실제 입력으로 사용하지 않는다. 예시 문장이나 빈 문자열은 회고로 간주하지 않는다.

## 사용자에게 물을 것

발표자료를 만들기 전에 부족한 입력만 짧게 묻는다.

1. 사회혁신가 회고 한 문장
2. 개발자 회고 한 문장
3. 2페이지 결과물 캡처 이미지가 있는지

문제상황 이미지는 없으면 생성할 수 있으므로 필수로 요구하지 않는다.

회고가 없으면 최종 Google Slides 자동채우기를 진행하지 말고 먼저 질문한다. 회고는 문서에서 추측하거나 예시 문장을 사용하지 않는다.

## 문구 생성

작업 폴더 기준으로 아래 스크립트를 실행해 placeholder 내용을 만든다.

```bash
node ~/.codex/skills/codex-impact-presentation/scripts/prepare-presentation-content.mjs --input-dir <참가자_입력_폴더>
```

생성물:

- `outputs/presentation-placeholder-content.json`
- `outputs/problem-image-prompt.txt`
- `presentation-input.example.json`

회고를 받은 경우 `presentation-input.json`에 저장한 뒤 다시 실행한다.

예:

```json
{
  "reflection_social_innovator": "반복 검토를 줄이고 판단에 집중할 가능성을 확인",
  "reflection_developer": "자동화보다 사람의 검토 흐름 설계가 중요함"
}
```

최종 발표자료를 만들 때는 회고 누락을 막기 위해 `--strict`를 붙여 실행한다.

```bash
node ~/.codex/skills/codex-impact-presentation/scripts/prepare-presentation-content.mjs --input-dir <참가자_입력_폴더> --strict
```

## 이미지 처리

### 문제상황 이미지

우선순위:

1. `presentation-assets/problem_image.png`가 있으면 사용
2. 없으면 `outputs/problem-image-prompt.txt`로 현실적인 사진 스타일 이미지를 생성
3. 생성 이미지를 `presentation-assets/problem_image.png`로 저장

이미지는 해결책이 아니라 아직 해결되지 않은 현재 문제상황을 보여줘야 한다. 개인정보, 식별 가능한 얼굴, 완성된 AI 시스템 화면은 피한다.

### 결과물 캡처

우선순위:

1. `presentation-assets/result_screenshot.png`가 있으면 사용
2. 결과물이 웹앱이면 브라우저로 캡처해 저장
3. 없으면 캡처 영역은 비워두고 사용자에게 보충 가능하다고 알린다

### 3페이지 카드 아이콘

3페이지의 파란 원 안 아이콘은 Lucide 스타일의 흰색 PNG를 사용한다. 기존 초록색 아이콘 이미지를 그대로 두지 말고, 의미에 맞는 흰색 아이콘으로 교체한다.

기본 아이콘 자산:

- `assets/icons/trending-up.png`
- `assets/icons/shield-check.png`
- `assets/icons/message-circle.png`

기본 매칭:

- `현장에 생기는 변화` -> `trending-up.png`
- `안전하게 쓰기 위한 기준` -> `shield-check.png`
- `오늘의 회고` -> `message-circle.png`

텍스트 기반 매칭이 필요하면 아래 키워드를 우선한다.

- `변화`, `개선`, `빨리`, `발견`, `공유`, `효과` -> `trending-up.png`
- `안전`, `기준`, `개인정보`, `금지`, `확인`, `책임` -> `shield-check.png`
- `회고`, `배운`, `느낀`, `사회혁신가`, `개발자`, `한마디` -> `message-circle.png`

## 슬라이드 채우기

Google Drive/Slides 도구가 가능하면 다음 순서로 작업한다.

1. placeholder 템플릿을 복사한다.
2. `outputs/presentation-placeholder-content.json`의 키와 `{{placeholder}}`를 매칭해 텍스트를 바꾼다.
3. `presentation-assets/problem_image.png`를 1페이지 기존 배경 이미지 슬롯에 `replaceImage`로 넣는다. 새 이미지를 위에 얹지 않는다.
4. `presentation-assets/result_screenshot.png`가 있으면 2페이지 캡처 영역에 넣는다. 없으면 `{{result_screenshot}}`만 빈 문자열로 치환하고 캡처 영역은 그대로 둔다.
5. 삽입 후 슬라이드 텍스트를 다시 읽어 placeholder가 남았는지 확인한다.
6. 3페이지의 기존 아이콘 이미지 3개를 텍스트 의미에 맞는 흰색 Lucide PNG로 교체한다.
7. 가능하면 Google Slides 커넥터 썸네일로 레이아웃을 확인하고, 넘치는 문장은 더 짧게 다듬는다.

발표자 노트는 만들지 않는다. 템플릿에 기존 노트가 남아 있어도 사용자가 요청하지 않는 한 대본으로 고치거나 새로 정리하지 않는다.

중요: 로컬의 예전 PowerPoint 파일이나 예전 `scripts/autofill-presentation.mjs` 흐름으로 발표자료를 만들지 않는다. 디자인 일관성을 위해 Google Slides placeholder 템플릿을 복사한 뒤 텍스트와 이미지만 교체한다.

## 자동채우기 후 레이아웃 보정

- 1페이지 카드 라벨이 줄바꿈되면 라벨 폭을 넓히거나 안정적인 새 라벨 도형으로 교체한다.
- 3페이지 회고 영역은 템플릿의 불릿 스타일이 남을 수 있으므로 회고 텍스트 박스의 불필요한 paragraph bullets를 제거한다.
- 카드 본문이 2줄 이상으로 과하게 감기면 문장을 더 짧게 줄인다.
- 썸네일에서 빈 불릿, 남은 `{{placeholder}}`, 겹침, 잘림이 보이면 완료로 보지 않는다.
- 썸네일 URL을 `curl` 등으로 직접 내려받아 검증하지 않는다. 네트워크 제한으로 실패하기 쉬우므로 커넥터 썸네일 생성과 텍스트 readback 검증까지만 한다.

## Placeholder 목록

- `{{team_name}}`
- `{{project_name}}`
- `{{slide1_title}}`
- `{{problem_image}}`
- `{{field_problem_bullets}}`
- `{{core_bottleneck_bullets}}`
- `{{mvp_scope_bullets}}`
- `{{result_screenshot}}`
- `{{workflow_steps}}`
- `{{output_items}}`
- `{{slide3_title}}`
- `{{field_impact_bullets}}`
- `{{responsible_use_bullets}}`
- `{{reflection_social_innovator}}`
- `{{reflection_developer}}`

## 기본 문체

- 제목은 “무엇을 어떻게 바꾼다”가 드러나는 문장으로 쓴다.
- 카드 안은 개조체로 쓴다.
- 1페이지 카드는 각 3줄 이내로 유지한다.
- 2페이지 작동 흐름은 최대 5줄, 산출 결과는 최대 4줄로 유지한다.
- 3페이지 회고는 역할별 한 문장으로 유지한다.
