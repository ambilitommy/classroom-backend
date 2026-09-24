import express from "express";
import { departments, subjects } from "../schema";
import { and, eq, getTableColumns, ilike, or, sql, desc } from "drizzle-orm";
import { db } from "..";

const router = express.Router();

// Get all departments with optional search, and pagination
router.get("/", async (req, res) => {
    try {
        // Extract query parameters for search, and pagination
        const { search, page = 1, limit = 10 } = req.query;
        const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
        const limitPerPage = Math.min(Math.max(1, parseInt(String(limit), 10) || 10), 100);
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions: any = [];
        // If search query exists, filter by departments name or code using ilike for case-insensitive matching
        if (search) {
            const searchPattern = `%${String(search).replace(/[%_\\]/g, "\\$&")}%`;
            filterConditions.push(
                or(
                    ilike(departments.name, searchPattern),
                    ilike(departments.code, searchPattern),
                )
            );
        }

        //combine all filter conditions using 'and' operator
        const combinedFilter = filterConditions.length > 0 ? and(...filterConditions) : undefined;
        const countResult = await db
            .select({ count: sql<number>`count(*)`.mapWith(Number) })
            .from(departments)
            .where(combinedFilter);

        const totalCount = countResult[0]?.count || 0;
        const departmentsList = await db
            .select({
                ...getTableColumns(departments),
                subjectsCount: sql<number>`count(${subjects.id})`.mapWith(Number),
            }).from(departments)
            .leftJoin(subjects, eq(subjects.departmentId, departments.id))
            .where(combinedFilter)
            .groupBy(departments.id)
            .orderBy(desc(departments.id))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: departmentsList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                totalCount: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage),
            }
        });

    } catch (error) {
        console.error(`GET /departments error: ${error}`);
        res.status(500).json({ error: "Failed to get Departments" });
    }
});

router.get("/:id", async (req, res) => {
    const { id } = req.params;
    const departmentId = Number(id);
    if (!Number.isInteger(departmentId) || departmentId <= 0) {
        res.status(400).json({ error: "Invalid department ID" });
    }
    try {
        const departmentDetails = await db.select({
            ...getTableColumns(departments),
            subjectsCount: sql<number>`count(${subjects.id})`.mapWith(Number),
        })
            .from(departments)
            .leftJoin(subjects, eq(subjects.departmentId, departments.id))
            .where(eq(departments.id, departmentId))
            .groupBy(departments.id)
        res.status(200).json(departmentDetails[0] || null);
    } catch (e) {
        console.error(`GET /departments/:id error: ${e}`);
        res.status(500).json({ error: `Failed to get Department with ID ${id}` });
    }
});

router.get("/:id/subjects", async (req, res) => {
    const departmentId = Number(req.params.id);
    const { page = 1, limit = 10 } = req.query;
    const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
    const limitPerPage = Math.min(Math.max(1, parseInt(String(limit), 10) || 10), 100);
    const offset = (currentPage - 1) * limitPerPage;

    if (!Number.isInteger(departmentId) || departmentId <= 0) {
        return res.status(400).json({ error: "Invalid department ID" });
    }
    const { id } = req.params;
    try {
        const countResult = await db
            .select({
                count: sql<number>`count(*)`.mapWith(Number),
            })
            .from(subjects)
            .where(eq(subjects.departmentId, departmentId));
        const totalCount = countResult[0]?.count || 0;


        const subjectsList = await db.select({
            code: subjects.code,
            name: subjects.name,
            id: subjects.id,
            description: subjects.description,
        })
            .from(subjects)
            .where(eq(subjects.departmentId, Number(id)))
            .orderBy(desc(subjects.id))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: subjectsList, pagination: {
                page: currentPage,
                limit: limitPerPage,
                totalCount: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage),
            }
        });
    } catch (e) {
        console.error(`GET /departments/:id/subjects error: ${e}`);
        res.status(500).json({ error: `Failed to get Subjects for Department with ID ${id}` });
    }
});

export default router;