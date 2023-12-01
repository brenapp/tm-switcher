import { FieldsetActiveMatchType, FieldsetAudienceDisplay } from "vex-tm-client";
import { Behavior } from "./index";
import { log } from "../utils/logging";

/**
 * Audience Display Automation
 **/
Behavior("AUDIENCE_DISPLAY", async ({ attachments, audienceDisplayOptions }) => {

    const { fieldset } = attachments;

    fieldset.on("fieldActivated", async event => {
        if (audienceDisplayOptions.queueIntro) {
            log("info", "Field activated, showing intro");
            await fieldset.setAudienceDisplay(FieldsetAudienceDisplay.Intro)
        }
    });

    fieldset.on("matchStopped", async () => {

        const match = fieldset.state.match;
        if (match.type !== FieldsetActiveMatchType.Match) {
            return;
        }

        if (audienceDisplayOptions.flashRankings && match.match.match % 6 === 0) {
            log("info", "Match ended, showing rankings");
            await fieldset.setAudienceDisplay(FieldsetAudienceDisplay.Rankings);
        } else if (audienceDisplayOptions.savedScore) {
            log("info", "Match ended, showing saved match results");
            await fieldset.setAudienceDisplay(FieldsetAudienceDisplay.SavedMatchResults);
        }

    });

});