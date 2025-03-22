import inquirer, { DistinctQuestion } from "inquirer";
import ObsWebSocket from "obs-websocket-js";
import {
  Client,
  Division,
  Fieldset,
  FieldsetAudienceDisplay,
} from "vex-tm-client";
import OBSWebSocket from "obs-websocket-js";
import { log } from "./logging.js";
import { promptReportIssue } from "./report.js";
import { deserializeOptions, getOptions } from "./options.js";
import { SwitcherConnections } from "behavior.js";
import { keypress } from "./keypress.js";


export type TournamentAttachments = {
  fieldset: Fieldset;
  division: Division;
};

export async function getTournamentAttachments(
  tm: Client
): Promise<TournamentAttachments> {
  const fieldsets = await tm.getFieldsets();
  if (!fieldsets.success) {
    log(
      "error",
      `❌ Tournament Manager: Could not fetch fieldsets ${fieldsets.error}`
    );
    log("error", `${fieldsets.error_details}`);

    await promptReportIssue(
      `Tournament Manager: Could not fetch fieldsets: ${JSON.stringify(
        fieldsets
      )}`
    );
    process.exit(1);
  }

  let fieldset = fieldsets.data[0];

  if (fieldsets.data.length > 1) {
    const response: { fieldset: number } = await inquirer.prompt([
      {
        name: "fieldset",
        type: "list",
        message: "Attach to which fieldset? ",
        choices: fieldsets.data.map((d) => ({ name: d.name, value: d.id })),
      },
    ]);

    fieldset = fieldsets.data.find(
      (d) => d.id === response.fieldset
    ) as Fieldset;
  }

  const result = await fieldset.connect();
  if (!result.success) {
    log(
      "error",
      `❌ Tournament Manager: Could not connect to Fieldset ${result.error}`
    );
    log("error", `${result.error_details}`);

    await promptReportIssue(
      `Tournament Manager: Could not connect to Fieldset: ${JSON.stringify(
        result
      )}`
    );
    process.exit(1);
  }

  const divisions = await tm.getDivisions();
  if (!divisions.success) {
    log(
      "error",
      `❌ Tournament Manager: Could not fetch divisions ${divisions.error}`
    );
    log("error", `${divisions.error_details}`);
    await promptReportIssue(
      `Tournament Manager: Could not fetch divisions: ${JSON.stringify(
        divisions
      )}`
    );
    process.exit(1);
  }

  let division = divisions.data[0];

  if (divisions.data.length > 1) {
    const response: { division: number } = await inquirer.prompt([
      {
        name: "division",
        type: "list",
        message: "Attach to which division? ",
        choices: divisions.data.map((d) => ({ name: d.name, value: d.id })),
        default: division.id,
      },
    ]);

    division = divisions.data.find(
      (d) => d.id === response.division
    ) as Division;
  }

  return {
    fieldset,
    division,
  };
}

export type Association = {
  obs: string | undefined;
  atem: number | undefined;
};

export type FieldAssociations = Record<string, Association | undefined>;

export async function getAssociations(
  fieldset: Fieldset,
  obs: ObsWebSocket | null,
): Promise<FieldAssociations> {
  const fields = await fieldset.getFields();
  if (!fields.success) {
    log(
      "error",
      `❌ Tournament Manager: Could not fetch fields in fieldset ${fields.error}`
    );
    log("error", `${fields.error_details}`);

    await keypress();
    process.exit(1);
  }

  const scenes = (await obs?.call("GetSceneList")) ?? { scenes: [] };
  const associations: FieldAssociations = {};

  for (const field of fields.data) {
    const questions: DistinctQuestion[] = [];
    const initial: Association = { obs: undefined, atem: undefined };

    if (obs && scenes.scenes.length > 0) {
      const defaultValue = scenes.scenes.find(
        (s) => `${s.sceneName}`.toLowerCase() === field.name.toLowerCase()
      )?.sceneName as string | undefined;
      questions.push({
        name: "obs",
        type: "list",
        message: `What OBS scene do you want to associate with ${field.name}? `,
        choices: scenes.scenes.map((s) => s.sceneName as string),
        default: defaultValue,
      });
    }


    const response = await inquirer.prompt<Association>(questions);
    associations[field.id] = response;
  }

  return associations;
}

export type DisplayAssociations = Record<
  FieldsetAudienceDisplay,
  Association | undefined
>;

const MODES = [
  FieldsetAudienceDisplay.Blank,
  FieldsetAudienceDisplay.Logo,
  FieldsetAudienceDisplay.SavedMatchResults,
  FieldsetAudienceDisplay.Schedule,
  FieldsetAudienceDisplay.Rankings,
  FieldsetAudienceDisplay.SkillsRankings,
  FieldsetAudienceDisplay.AllianceSelection,
  FieldsetAudienceDisplay.ElimBracket,
  FieldsetAudienceDisplay.Slides,
  FieldsetAudienceDisplay.Inspection,
];

