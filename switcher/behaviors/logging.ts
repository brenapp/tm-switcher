import { Behavior } from "./index";
import { log } from "../utils/logging";
import { getMatchName } from "../utils/match";
import { MatchTuple } from "vex-tm-client";

/**
 * Logging
 */
Behavior("LOGGING", async ({ associations, attachments, connections, recordingOptions }) => {

    const { obs } = connections;

    async function getCurrentTimecode() {
        const recordStatus = await obs?.call("GetRecordStatus");
        const streamStatus = await obs?.call("GetStreamStatus");

        // Get the current "stream time" in seconds
        let timecode = "00:00:00";

        if (recordStatus && recordStatus.outputActive && !recordingOptions.recordIndividualMatches) {
            timecode = recordStatus.outputTimecode;
        } else if (streamStatus && streamStatus.outputActive) {
            timecode = streamStatus.outputTimecode;
        };

        return timecode;
    };

    const { fieldset } = attachments;

    let currentMatch: MatchTuple | null = null;

    fieldset.on("matchStarted", async event => {
        const timecode = await getCurrentTimecode();
        const { fieldID } = event;
        const association = associations[fieldID];

        const matchName = currentMatch ? getMatchName(currentMatch) : "Match";
        log("info", `[${timecode}] ${matchName} started on field ${fieldID} [OBS: ${association?.obs ?? "none"}, ATEM: ${association?.atem ?? "none"}]`);
    });

    fieldset.on("matchStopped", async event => {
        const timecode = await getCurrentTimecode();
        const { fieldID } = event;
        const matchName = currentMatch ? getMatchName(currentMatch) : "Match";

        log("info", `[${timecode}] ${matchName} ended on field ${fieldID} `);
    });

    fieldset.on("fieldActivated", async event => {
        const timecode = await getCurrentTimecode();
        const { fieldID } = event;
        const association = associations[fieldID];

        const matchName = currentMatch ? getMatchName(currentMatch) : "Match";
        log("info", `[${timecode}] ${matchName} activated on field ${fieldID} [OBS: ${association?.obs ?? "none"}, ATEM: ${association?.atem ?? "none"}]`);
    });

    fieldset.on("fieldMatchAssigned", async event => {
        const timecode = await getCurrentTimecode();
        const { fieldID, match } = event;
        const association = associations[fieldID];

        currentMatch = match;

        const matchName = getMatchName(match);
        log("info", `[${timecode}] info: ${matchName} assigned to field ${fieldID} [OBS: ${association?.obs ?? "none"}, ATEM: ${association?.atem ?? "none"}]`);
    });

    fieldset.on("audienceDisplayChanged", async event => {
        const timecode = await getCurrentTimecode();

        log("info", `[${timecode}] Audience display changed to ${event.display}`);
    });

    fieldset.websocket?.addEventListener("message", event => {
        log("info", `TM: ${event.data}`, false);
    });

    fieldset.websocket?.addEventListener("close", event => {
        log("error", `TM: ${event.reason}`, false);
    })
});
