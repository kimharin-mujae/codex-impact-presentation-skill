import fs from "node:fs/promises";
import path from "node:path";

const CWD = process.cwd();

const TEXT_OBJECTS = {
  project_title: "p1_i2",
  project_subtitle: "p1_i7",
  problem_title: "p2_i2",
  solution_title: "p3_i2",
  before_summary: "p3_i12",
  impact_title: "p5_i9",
  time_label: "p5_i13",
  time_detail: "p5_i14",
  quality_label: "p5_i17",
  quality_detail: "p5_i18",
};

const MONTH_OBJECTS = ["p1_i12", "p2_i7", "p3_i7", "p4_i6", "p5_i6"];
const FOOTER_OBJECTS = ["p1_i6", "p2_i6", "p3_i6", "p4_i5", "p5_i5"];
const PROBLEM_OBJECTS = ["p2_i12", "p2_i15", "p2_i18"];
const WORKFLOW_OBJECTS = ["p4_i11", "p4_i14", "p4_i17"];
const SPEAKER_NOTE_OBJECTS = ["p1:notes_i3", "p2:notes_i3", "p3:notes_i3", "p4:notes_i3", "p5:notes_i3"];
const COLORS = {
  white: { red: 1, green: 1, blue: 1 },
  ink: { red: 0.050980393, green: 0.078431375, blue: 0.13725491 },
  muted: { red: 0.59607846, green: 0.6392157, blue: 0.69411767 },
};

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
  if (!args.inputDir) throw new Error("--input-dir is required");
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

function asList(value, length) {
  const items = Array.isArray(value)
    ? value.map((item) => String(item ?? ""))
    : String(value ?? "").split(/\n+/u).map((item) => item.trim()).filter(Boolean);
  while (items.length < length) items.push("");
  return items.slice(0, length);
}

function stripRole(value, role) {
  return String(value ?? "")
    .replace(new RegExp(`^${role}\\s*\\n?\\s*`, "u"), "")
    .trim();
}

function replaceTextRequest(objectId, text) {
  const value = String(text ?? "");
  return [
    { deleteText: { objectId, textRange: { type: "ALL" } } },
    { insertText: { objectId, insertionIndex: 0, text: value } },
  ];
}

function styleRequest(objectId, color, bold = false) {
  return {
    updateTextStyle: {
      objectId,
      textRange: { type: "ALL" },
      style: {
        foregroundColor: { opaqueColor: { rgbColor: color } },
        bold,
        fontFamily: "Arial",
      },
      fields: "foregroundColor,bold,fontFamily",
    },
  };
}

function nameStyleRequest(objectId) {
  return {
    updateTextStyle: {
      objectId,
      textRange: { type: "ALL" },
      style: {
        foregroundColor: { opaqueColor: { rgbColor: COLORS.white } },
        fontSize: { magnitude: 12, unit: "PT" },
        bold: true,
        fontFamily: "Arial",
      },
      fields: "foregroundColor,fontSize,bold,fontFamily",
    },
  };
}

function buildStyleRequests() {
  return [
    styleRequest("p1_i2", COLORS.white, true),
    styleRequest("p1_i7", COLORS.muted),
    styleRequest("p1_i8", COLORS.muted, true),
    nameStyleRequest("g3f234d17e0b_0_4"),
    styleRequest("p1_i10", COLORS.muted),
    styleRequest("g3f234d17e0b_0_12", COLORS.muted, true),
    nameStyleRequest("g3f234d17e0b_0_14"),
    styleRequest("g3f234d17e0b_0_13", COLORS.muted),
    ...MONTH_OBJECTS.map((objectId) => styleRequest(objectId, COLORS.muted, true)),
    ...FOOTER_OBJECTS.map((objectId) => styleRequest(objectId, COLORS.muted)),
    styleRequest("p2_i2", COLORS.ink, true),
    ...PROBLEM_OBJECTS.map((objectId) => styleRequest(objectId, COLORS.ink, true)),
    styleRequest("p3_i2", COLORS.ink, true),
    styleRequest("p3_i12", COLORS.ink),
    styleRequest("p3_i16", COLORS.white),
    styleRequest("p3_i18", COLORS.white),
    ...WORKFLOW_OBJECTS.map((objectId) => styleRequest(objectId, COLORS.ink, true)),
    styleRequest("p5_i9", COLORS.white, true),
    styleRequest("p5_i13", COLORS.ink, true),
    styleRequest("p5_i14", COLORS.ink),
    styleRequest("p5_i17", COLORS.ink, true),
    styleRequest("p5_i18", COLORS.ink),
  ];
}

