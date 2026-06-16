# Codex Impact Presentation Skill

Codex Impact Workshop 참가팀의 기록과 발표 입력을 바탕으로 3분 발표용 Google Slides를 자동으로 채우는 Codex 스킬입니다.

## 하는 일

- 참가자 입력 폴더에서 `input.json`, `workshop.json`, 또는 워크숍 산출물 Markdown을 읽습니다.
- 발표용 짧은 문구와 문제상황 이미지 프롬프트를 만듭니다.
- 사회혁신가/개발자 회고가 없으면 먼저 묻도록 안내합니다.
- 최종 Google Slides 템플릿 사본에 텍스트와 이미지를 채우도록 지시합니다.

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

`result_screenshot.png`는 없으면 캡처 영역을 비워두고 진행할 수 있습니다.

## 회고 입력

최종 발표자료를 만들기 전에는 아래 두 문장을 참가자에게 직접 받아야 합니다.

- 사회혁신가 회고 한 문장
- 개발자 회고 한 문장

받은 회고는 참가자 입력 폴더의 `presentation-input.json`에 저장합니다.

```json
{
  "reflection_social_innovator": "반복 검토를 줄이고 판단에 집중할 가능성을 확인했다.",
  "reflection_developer": "자동화보다 사람의 검토 흐름 설계가 중요하다는 점을 확인했다."
}
```

## 발표 문구만 먼저 만들기

```bash
node ~/.codex/skills/codex-impact-presentation/scripts/prepare-presentation-content.mjs --input-dir /path/to/my-team
```

생성물은 참가자 입력 폴더 안의 `outputs/`에 만들어집니다.

## 주의

- Google Slides 템플릿은 스킬의 `SKILL.md`에 있는 링크를 사용합니다.
- 템플릿 링크는 복사 가능한 권한으로 공유되어 있어야 합니다.
- 발표자 노트는 만들거나 수정하지 않습니다.
- 예전 PPTX 결과물은 재사용하지 않습니다.
