import { Hono } from "hono";
import { describeRoute, openAPISpecs } from "hono-openapi";
import { resolver, validator } from "hono-openapi/zod";
import { z } from "zod";

import { Client, TMErrors } from "vex-tm-client";

const app = new Hono<{ Bindings: Env }>();

const querySchema = z.object({});

const bearerTokenSchema = z.object({
	access_token: z.string(),
	token_type: z.string(),
	expires_in: z.number(),
});

const bearerResultSuccessSchema = z.object({
	success: z.literal(true),
	token: bearerTokenSchema,
});
const bearerResultErrorSchema = z.object({
	success: z.literal(false),
	error: z.union([
		z.literal(TMErrors.CredentialsError),
		z.literal(TMErrors.CredentialsInvalid),
		z.literal(TMErrors.CredentialsExpired),
	]),
	error_details: z.unknown().optional(),
});
const responseSchema = z.union([
	bearerResultSuccessSchema,
	bearerResultErrorSchema,
]);

app.get(
	"/api/v1/bearer",
	describeRoute({
		description: "Obtains a bearer token from the DWAB authorization server.",
		responses: {
			200: {
				description: "Bearer token obtained successfully.",
				content: {
					"application/json": {
						schema: resolver(responseSchema),
					},
				},
			},
		},
	}),
	validator("query", querySchema),
	async (c) => {
		const client = new Client({
			address: "",
			clientAPIKey: "",
			authorization: {
				client_id: c.env.TM_SWITCHER_VEX_TM_CLIENT_ID,
				client_secret: c.env.TM_SWITCHER_VEX_TM_CLIENT_SECRET,
				expiration_date: Number.parseInt(
					c.env.TM_SWITCHER_VEX_TM_EXPIRATION_DATE
				),
				grant_type: "client_credentials",
			},
		});

		const result = await client.getBearer();
		return c.json(result satisfies z.infer<typeof responseSchema>);
	}
);
app.get(
	"/openapi",
	openAPISpecs(app, {
		documentation: {
			info: {
				title: "DWAB Broker API",
				version: "1.0.0",
				description: "Brokers requests to the DWAB API.",
			},
		},
	})
);

export default {
	...app,
} satisfies ExportedHandler<Env>;
