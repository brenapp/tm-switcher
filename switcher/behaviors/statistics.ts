import { log } from "../utils/logging.js";
import { Behavior } from "../behavior.js";
import { brokerClient } from "../utils/secrets.js";
import type { paths } from "../generated/broker.d.ts";

export type StatisticEvent = NonNullable<paths["/api/v1/stats/start"]["put"]["requestBody"]>["content"]["application/json"];

export const StatisticsBehavior: Behavior = async ({ connections }) => {

    const eventResult = await connections.tm.getEventInfo();
    if (!eventResult.success) {
        log("error", `Failed to fetch event info: ${eventResult.error}`);
        return;
    }
    
    let body: StatisticEvent = {
        event: {
            name: eventResult.data.name,
            sku: eventResult.data.code,
        },
        product: "tm-switcher",
        timestamp: new Date().toISOString(),
    };

    const statsResult = await brokerClient.PUT("/api/v1/stats/start", {
        body
    })

    if (!statsResult.data?.success) {
        log("error", `Failed to record statistics: ${statsResult.error}`);
        return;
    }
};