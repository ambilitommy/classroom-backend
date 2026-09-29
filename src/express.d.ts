declare global {
	namespace Express {
		interface User {
			role: "admin" | "teacher" | "student";
		}

		interface Request {
			user?: User;
		}
	}
}

export {};
