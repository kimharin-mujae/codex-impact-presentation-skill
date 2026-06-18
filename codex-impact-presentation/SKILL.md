---
name: codex-impact-presentation
description: Codex Impact Workshop 참가팀의 PLAN.md, MEMORY.md, WORKFLOW_ANALYSIS.md, CASE_STUDY.md, workshop.json과 발표용 이미지를 바탕으로 3분 발표 Google Slides를 자동으로 채우는 스킬입니다. 사용자가 /codex-impact-presentation 또는 발표자료, 3분 발표, Codex Impact 발표 템플릿 자동채우기를 요청할 때 사용합니다.
---

# Codex Impact Presentation

Codex Impact Workshop 참가팀이 3분 발표자료를 만들 때 사용한다. 목표는 긴 설명 자료가 아니라 “문제 -> 실습 결과 -> 현장 적용 방향”을 짧고 일관된 디자인으로 보여주는 Google Slides를 만드는 것이다.

## 기본 원칙

- 사용자가 만든 디자인 템플릿을 유지하고, 텍스트와 이미지만 채운다.
- 텍스트가 넘칠 것 같으면 문장을 더 짧게 줄인다. 디자인, 카드 크기, 폰트는 가능한 유지한다.
- 문제상황 이미지는 사용자가 주면 사용하고, 없으면 참가자 입력 파일을 바탕으로 이 팀의 실제 문제 맥락을 추론해 생성한다.
- 해결된 모습 이미지는 사용자가 주면 사용하고, 없으면 참가자 입력 파일을 바탕으로 이 팀이 만들려는 MVP가 작동했을 때의 결과 상태와 사회적 임팩트를 추론해 생성한다.
- 결과물 캡처는 사용자가 직접 캡처해서 제공한 이미지만 사용한다. 없으면 실행 가능한 앱을 찾거나 직접 캡처하려고 시도하지 말고, 사용자에게 `presentation-assets/result_screenshot.png`로 넣어달라고 요청한다.
- 예전 PPTX 생성 스크립트나 `outputs/Codex_Impact_Workshop_Filled_Presentation.pptx` 같은 기존 결과물을 재사용하지 않는다.
- 최종 발표자료는 항상 아래 Google Slides 템플릿의 사본에서 시작한다.
- 발표자 노트는 작성하거나 수정하지 않는다. 이 발표자료는 보이는 슬라이드 3장만 자동채우기 대상이다.

## 필수 실행 순서

아래 순서를 지킨다. 특히 2-3번이 끝나기 전에는 Google Slides 템플릿 사본을 만들지 않는다.

1. 참가자 입력 폴더를 확정한다.
2. Google Slides 사본에 발표 문구와 이미지를 업로드해도 되는지 사용자에게 확인한다.
3. 2페이지 결과물 캡처가 있는지 확인한다. 캡처가 없으면 사용자가 “2페이지 캡처는 비워도 됩니다”라고 명시한 경우에만 비운다.
4. 문구 생성 스크립트를 실행한다.
5. 없는 문제상황 이미지와 해결된 모습 이미지를 각 1장씩만 생성한다.
6. Google Slides 템플릿 사본을 만든다.
7. 텍스트와 지정된 이미지 슬롯만 교체한다.
8. 남은 placeholder와 썸네일을 확인한다.

## 스킬용 템플릿

Google Slides placeholder 템플릿:

https://docs.google.com/presentation/d/1CW9VJj3VqpyoG4th5S8qXHKXfyjAYEbvXoNYbm64hDA

이 템플릿은 사용자가 만든 디자인을 보존한 사본이다. 원본을 직접 수정하지 말고, 항상 복사본을 만들어 채운다.
이미지 교체 대상은 1페이지 `p1_i2`의 `{{problem_image}}` 슬롯, 2페이지 `result_screenshot_slot`의 `{{result_screenshot}}` 슬롯, 3페이지 `solution_image_slot`의 `{{solution_image}}` 슬롯이다.

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

`presentation-input.example.json`은 예시 양식일 뿐이며 실제 입력으로 사용하지 않는다.

## 사용자에게 물을 것

발표자료를 만들기 전에 반드시 아래 두 가지를 확인한다. 답을 받기 전에는 Google Slides 템플릿 사본을 만들지 않는다.

1. Google Slides 사본에 발표 문구와 이미지를 업로드해도 되는지
2. 2페이지 결과물 캡처 이미지를 직접 캡처해서 `presentation-assets/result_screenshot.png`로 넣어줄 수 있는지

