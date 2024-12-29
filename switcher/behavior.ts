import { Atem } from "atem-connection";
import OBSWebSocket from "obs-websocket-js";
import { Credentials } from "./utils/authenticate.js";
import {
  AudienceDisplayOptions,
  DisplayAssociations,
  FieldAssociations,
  FileHandles,
  RecordingOptions,
  TournamentAttachments,
} from "utils/input.js";
import { Client } from "vex-tm-client";

export type SwitcherOptions = {
  attachments: TournamentAttachments;
  audienceDisplayOptions: AudienceDisplayOptions;
  associations: FieldAssociations;
  displayAssociations: DisplayAssociations;
  recordingOptions: RecordingOptions;
  
}

export type SwitcherConnections = {
  tm: Client;
  obs: OBSWebSocket | null;
  atem: Atem | null;
};

export type SwitcherSession = {
  handles: FileHandles;
  connections: SwitcherConnections;
  credentials: Credentials;
};

export type SwitcherBehavior = SwitcherOptions & SwitcherSession;

export type Behavior = (behavior: SwitcherBehavior) => Promise<void>;