export function getVEXTMAuthorization() {
    const {
        TM_SWITCHER_VEX_TM_CLIENT_ID: client_id,
        TM_SWITCHER_VEX_TM_CLIENT_SECRET: client_secret,
        TM_SWITCHER_VEX_TM_EXPIRATION_DATE: expiration_date,
    } = process.env;

    if (!client_id || !client_secret || !expiration_date) {
        return null;        
    };

    return {
        client_id,
        client_secret,
        grant_type: "client_credentials",
        expiration_date: new Date(Number.parseInt(expiration_date)).getTime(),
    } as const;
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