import createClient from "openapi-fetch";
import type { paths } from "../generated/broker";
import { BearerResult, TMErrors } from "vex-tm-client";

const client = createClient<paths>({ baseUrl: process.env.TM_SWITCHER_BROKER_SERVER });

export async function getTournamentManagerBearer(): Promise<BearerResult> {
    const bearer = await client.GET("/api/v1/bearer", {
        params: {
            header: {
                Authorization: `Bearer ${process.env.TM_SWITCHER_BROKER_TOKEN}`,
            }
        }
    });
    
    if (!bearer.data) {
        return {
            success: false,
            error: TMErrors.CredentialsError,
            error_details: bearer.error,
        };
    }

    if (bearer.data.success) {
        return {
            success: true,
            token: bearer.data.token,
        };
    }

    return {
        success: false,
        error: bearer.data.error as TMErrors.CredentialsExpired | TMErrors.CredentialsInvalid | TMErrors.CredentialsError,
        error_details: bearer.data.error_details,
    };
};

export function getLogServerAuthorization() {
    const {
        TM_SWITCHER_LOG_SERVER: server,
        TM_SWITCHER_LOG_TOKEN: token,
    } = process.env;

    if (!server || !token) {
        return null;
    };

    return {
        server,
        token,
    } as const;
}