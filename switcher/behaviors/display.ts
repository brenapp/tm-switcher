import { FieldsetAudienceDisplay, MatchRound, MatchTuple } from "vex-tm-client";
import { Behavior } from "./index";
import { log } from "../utils/logging";

/**
 * Audience Display Automation
 **/
Behavior("AUDIENCE_DISPLAY", async ({ attachments, audienceDisplayOptions }) => {

    const { fieldset } = attachments;

    let currentMatch: MatchTuple | null = null;

    fieldset.on("fieldMatchAssigned", async event => {
        currentMatch = event.match;
    });

    fieldset.on("fieldActivated", async event => {
        if (audienceDisplayOptions.queueIntro) {
            log("info", "Field activated, showing intro");
            await fieldset.setAudienceDisplay(FieldsetAudienceDisplay.Intro)
        }
    });

    fieldset.on("matchStopped", () => {

        if (!currentMatch) return;
        if (currentMatch.round !== MatchRound.Qualification && currentMatch.round !== MatchRound.Practice) return;

        if (audienceDisplayOptions.flashRankings && currentMatch.match % 6 === 0) {
            setTimeout(async () => {
                log("info", "Match ended, showing rankings");
                await fieldset.setAudienceDisplay(FieldsetAudienceDisplay.Rankings);
            }, 3000);
        } else if (audienceDisplayOptions.savedScore) {
            setTimeout(async () => {
                log("info", "Match ended, showing saved match results");
                await fieldset.setAudienceDisplay(FieldsetAudienceDisplay.SavedMatchResults);
            }, 3000);
        }

    });

});