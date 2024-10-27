import "jsr:@std/dotenv/load";
import process from "node:process";

export const env = {
  LOG_SERVER: process.env.LOG_SERVER!,
  LOG_SERVER_TOKEN: process.env.LOG_SERVER_TOKEN!,
  TM_CLIENT_ID: process.env.TM_CLIENT_ID!,
  TM_CLIENT_SECRET: process.env.TM_CLIENT_SECRET!,
  TM_CLIENT_GRANT_TYPE: process.env.TM_CLIENT_GRANT_TYPE!,
  TM_CLIENT_EXPIRES: process.env.TM_CLIENT_EXPIRES!,
  VERSION: process.env.VERSION!,
} as const;
