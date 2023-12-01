import { Behavior } from "./index";
import { getMatchName, getUnderlyingMatch, matchesEqual } from "../utils/match";
import { log } from "console";
import { FieldsetActiveMatchType } from "vex-tm-client";

/**
 * Match Recording
 **/
Behavior("MATCH_RECORDING", async ({ associations, attachments, connections, recordingOptions }) => {

    const { recordIndividualMatches } = recordingOptions;
    const { division, fieldset } = attachments;
    const { obs, tm } = connections;

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

        let filename = [`${new Date().toISOString().replace(/:/g, "-")}`];

        if (multipleDivisions) {
            filename.push(`${division.name}`);
        }

        const currentMatch = fieldset.state.match

        const matches = await division.getMatches();
        if (!matches.success) {
            log("error", `Failed to fetch matches. ${matches.error}`);
        } else {
            const match = matches.data.find(m => matchesEqual(m.matchInfo.matchTuple, getUnderlyingMatch(currentMatch)));


            for (const alliance of match?.matchInfo.alliances ?? []) {
                filename.push(`${alliance.teams.map(t => t.number).join("_")}`);
            };
        };

        await obs.call("SetProfileParameter", { parameterCategory: "Output", parameterName: "FilenameFormatting", parameterValue: filename.join("_") })
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
});
