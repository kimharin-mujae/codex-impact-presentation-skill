---
name: codex-impact-presentation
description: Codex Impact Workshop 참가팀의 PLAN.md, MEMORY.md, WORKFLOW_ANALYSIS.md, CASE_STUDY.md, input.json, workshop.json, result_screenshot.png를 바탕으로 지정된 Google Slides 템플릿을 복사해 5장 사례 발표자료를 자동으로 채우는 스킬입니다. 사용자가 /codex-impact-presentation, Codex Impact 발표자료, 3분 발표, 사례 발표 Google Slides, 샘플ppt2 디자인으로 발표자료 만들기를 요청할 때 사용합니다.
---

# Codex Impact Presentation

Codex Impact Workshop 참가팀의 결과를 지정된 Google Slides 템플릿으로 5장짜리 사례 발표자료로 만든다. 목표는 긴 보고서가 아니라 “현장 문제 -> AI 에이전트 MVP -> 적용 효과”를 샘플 디자인 안에서 짧게 보여주는 것이다.

## Template

Always start from this native Google Slides template:

https://docs.google.com/presentation/d/13pVNcDsFf1DX6emPLjOt1NvtPE9xpkh02GQAbs3IT1g/edit?usp=sharing

Never edit the template directly. Copy it first, then fill the copy.

The template has exactly five slides:

1. Cover: project title, subtitle, presenter names and one-line introductions
2. Field Problem: one headline and three problem/evidence lines
3. Solution: before/after comparison
4. Workflow: three operating steps and optional result screenshot
5. Field Application: impact headline and two impact cards

The deck is for a strict 3-minute presentation. Add speaker notes to all five slides with this timing:

- Slide 1: 25 seconds, 0:00-0:25
- Slide 2: 35 seconds, 0:25-1:00
- Slide 3: 45 seconds, 1:00-1:45
- Slide 4: 40 seconds, 1:45-2:25
- Slide 5: 35 seconds, 2:25-3:00

Slide 1 speaker notes must start with a total-time notice:

`[전체 발표 시간: 3분]`
`시간 관계상 각 슬라이드별 권장 시간을 지켜 발표해 주세요.`

## Required Workflow

1. Confirm the participant input folder.
2. Before reading or preparing slide content, ask for the cover one-line introductions one at a time. Do not ask both in the same message.
3. Before asking the social innovator intro, briefly explain with exactly this Korean wording: `표지에 발표자를 소개하기 위해 한줄소개가 필요합니다.`
4. Ask the social innovator intro with exactly this Korean wording: `사회혁신가 한줄소개를 입력해주세요. (공백 포함 65자 이내)`
5. After the user answers with a valid social innovator intro, ask the developer intro with exactly this Korean wording: `개발자 한줄소개를 입력해주세요. (공백 포함 65자 이내)`
6. Each intro must be 65 Korean/Latin characters or fewer, including spaces. If either answer is longer than 65 characters, ask the user to shorten it before continuing.
7. Do not search the source files for these intros and do not infer them from the case text.
8. Put the user's exact confirmed intros in `presentation-input.json` as `social_innovator_intro` and `developer_intro` before preparing content.
9. Read the available source files in this priority order: `input.json`, `workshop.json`, then markdown files.
10. Run the content-preparation script.
11. Copy the Google Slides template with the Google Drive connector.
12. Read back the copied presentation and confirm it has five slides.
13. Run the request-builder script to create the text replacement request list.
14. Apply the requests to the copied deck with Google Slides `batchUpdate`.
15. If `presentation-assets/result_screenshot.png` exists, insert it on slide 4 over the screenshot slot. If it is missing, leave the template placeholder.
16. Read back the edited deck and check that sample text was replaced.
17. Get fresh thumbnails for all five slides and visually inspect for obvious overflow, overlap, or missed placeholders.

Do not create a local PPTX as the final artifact. The final deliverable is the copied, editable Google Slides deck.

## Input Folder

If the user gives a folder, use only that folder. If no folder is given, search the current folder and direct children for a participant input candidate. If multiple candidates exist, stop and ask which folder to use.

Recognized source files:

- `input.json`
- `workshop.json`
- `PLAN.md`
- `MEMORY.md`
- `WORKFLOW_ANALYSIS.md`
- `CASE_STUDY.md`

Optional override:

- `presentation-input.json`

Optional asset:

- `presentation-assets/result_screenshot.png`

`presentation-input.example.json` is only an example and must not be treated as real input.

## Scripts

Prepare text:

```bash
node ~/.codex/skills/codex-impact-presentation/scripts/prepare-presentation-content.mjs --input-dir <participant-folder>
```

Build Google Slides requests:

```bash
node ~/.codex/skills/codex-impact-presentation/scripts/build-google-slides-requests.mjs --input-dir <participant-folder>
```

The request-builder writes:

- `outputs/google-slides-requests.json`
- `outputs/google-slides-image-uris.txt` when a result screenshot exists

Apply `google-slides-requests.json` through the Google Drive connector `_batch_update_presentation` against the copied deck. If `google-slides-image-uris.txt` exists, pass its contents as the connector `image_uris` argument.

## Template Object Map

The request builder assumes the current template object IDs:

- Slide 1: `p1_i2` title, `p1_i7` subtitle, `p1_i8` social innovator role label, `g3f234d17e0b_0_4` social innovator name, `p1_i10` social innovator intro, `g3f234d17e0b_0_12` developer role label, `g3f234d17e0b_0_14` developer name, `g3f234d17e0b_0_13` developer intro, `p1_i12` month
- Slide 2: `p2_i2` title, `p2_i12`/`p2_i15`/`p2_i18` problem lines, `p2_i7` month
- Slide 3: `p3_i2` title, `p3_i12` before, `p3_i16` AI body, `p3_i18` human body, `p3_i7` month
- Slide 4: `p4_i11`/`p4_i14`/`p4_i17` workflow steps, `p4_i6` month, `p4_i18` screenshot background box, `p4_i19` screenshot placeholder text
- Slide 5: `p5_i9` impact title, `p5_i13` impact label 1, `p5_i14` impact detail 1, `p5_i17` impact label 2, `p5_i18` impact detail 2, `p5_i6` month
- Footer quote on all slides: `p1_i6`, `p2_i6`, `p3_i6`, `p4_i5`, `p5_i5`
- Speaker notes: `p1:notes_i3`, `p2:notes_i3`, `p3:notes_i3`, `p4:notes_i3`, `p5:notes_i3`

If the template changes and these object IDs are missing, stop and re-read the template instead of guessing.

## Result Screenshot

Slide 4 has a screenshot area. Use only a screenshot provided by the user at `presentation-assets/result_screenshot.png`.

If the screenshot is missing, still generate the deck and leave `결과물 캡처 자리` in place. Tell the user they can add `presentation-assets/result_screenshot.png` and rerun.

Do not search for a running app or invent a screenshot.

## Writing Style

- Keep each slide sparse.
- On the cover, list the social innovator first because the idea starts from their field problem. Put the social innovator in the first role/presenter slot and the developer in the second role/presenter slot.
- Put each presenter's one-line intro in the dedicated intro text box below their name. These intros must come from the user's answer, not from automatic extraction, and must be 65 characters or fewer including spaces.
- Prefer concrete nouns and short verbs over explanations.
- Do not paste long raw workshop answers into the deck.
- Keep slide 2 problem lines to one sentence each.
- Keep slide 4 workflow steps to three short steps.
- Do not prefix slide 4 workflow steps with generic labels such as `작동 1단계`.
- Keep slide 5 impact details compact enough to fit inside the two cards.
- Regenerate the footer quote for each case. Do not leave the template sample quote unchanged.
- Speaker notes should be a presenter script, not internal production guidance. Do not say placeholder notes such as "현재 캡처 자리는 실제 결과 화면이 들어갈 자리입니다."
- The central message is: AI organizes the starting point; people make responsible final decisions.

## Content Keys

The preparation script writes these keys:

- `project_title`
- `project_subtitle`
- `developer_name`
- `developer_intro`
- `social_innovator_name`
- `social_innovator_intro`
- `deck_month`
- `problem_title`
- `problem_points`
- `solution_title`
- `before_summary`
- `after_ai_summary`
- `after_human_summary`
- `workflow_steps`
- `impact_title`
- `time_label`
- `time_detail`
- `quality_label`
- `quality_detail`
- `footer_quote`
- `speaker_notes`

`presentation-input.json` may override any of these keys. For arrays, use JSON arrays.

## Validation

Before final handoff, verify:

- The final URL is the copied deck, not the source template.
- The copied deck has five slides.
- Template sample text such as `긴급식품지원`, `김무재`, and `평균 주말 누적 접수 건수 30~50건` no longer remains unless it is intentionally part of the participant content.
- The footer quote is specific to the case and is not the template sample quote.
- The cover lists the social innovator before the developer, with one-line introductions under both names.
- The cover introductions are user-provided and 65 characters or fewer including spaces.
- All five slides have 3-minute speaker notes, including per-slide seconds and time ranges.
- Slide 4 either contains the provided screenshot or intentionally keeps the placeholder.
- Fresh thumbnails for all five slides show no obvious text overflow, overlap, or missed placeholder.