문제상황 이미지는 없으면 생성할 수 있으므로 필수로 요구하지 않는다.
해결된 모습 이미지도 없으면 생성할 수 있으므로 필수로 요구하지 않는다.

사용자에게는 아래처럼 짧게 묻는다.

```text
이 작업은 발표 문구와 생성 이미지를 Google Slides 사본에 업로드합니다.
진행하려면 “Google Slides에 발표 문구와 이미지를 업로드해도 됩니다”라고 승인해 주세요.

그리고 2페이지 결과물 캡처가 있으면 `presentation-assets/result_screenshot.png`로 넣어주세요.
바로 준비하기 어렵다면 “2페이지 캡처는 비워도 됩니다”라고 말해 주세요.
```

사용자가 업로드를 승인하지 않으면 Google Slides 사본을 만들지 않고 멈춘다. 사용자가 2페이지 캡처를 제공하지 않았고 “2페이지 캡처는 비워도 됩니다”라고 명시하지 않았으면 자동으로 비우고 진행하지 않는다.

## 문구 생성

작업 폴더 기준으로 아래 스크립트를 실행해 placeholder 내용을 만든다.

```bash
node ~/.codex/skills/codex-impact-presentation/scripts/prepare-presentation-content.mjs --input-dir <참가자_입력_폴더>
```

생성물:

- `outputs/presentation-placeholder-content.json`
- `outputs/problem-image-prompt.txt`
- `outputs/solution-image-prompt.txt`
- `presentation-input.example.json`

최종 발표자료를 만들 때는 `--strict`를 붙여 실행한다.

```bash
node ~/.codex/skills/codex-impact-presentation/scripts/prepare-presentation-content.mjs --input-dir <참가자_입력_폴더> --strict
```

## 이미지 처리

### 문제상황 이미지

우선순위:

1. `presentation-assets/problem_image.png`가 있으면 사용
2. 없으면 `outputs/problem-image-prompt.txt`로 현실적인 사진 스타일 이미지를 최종 후보 1장만 생성
3. 생성 이미지를 `presentation-assets/problem_image.png`로 저장

이미지는 해결책이 아니라 아직 해결되지 않은 현재 문제상황을 보여줘야 한다. 개인정보, 식별 가능한 얼굴, 완성된 AI 시스템 화면은 피한다.
프롬프트는 사무실, 책상, 노트북, 서류, 회의, 체크리스트 같은 특정 장면을 기본값처럼 유도하지 않는다. 그런 요소는 입력 맥락상 반드시 필요할 때만 보조 단서로 사용하고, 참가자 입력에서 드러나는 실제 현장·관계·문제 상태를 우선한다.

### 결과물 캡처

우선순위:

1. `presentation-assets/result_screenshot.png`가 있으면 사용
2. 없으면 실행 가능한 앱이나 화면을 찾지 않고 사용자에게 직접 캡처한 이미지를 요청한다
3. 사용자가 “2페이지 캡처는 비워도 됩니다”라고 명시한 경우에만 캡처 영역을 비운다

### 해결된 모습 이미지

우선순위:

1. `presentation-assets/solution_image.png`가 있으면 사용
2. 없으면 `outputs/solution-image-prompt.txt`로 현실적인 사진 스타일 이미지를 최종 후보 1장만 생성
3. 생성 이미지를 `presentation-assets/solution_image.png`로 저장

이미지는 문제가 해결된 뒤 현장 업무가 정돈되고 사람이 책임 있게 최종 판단하는 모습을 보여줘야 한다. 특정 제품 UI, 브랜드 로고, 개인정보, 식별 가능한 얼굴은 피한다.
프롬프트는 특정 업무 장면이나 도구 화면을 고정하지 않는다. 이 팀의 문제, 대상자, MVP 기능, 바뀐 업무 흐름, 산출물, 현장 변화 문구를 읽고, 실제로 무엇이 좋아졌는지와 그 사회적 임팩트가 보이는 해결 후 상태를 추론하게 한다. 해결 후 이미지는 업무 당사자의 편해진 모습에만 머물지 않고, 가능하면 수혜자·주민·참여자·현장 대상자에게 나타난 더 나은 상태가 함께 드러나야 한다.

### 이미지 생성 시간 제한

