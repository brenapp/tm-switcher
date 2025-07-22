import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";
import { describeRoute, openAPISpecs } from "hono-openapi";
import { resolver, validator } from "hono-openapi/zod";
import { z } from "zod";

import { Client, TMErrors } from "vex-tm-client";

const app = new Hono<{ Bindings: Env }>();

const tokenDataSchema = z.object({
	active: z.boolean(),
	clientId: z.string(),
});

const headerSchema = z.object({
	Authorization: z.string(),
});
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
const bearerResponseSchema = z.union([
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
						schema: resolver(bearerResponseSchema),
					},
				},
			},
			400: {
				description: "Bad request, likely due to missing or malformed Authorization header.",
				content: {
					"application/json": {
						schema: resolver(bearerResultErrorSchema),
					},
				},
			},
			403: {
				description: "Forbidden, invalid broker token.",
				content: {
					"application/json": {
						schema: resolver(bearerResultErrorSchema),
					},
				},
			},
		}
	}),
	validator("header", headerSchema),
	validator("query", querySchema),
	async (c) => {

		const authorization = c.req.header("Authorization");
		if (!authorization) {
			return c.json(
				{
					success: false,
					error: TMErrors.CredentialsError,
					error_details: "Authorization header is missing.",
				},
				400
			);
		}

		const match = authorization.match(/^Bearer\s+(.+)$/);
		if (!match) {
			return c.json(
				{
					success: false,
					error: TMErrors.CredentialsError,
					error_details: "Authorization header is not in the correct format.",
				},
				400
			);
		}	


		const token = match[1];
		const data = c.env.TOKENS.get<z.infer<typeof tokenDataSchema>>(token, "json");
		if (!data) {
			return c.json(
				{
					success: false,
					error: TMErrors.CredentialsError,
					error_details: "Invalid broker token. You may be using an outdated version.",
				},
				403
			);
		}

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
		return c.json(result satisfies z.infer<typeof bearerResponseSchema>, 200);
	}
);

const eventSchema = z.object({
    name: z.string(),
    sku: z.string(),
});

const productSchema = z.enum(["tm-switcher"]);

const statsPointSchema = z.object({
    timestamp: z.date(),
    event: eventSchema,
    product: productSchema,
});

const statsResponseSchema = z.object({
    success: z.literal(true),
});

app.put(
    "/api/v1/stats",
    validator("json", statsPointSchema),
    describeRoute({
        description: "Record statistics about usage.",
        responses: {
            200: {
                description: "Bearer token obtained successfully.",
                content: {
                    "application/json": {
                        schema: resolver(statsResponseSchema),
                    },
                },
            }
        }
    }),
    async (c) => {
        const cf = c.req.raw.cf;
        const body = c.req.valid("json");
        c.env.VEXTM_BROKER_ANALYTICS.writeDataPoint({
            blobs: [
                `${cf?.country}`,
                `${cf?.region}`,
                `${cf?.city}`,
                `${cf?.postalCode}`,
                body.event.sku,
                body.event.name,
            ],
            doubles: [
                body.timestamp.getTime(),
                cf?.latitude ? Number.parseInt(`${cf.latitude}`) : 0,
                cf?.longitude ? Number.parseInt(`${cf.longitude}`) : 0,
            ],
            indexes: [
                body.product
            ]
        });
        return c.json({ success: true } satisfies z.infer<typeof statsResponseSchema>);
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

app.get("/", swaggerUI({
	url: "/openapi",
}))

export default {
	...app,
} satisfies ExportedHandler<Env>;
