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

            switch (fieldset.state.audienceDisplay) {

                case FieldsetAudienceDisplay.Rankings:
                case FieldsetAudienceDisplay.SavedMatchResults: {

                    // Delay to account for switching program input when the new match is queued 
                    setTimeout((() => fieldset.setAudienceDisplay(FieldsetAudienceDisplay.Intro)), 4000);
                    break;
                }

                default: {
                    await fieldset.setAudienceDisplay(FieldsetAudienceDisplay.Intro);
                    break;
                }
            }
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