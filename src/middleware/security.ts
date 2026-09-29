import type { NextFunction, Request, Response } from "express";
import { slidingWindow } from "@arcjet/node";
import { aj } from "../config/arcjet";

export async function securityMiddleware(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	if (process.env.NODE_ENV === "test") {
		next();
		return;
	}

	try {
		const role: RateLimitRole = req.user?.role ?? "guest";
		let limit: number;
		let limitMessage: string;

		switch (role) {
			case "admin":
				limit = 20;
				limitMessage = "Admin request limit exceeded (20 per minute)";
				break;
			case "teacher":
				limit = 10;
				limitMessage = "Teacher request limit exceeded (10 per minute)";
				break;
			case "student":
				limit = 10;
				limitMessage = "Student request limit exceeded (10 per minute)";
				break;
			default:
				limit = 5;
				limitMessage = "Please sign up for higher limits";
		}

		const client = aj.withRule(
			slidingWindow({ mode: "LIVE", interval: "1m", max: limit }),
		);
		const arcjetRequest = {
			headers: req.headers,
			method: req.method,
			url: req.url,
			socket: req.socket,
		};
		const decision = await client.protect(arcjetRequest);

		if (decision.isDenied() && decision.reason.isBot()) {
			res.status(403).json({
				error: "Forbidden",
				message: "Automated requests are not allowed",
			});
			return;
		}

        if (decision.isDenied() && decision.reason.isShield()) {
			res.status(403).json({ error: "Forbidden", message: "Request blocked by security policy" });
			return;
		}


		if (decision.isDenied() && decision.reason.isRateLimit()) {
			res.status(429).json({ error: "Too Many Requests", message: limitMessage });
			return;
		}

		if (decision.isDenied()) {
			res.status(403).json({ error: "Forbidden", message: "Request denied" });
			return;
		}

		next();
	} catch (e) {
		console.error("Arcjet middleware error", e);
		res.status(500).json({
			error: "Internal Server Error",
			message: e instanceof Error ? e.message : "An unexpected error occurred",
		});
	}
}
