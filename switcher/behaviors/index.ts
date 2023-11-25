import { Atem } from "atem-connection";
import OBSWebSocket from "obs-websocket-js";
import { AudienceDisplayOptions, FieldAssociations, RecordingOptions, TournamentAttachments } from "utils/input";
import { Client } from "vex-tm-client";

export type SwitcherBehavior = {
    attachments: TournamentAttachments;
    audienceDisplayOptions: AudienceDisplayOptions;
    associations: FieldAssociations;
    recordingOptions: RecordingOptions;
    connections: {
        tm: Client;
        obs: OBSWebSocket | null;
        atem: Atem | null;
    }
};

export type Behavior = (behavior: SwitcherBehavior) => Promise<void>;

export const BEHAVIORS: { [key: string]: Behavior } = {};

export function Behavior(name: string, behavior: Behavior) {
    BEHAVIORS[name] = behavior;
};
