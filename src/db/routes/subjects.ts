import express from "express";
import { departments, subjects } from "../schema";
import { and, eq, getTableColumns, ilike, or, sql, desc } from "drizzle-orm";
import { db } from "..";

const router = express.Router();

// Get all subjects with optional search, filtering, and pagination
router.get("/", async (req, res) => {
    try {
        // Extract query parameters for search, filtering, and pagination
        const { search, department, page = 1, limit = 10 } = req.query;
        const currentPage = Math.max(1, +page);
        const limitPerPage = Math.max(1, +limit);
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions: any = [];
        // If search query exists, filter by subjects name or code using ilike for case-insensitive matching
        if (search) {
            filterConditions.push(
                or(
                    ilike(subjects.name, `%${search}%`),
                    ilike(subjects.code, `%${search}%`),
                )
            );
        }

        //if department is provided, filter by departmentId
        if (department) {
            filterConditions.push(ilike(departments.name, `%${department}%`));
        }

        //combine all filter conditions using 'and' operator
        const combinedFilter = filterConditions.length > 0 ? and(...filterConditions) : undefined;
        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(subjects)
            .leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(combinedFilter);

        const totalCount = countResult[0]?.count || 0;
        const subjectsList = await db
            .select({
                ...getTableColumns(subjects),
                department: { ...getTableColumns(departments) }
            }).from(subjects)
            .leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(combinedFilter)
            .orderBy(desc(subjects.id))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: subjectsList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                totalCount: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage),
            }
        });

    } catch (error) {
        console.error(`GET /subjects error: ${error}`);
        res.status(500).json({ error: "Failed to get Subjects" });
    }
});

export default router;