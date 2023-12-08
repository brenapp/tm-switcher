import { Behavior } from "./index";

/**
 * Core Switcher Behavior
 **/
Behavior("CORE_SWITCHER", async ({ associations, attachments, connections }) => {

    const { fieldset } = attachments;
    const { obs, atem } = connections;

    async function switchTo(fieldID: number) {
        const association = associations[fieldID];

        if (obs && association?.obs) {
            await obs.call("SetCurrentProgramScene", { sceneName: association.obs });
        }

        if (atem && association?.atem) {
            atem.changeProgramInput(association.atem);
        };
    }

    fieldset.on("matchStarted", async match => {
        const { fieldID } = match;
        await switchTo(fieldID);
    });

    fieldset.on("fieldActivated", async match => {
        const { fieldID } = match;

        // Timeout here to avoid switching before matchStopped results come up
        setTimeout(() => switchTo(fieldID), 3000);
    });

});