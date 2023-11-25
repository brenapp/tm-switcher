import { MatchTuple } from "vex-tm-client";
import { Behavior } from "./index";
import { getMatchName } from "../utils/output";

/**
 * Match Recording
 **/
Behavior("MATCH_RECORDING", async ({ associations, attachments, connections, recordingOptions }) => {

    const { recordIndividualMatches } = recordingOptions;
    const { division, fieldset } = attachments;
    const { obs } = connections;

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

        const filename = `${division?.name ?? ""}_${(currentMatch ? getMatchName(currentMatch) : "Match").replaceAll(/ /g, "_")} `;

        await obs.call("SetProfileParameter", { parameterCategory: "Output", parameterName: "FilenameFormatting", parameterValue: filename })
        await obs.call("StartRecord");
    };

    async function stopRecording() {
        if (!obs || !recordIndividualMatches) return;

        const { outputActive } = await obs.call("GetRecordStatus");
        if (!outputActive) return;

        await obs.call("StopRecord");
        await obs.call("SetProfileParameter", { parameterCategory: "Output", parameterName: "FilenameFormatting", parameterValue: defaultFileFormat })
    }

    let currentMatch: MatchTuple | null = null;

    fieldset.on("fieldMatchAssigned", async event => {
        const { match } = event;
        currentMatch = match;
    });

    fieldset.on("matchStarted", async event => {
        await startRecording();
    });

    fieldset.on("matchStopped", async event => {
        setTimeout(async () => {
            await stopRecording();
        }, 3000);
    });
});
