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
        const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
        const limitPerPage = Math.min(Math.max(1, parseInt(String(limit), 10) || 10), 100);
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions: any = [];
        // If search query exists, filter by subjects name or code using ilike for case-insensitive matching
        if (search) {
                const searchPattern = `%${String(search).replace(/[%_\\]/g, "\\$&")}%`;
            filterConditions.push(
                or(
                        ilike(subjects.name, searchPattern),
                        ilike(subjects.code, searchPattern),
                )
            );
        }

        //if department is provided, filter by departmentId
        if (department) {
                const deptPattern = `%${String(department).replace(/[%_\\]/g, "\\$&")}%`;
            filterConditions.push(ilike(departments.name, deptPattern));
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