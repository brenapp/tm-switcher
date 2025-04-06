export function getVEXTMSecrets() {
    const {
        VEXTM_SECRET_CLIENT_ID: client_id,
        VEXTM_SECRET_CLIENT_SECRET: client_secret,
        VEXTM_GRANT_TYPE: grant_type,
        VEXTM_EXPIRATION_DATE: expiration_date,
    } = process.env;

    if (!client_id || !client_secret || !grant_type || !expiration_date) {
        return null;        
    };

    return {
        client_id,
        client_secret,
        grant_type,
        expiration_date: new Date(Number.parseInt(expiration_date)),
    } as const;
};

export function getLogSecrets() {
    const {
        SECRET_LOGS_SERVER: server,
        SECRET_LOGS_TOKEN: token,
    } = process.env;

    if (!server || !token) {
        return null;
    };

    return {
        server,
        token,
    } as const;
}