function buildTextRequests(content) {
  const requests = [];
  for (const [key, objectId] of Object.entries(TEXT_OBJECTS)) {
    requests.push(...replaceTextRequest(objectId, content[key] ?? ""));
  }

  requests.push(...replaceTextRequest("p1_i8", "사회혁신가"));
  requests.push(...replaceTextRequest("g3f234d17e0b_0_4", content.social_innovator_name ?? ""));
  requests.push(...replaceTextRequest("p1_i10", content.social_innovator_intro ?? ""));
  requests.push(...replaceTextRequest("g3f234d17e0b_0_12", "개발자"));
  requests.push(...replaceTextRequest("g3f234d17e0b_0_14", content.developer_name ?? ""));
  requests.push(...replaceTextRequest("g3f234d17e0b_0_13", content.developer_intro ?? ""));

  for (const objectId of MONTH_OBJECTS) {
    requests.push(...replaceTextRequest(objectId, content.deck_month ?? ""));
  }

  for (const objectId of FOOTER_OBJECTS) {
    requests.push(...replaceTextRequest(objectId, content.footer_quote ?? ""));
  }

  for (const [index, objectId] of PROBLEM_OBJECTS.entries()) {
    requests.push(...replaceTextRequest(objectId, asList(content.problem_points, 3)[index]));
  }

  for (const [index, objectId] of WORKFLOW_OBJECTS.entries()) {
    requests.push(...replaceTextRequest(objectId, asList(content.workflow_steps, 3)[index]));
  }

  requests.push(...replaceTextRequest("p3_i16", content.after_ai_summary ?? ""));
  requests.push(...replaceTextRequest("p3_i18", `사람\n${stripRole(content.after_human_summary, "사람")}`.trim()));
  requests.push(...buildSpeakerNoteRequests(content));
  requests.push(...buildStyleRequests());
  requests.push(...buildRoleStyleRequests());

  return requests;
}

function buildSpeakerNoteRequests(content) {
  return asList(content.speaker_notes, 5).map((note, index) => ({
    insertText: {
      objectId: SPEAKER_NOTE_OBJECTS[index],
      insertionIndex: 0,
      text: note,
    },
  }));
}

function buildRoleStyleRequests() {
  const blue = { red: 0.24705882, green: 0.5764706, blue: 1 };
  return [
    {
      updateTextStyle: {
        objectId: "p3_i16",
        textRange: { type: "FIXED_RANGE", startIndex: 0, endIndex: 2 },
        style: { foregroundColor: { opaqueColor: { rgbColor: blue } }, bold: true, fontFamily: "Arial" },
        fields: "foregroundColor,bold,fontFamily",
      },
    },
    {
      updateTextStyle: {
        objectId: "p3_i18",
        textRange: { type: "FIXED_RANGE", startIndex: 0, endIndex: 2 },
        style: { foregroundColor: { opaqueColor: { rgbColor: blue } }, bold: true, fontFamily: "Arial" },
        fields: "foregroundColor,bold,fontFamily",
      },
    },
  ];
}

function screenshotRequests(screenshotPath) {
  return [
    {
      createImage: {
        objectId: "result_screenshot_image",
        url: screenshotPath,
        elementProperties: {
          pageObjectId: "p4",
          size: {
            width: { magnitude: 4953000, unit: "EMU" },
            height: { magnitude: 2643188, unit: "EMU" },
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: 3762375,
            translateY: 1119188,
            unit: "EMU",
          },
        },
      },
    },
    ...replaceTextRequest("p4_i19", ""),
  ];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputDir = path.resolve(CWD, args.inputDir);
  const outputDir = path.join(inputDir, "outputs");
  const contentPath = path.join(outputDir, "presentation-content.json");
  const screenshotPath = path.join(inputDir, "presentation-assets", "result_screenshot.png");

  const content = JSON.parse(await fs.readFile(contentPath, "utf8"));
  const requests = buildTextRequests(content);
  const hasScreenshot = await exists(screenshotPath);
  if (hasScreenshot) requests.push(...screenshotRequests(screenshotPath));

  await fs.mkdir(outputDir, { recursive: true });
  const requestsPath = path.join(outputDir, "google-slides-requests.json");
  await fs.writeFile(requestsPath, JSON.stringify(requests, null, 2));

  let imageUrisPath = null;
  if (hasScreenshot) {
    imageUrisPath = path.join(outputDir, "google-slides-image-uris.txt");
    await fs.writeFile(imageUrisPath, screenshotPath);
  }

  console.log(JSON.stringify({
    inputDir,
    requests: requestsPath,
    imageUris: imageUrisPath,
    requestCount: requests.length,
    hasScreenshot,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