export async function getDisplayAssociations(
  obs: ObsWebSocket | null,
): Promise<DisplayAssociations> {
  const associations: DisplayAssociations = {
    [FieldsetAudienceDisplay.Blank]: undefined,
    [FieldsetAudienceDisplay.Logo]: undefined,
    [FieldsetAudienceDisplay.Intro]: undefined,
    [FieldsetAudienceDisplay.InMatch]: undefined,
    [FieldsetAudienceDisplay.SavedMatchResults]: undefined,
    [FieldsetAudienceDisplay.Schedule]: undefined,
    [FieldsetAudienceDisplay.Rankings]: undefined,
    [FieldsetAudienceDisplay.SkillsRankings]: undefined,
    [FieldsetAudienceDisplay.AllianceSelection]: undefined,
    [FieldsetAudienceDisplay.ElimBracket]: undefined,
    [FieldsetAudienceDisplay.Slides]: undefined,
    [FieldsetAudienceDisplay.Inspection]: undefined,
  };

  const obsScenes = (await obs?.call("GetSceneList")) ?? { scenes: [] };

  if (obsScenes.scenes.length < 2) {
    return associations;
  }

  const { associated_scene } = await inquirer.prompt({
    name: "associated_scene",
    type: "confirm",
    message: "Associate Display Modes? ",
    default: false,
  });

  if (!associated_scene) {
    return associations;
  }

  for (const mode of MODES) {
    const { associate } = await inquirer.prompt({
      name: "associate",
      type: "confirm",
      message: `Switch on ${mode}? `,
      default: false,
    });

    if (!associate) {
      continue;
    }

    const questions: DistinctQuestion[] = [];
    if (obsScenes.scenes.length > 1) {
      const defaultValue = obsScenes.scenes.find((v) =>
        (v.sceneName as string).toLowerCase().includes(mode.toLowerCase())
      );
      questions.push({
        type: "list",
        name: "obs",
        message: `${mode} OBS Scene? `,
        default: defaultValue,
        choices: [
          ...obsScenes.scenes.map((s) => s.sceneName as string),
          { name: "No Association", value: undefined },
        ],
      });
    }

    associations[mode] = (await inquirer.prompt(questions)) as Association;
  }

  return associations;
}

export type RecordingOptions = {
  recordIndividualMatches: boolean;
};

export async function getRecordingOptions(
  obs: OBSWebSocket | null
): Promise<RecordingOptions> {
  let response = { recordIndividualMatches: false };
  if (obs) {
    response = await inquirer.prompt([
      {
        name: "recordIndividualMatches",
        type: "confirm",
        message: "Start and stop recording for each match? ",
        default: false,
      },
    ]);
  }

  return response;
}

export type AudienceDisplayOptions = {
  queueIntro: boolean;
  savedScore: boolean;
  flashRankings: boolean;
};

export async function getAudienceDisplayOptions(): Promise<AudienceDisplayOptions> {
  const choices = [
    { name: "Show intro upon field activation", value: "queueIntro" },
    { name: "Show saved score after match", value: "savedScore" },
    { name: "Show rankings after every 6th match", value: "flashRankings" },
  ] as const;

  const response: { options: (keyof AudienceDisplayOptions)[] } =
    await inquirer.prompt([
      {
        name: "options",
        type: "checkbox",
        message: "Which audience display automation would you like to enable?",
        choices,
      },
    ]);

  const flags = Object.fromEntries(
    choices.map((ch) => [ch.value, false])
  ) as AudienceDisplayOptions;
  for (const option of response.options) {
    flags[option] = true;
  }

  return flags;
}

export async function getSwitcherOptions(configPath: string, connections: SwitcherConnections) {
  const config = await getOptions(configPath);
  const options = await deserializeOptions(connections.tm, config);

  if (!!options) {

    const { useConfig } = await inquirer.prompt([
      {
        name: "useConfig",
        message: `Use configuration in ${configPath}?`,
        type: "confirm",
        default: true,
      }
    ]);

    if (useConfig) {
      return options;
    }
  }

  const attachments = await getTournamentAttachments(connections.tm);
  const associations = await getAssociations(attachments.fieldset, connections.obs);
  const displayAssociations = await getDisplayAssociations(connections.obs);
  const audienceDisplayOptions = await getAudienceDisplayOptions();
  const recordingOptions = await getRecordingOptions(connections.obs);

  return { attachments, associations, displayAssociations, audienceDisplayOptions, recordingOptions };
};