- 한 슬롯당 이미지는 1번만 생성한다. 여러 후보를 만들거나 후보를 비교하지 않는다.
- 생성된 이미지가 대체로 맥락에 맞고 실제 개인정보가 읽히지 않으면 그대로 사용한다.
- 얼굴이나 문구가 아주 조금 애매하다는 이유로 블러 처리, 후보 재선택, 재생성을 반복하지 않는다.
- 이미지가 명백히 실패한 경우에도 같은 작업 중 재생성은 최대 1회까지만 허용한다.
- 이미지가 마음에 들지 않을 수 있으면 완료 후 사용자에게 `presentation-assets/problem_image.png` 또는 `presentation-assets/solution_image.png`만 교체하면 된다고 안내한다.

### 템플릿 장식 요소

3페이지의 아이콘, 파란 원, 카드 장식은 템플릿 디자인의 일부이므로 교체하지 않는다. 자동채우기는 텍스트와 지정된 이미지 슬롯만 바꾼다.

## 슬라이드 채우기

Google Drive/Slides 도구가 가능하면 다음 순서로 작업한다.

1. 필수 실행 순서의 승인/캡처 조건이 충족된 뒤에만 placeholder 템플릿을 복사한다.
2. `outputs/presentation-placeholder-content.json`의 키와 `{{placeholder}}`를 매칭해 텍스트를 바꾼다.
3. `presentation-assets/problem_image.png`를 1페이지 기존 배경 이미지 슬롯에 `replaceImage`로 넣는다. 새 이미지를 위에 얹지 않는다.
4. `presentation-assets/result_screenshot.png`가 있으면 2페이지 캡처 영역에 넣는다. 사용자가 비워도 된다고 명시한 경우에만 `{{result_screenshot}}`를 빈 문자열로 치환하고 캡처 영역은 비워둔다.
5. `presentation-assets/solution_image.png`를 3페이지 해결된 모습 이미지 슬롯에 `replaceImage`로 넣는다.
6. 삽입 후 슬라이드 텍스트를 다시 읽어 placeholder가 남았는지 확인한다.
7. 가능하면 Google Slides 커넥터 썸네일로 레이아웃을 확인하고, 넘치는 문장은 더 짧게 다듬는다.

발표자 노트는 만들지 않는다. 템플릿에 기존 노트가 남아 있어도 사용자가 요청하지 않는 한 대본으로 고치거나 새로 정리하지 않는다.

중요: 로컬의 예전 PowerPoint 파일이나 예전 `scripts/autofill-presentation.mjs` 흐름으로 발표자료를 만들지 않는다. 디자인 일관성을 위해 Google Slides placeholder 템플릿을 복사한 뒤 텍스트와 이미지만 교체한다.

## 자동채우기 후 레이아웃 보정

- 1페이지 카드 라벨이 줄바꿈되면 라벨 폭을 넓히거나 안정적인 새 라벨 도형으로 교체한다.
- 카드 본문이 2줄 이상으로 과하게 감기면 문장을 더 짧게 줄인다.
- 3페이지 해결된 모습 이미지는 왼쪽 회색 박스 안에 맞추고, 오른쪽 카드 영역을 덮지 않는다.
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
- `{{slide2_title}}`
- `{{result_screenshot}}`
- `{{solution_image}}`
- `{{workflow_steps}}`
- `{{output_items}}`
- `{{slide3_title}}`
- `{{field_impact_bullets}}`
- `{{responsible_use_bullets}}`

## 기본 문체

- 제목은 “무엇을 어떻게 바꾼다”가 드러나는 문장으로 쓴다.
- 카드 안은 개조체로 쓴다.
- 카드 안에는 입력 원문을 그대로 자르거나 말줄임표로 끝나는 문장을 넣지 않는다.
- 카드 안에는 `->`, `→` 같은 흐름 기호를 넣지 않는다. 흐름은 줄 단위 짧은 개조체로 바꾼다.
- 카드 본문 각 줄은 가능하면 12~18자 안팎의 명사형/동사형으로 압축한다.
- 1페이지 카드는 각 3줄 이내로 유지한다.
- 2페이지 큰 제목은 단순 산출물명이 아니라, 팀이 만든 MVP/도구가 무엇인지 드러나는 제목으로 쓴다.
- 가능하면 “무엇을 처리하는 어떤 도구” 형식으로 쓴다. 예: “멘토링 일지 확인 필요 우선순위표 생성 도구”.
- 2페이지 작동 흐름은 최대 5줄, 산출 결과는 최대 4줄로 유지한다.
- 3페이지 큰 제목은 고정 문구를 쓰지 않고, “AI가 무엇을 정리·분류·요약하고, 사람은 어떤 판단·대응·연결에 집중하게 되는지”가 드러나도록 생성한다.
