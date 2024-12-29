import { Behavior } from "../behavior.js";
import { getMatchName, getUnderlyingMatch, matchesEqual } from "../utils/match.js";
import { FieldsetActiveMatchType, Match } from "vex-tm-client";
import { log } from "../utils/logging.js";

export const RecordingBehavior: Behavior = async ({ associations, attachments, connections, recordingOptions }) => {
    const { recordIndividualMatches } = recordingOptions;
    const { division, fieldset } = attachments;
    const { obs, tm } = connections;

    let sku: string | undefined = undefined;
    const eventInfo = await fieldset.client.getEventInfo();
    if (eventInfo.success) {
        sku = eventInfo.data.code;
    }

    let multipleDivisions = false;
    const divisions = await tm.getDivisions();
    if (!divisions.success) {
        log("error", `Failed to fetch divisions. ${divisions.error}`);
    } else {
        multipleDivisions = divisions.data.length > 1;
    }

    let defaultFileFormat = "";
    if (obs) {
        const result = await obs.call("GetProfileParameter", { parameterCategory: "Output", parameterName: "FilenameFormatting" })
        defaultFileFormat = result.parameterValue;
    };

    process.on("exit", async () => {
        await stopRecording();
    });

    if (!recordIndividualMatches) {
        return;
    };

    async function startRecording() {
        if (!obs || !recordIndividualMatches) return;

        const { outputActive } = await obs.call("GetRecordStatus");
        if (outputActive) return;

        let filename = [new Date().toISOString().replaceAll(/:/g, "-")];

        if (sku) {
            filename.push(sku);
        }

        if (multipleDivisions) {
            filename.push(division.name.replaceAll("  ", ""));
        }

        const fieldsetMatch = fieldset.state.match;
        const matchName = getMatchName(fieldsetMatch);
        let match: Match | undefined = undefined;

        const matches = await division.getMatches();
        if (!matches.success) {
            log("error", `Failed to fetch matches.${matches.error} `);
        } else {
            match = matches.data.find(m => matchesEqual(m.matchInfo.matchTuple, getUnderlyingMatch(fieldsetMatch)));

            filename.push(matchName.replaceAll(" ", ""));

            for (const alliance of match?.matchInfo.alliances ?? []) {
                filename.push(alliance.teams.map(t => t.number).join("_"));
            };
        };

        const parameterValue = filename.join("_");
        log("info", `Match ${matchName} Video: ${parameterValue} `);

        await obs.call("SetProfileParameter", { parameterCategory: "Output", parameterName: "FilenameFormatting", parameterValue });
        await obs.call("StartRecord");
    };

    async function stopRecording() {
        if (!obs || !recordIndividualMatches) return;

        const { outputActive } = await obs.call("GetRecordStatus");
        if (!outputActive) return;

        await obs.call("StopRecord");
        await obs.call("SetProfileParameter", { parameterCategory: "Output", parameterName: "FilenameFormatting", parameterValue: defaultFileFormat })
    }

    fieldset.on("matchStarted", async event => {

        const match = fieldset.state.match;
        if (match.type !== FieldsetActiveMatchType.Match) {
            return;
        }

        await startRecording();
    });

    fieldset.on("matchStopped", async event => {
        setTimeout(async () => {
            await stopRecording();
        }, 3000);
    });
};
