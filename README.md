# Codex Impact Presentation Skill

Codex Impact Workshop 참가팀의 자료를 바탕으로 5장짜리 3분 발표용 Google Slides를 자동으로 채우는 Codex 스킬입니다.

## 하는 일

- 참가자 입력 폴더에서 `input.json`, `workshop.json`, 또는 워크숍 산출물 Markdown을 읽습니다.
- 지정된 Google Slides 템플릿을 복사해 5장 발표자료를 만듭니다.
- 표지에 사회혁신가와 개발자 이름, 한줄소개를 넣습니다.
- 각 장표 발표자 노트에 3분 발표 대본과 장표별 권장 시간을 넣습니다.
- `presentation-assets/result_screenshot.png`가 있으면 4장 결과물 캡처 영역에 넣습니다.

## 설치

이 저장소를 받은 뒤, `codex-impact-presentation` 폴더를 Codex 스킬 폴더에 복사합니다.

```bash
mkdir -p ~/.codex/skills
cp -R codex-impact-presentation ~/.codex/skills/
```

그 다음 Codex를 새로 열거나 새 대화방을 열고 아래처럼 실행합니다.

```text
/codex-impact-presentation
```

## 참가자 입력 폴더 예시

```text
my-team/
  input.json
  PLAN.md
  MEMORY.md
  WORKFLOW_ANALYSIS.md
  CASE_STUDY.md
  presentation-assets/
    result_screenshot.png
```

`result_screenshot.png`가 없으면 4장 캡처 영역은 템플릿 placeholder로 남습니다.

## 실행 흐름

스킬은 발표자료를 만들기 전에 표지용 한줄소개를 한 명씩 물어봅니다.

```text
표지에 발표자를 소개하기 위해 한줄소개가 필요합니다.
사회혁신가 한줄소개를 입력해주세요. (공백 포함 65자 이내)
```

사회혁신가 소개를 받은 뒤 개발자 소개를 묻습니다.

```text
개발자 한줄소개를 입력해주세요. (공백 포함 65자 이내)
```

두 소개는 `presentation-input.json`의 `social_innovator_intro`, `developer_intro`로 저장해 사용합니다.

## 문구와 요청 파일 만들기

```bash
node ~/.codex/skills/codex-impact-presentation/scripts/prepare-presentation-content.mjs --input-dir /path/to/my-team
node ~/.codex/skills/codex-impact-presentation/scripts/build-google-slides-requests.mjs --input-dir /path/to/my-team
```

생성물은 참가자 입력 폴더 안의 `outputs/`에 만들어집니다.

## 주의

- Google Slides 템플릿은 스킬의 `SKILL.md`에 있는 링크를 사용합니다.
- 템플릿 원본을 직접 수정하지 않고 항상 사본을 만듭니다.
- 최종 결과물은 로컬 PPTX가 아니라 편집 가능한 Google Slides입니다.
- 한줄소개는 공백 포함 65자 이내여야 합니다.
