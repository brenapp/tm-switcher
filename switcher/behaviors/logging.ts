import { Behavior } from "./index";
import { log } from "../utils/logging";
import { getMatchName, getUnderlyingMatch, matchesEqual } from "../utils/match";
import type { MatchAlliance, MatchTuple } from "vex-tm-client/out/Match";

/**
 * Logging
 */
Behavior("LOGGING", async ({ associations, attachments, connections, recordingOptions, handles }) => {

    const { obs } = connections;
    const { division, fieldset } = attachments;
    const { timestamp } = handles;

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


    fieldset.on("matchStarted", async event => {
        const timecode = await getCurrentTimecode();
        const { fieldID } = event;
        const association = associations[fieldID];

        const matchName = fieldset.state.match ? getMatchName(fieldset.state.match) : "Match";
        log("info", `[${timecode}] ${matchName} started on field ${fieldID} [OBS: ${association?.obs ?? "none"}, ATEM: ${association?.atem ?? "none"}]`);

        let alliances: MatchAlliance[] = [];

        const matches = await division.getMatches();
        if (!matches.success) {
            log("error", `Could not fetch matches from Tournament Manager: ${matches.error}`);
        } else {
            const match = matches.data.find(m => matchesEqual(m.matchInfo.matchTuple, getUnderlyingMatch(fieldset.state.match)));
            if (match) {
                alliances = match.matchInfo.alliances;
            }
        }

        const teams = alliances.map(alliance => alliance.teams.map(team => team.number).join(" ")).join(" ");
        timestamp.write(`${new Date().toISOString()},${timecode},${matchName},${teams}\n`);


    });

    fieldset.on("matchStopped", async event => {
        const timecode = await getCurrentTimecode();
        const { fieldID } = event;
        const matchName = fieldset.state.match ? getMatchName(fieldset.state.match) : "Match";


        log("info", `[${timecode}] ${matchName} ended on field ${fieldID} `);
    });

    fieldset.on("fieldActivated", async event => {
        const timecode = await getCurrentTimecode();
        const { fieldID } = event;
        const association = associations[fieldID];

        const matchName = fieldset.state.match ? getMatchName(fieldset.state.match) : "Match";

        log("info", `[${timecode}] ${matchName} activated on field ${fieldID} [OBS: ${association?.obs ?? "none"}, ATEM: ${association?.atem ?? "none"}]`);
    });

    fieldset.on("fieldMatchAssigned", async event => {
        const timecode = await getCurrentTimecode();
        const { fieldID } = event;
        const association = associations[fieldID];

        const matchName = getMatchName(fieldset.state.match);
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
