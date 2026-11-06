import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { TestStatus } from "../generated/prisma/enums";
import type { createPrismaClient } from "../lib/db/client";
import { DEMO_EMAIL } from "../lib/demo";
import { blockedNotes, commerceSections, failureNotes, mobileSections, type SeedCase, type SeedSection } from "./seed-data";

type Client = ReturnType<typeof createPrismaClient>;

const DAY = 24 * 60 * 60 * 1000;

/** Small deterministic generator, so every seed produces the same demo data. */
function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/** Deletes everything, including all users. */
export async function wipeData(db: Client) {
  await db.loginAttempt.deleteMany();
  await db.attachment.deleteMany();
  await db.comment.deleteMany();
  await db.bug.deleteMany();
  await db.testResult.deleteMany();
  await db.project.deleteMany();
  await db.user.deleteMany();
}

async function createSections(
  db: Client,
  projectId: string,
  sections: SeedSection[],
  authorId: string,
  counter: { next: number },
  parentId: string | null = null,
): Promise<{ id: string; seed: SeedCase }[]> {
  const steps = (seed: SeedCase) => seed.steps.map(([action, expectedResult]) => ({ action, expectedResult }));
  const created: { id: string; seed: SeedCase }[] = [];
  for (const [sectionOrder, section] of sections.entries()) {
    const { id: sectionId } = await db.section.create({
      data: { projectId, parentId, name: section.name, order: sectionOrder },
      select: { id: true },
    });
    for (const [caseOrder, seed] of (section.cases ?? []).entries()) {
      const caseNumber = counter.next++;
      const { id } = await db.testCase.create({
        data: {
          projectId,
          sectionId,
          caseNumber,
          title: seed.title,
          preconditions: seed.preconditions,
          priority: seed.priority,
          type: seed.type,
          estimate: seed.estimate,
          references: seed.references,
          tags: seed.tags,
          order: caseOrder,
          createdById: authorId,
          updatedById: authorId,
          steps: {
            create: seed.steps.map(([action, expectedResult], order) => ({ order, action, expectedResult })),
          },
          versions: {
            create: {
              changedById: authorId,
              snapshot: {
                title: seed.title,
                section: section.name,
                preconditions: seed.preconditions ?? null,
                priority: seed.priority,
                type: seed.type,
                estimate: seed.estimate,
                references: seed.references ?? null,
                tags: seed.tags,
                steps: steps(seed),
              },
            },
          },
        },
        select: { id: true },
      });
      created.push({ id, seed });
    }
    created.push(...(await createSections(db, projectId, section.children ?? [], authorId, counter, sectionId)));
  }
  return created;
}

type RunPlan = {
  name: string;
  description: string;
  environment: string;
  milestoneId: string;
  projectId: string;
  createdById: string;
  assignees: string[];
  cases: { id: string }[];
  completed: boolean;
  /** Days ago that execution started. */
  startedDaysAgo: number;
  /** Cumulative chance of each outcome, in order. Anything left over stays UNTESTED. */
  distribution: [TestStatus, number][];
};

async function createRun(db: Client, plan: RunPlan, random: () => number) {
  const now = Date.now();
  const startedAt = new Date(now - plan.startedDaysAgo * DAY);
  const run = await db.testRun.create({
    data: {
      projectId: plan.projectId,
      milestoneId: plan.milestoneId,
      name: plan.name,
      description: plan.description,
      environment: plan.environment,
      assignedToId: plan.assignees[0],
      createdById: plan.createdById,
      status: plan.completed ? "COMPLETED" : "ACTIVE",
      closedAt: plan.completed ? new Date(now - DAY) : null,
      createdAt: startedAt,
    },
    select: { id: true },
  });

  const results: {
    runCaseId: string;
    status: TestStatus;
    comment: string | null;
    actualResult: string | null;
    elapsedSeconds: number;
    defectRef: string | null;
    createdById: string;
    createdAt: Date;
  }[] = [];

  for (const [order, testCase] of plan.cases.entries()) {
    const assignee = plan.assignees[order % plan.assignees.length]!;
    const roll = random();
    const status = plan.distribution.find(([, cumulative]) => roll < cumulative)?.[0] ?? "UNTESTED";
    const runCase = await db.testRunCase.create({
      data: { runId: run.id, testCaseId: testCase.id, assignedToId: assignee, currentStatus: status, order },
      select: { id: true },
    });
    if (status === "UNTESTED") continue;

    const executedAt = new Date(startedAt.getTime() + random() * (now - startedAt.getTime() - DAY / 4));
    const base = { runCaseId: runCase.id, createdById: assignee, elapsedSeconds: 45 + Math.floor(random() * 400) };

    if (status === "FAILED") {
      const note = failureNotes[Math.floor(random() * failureNotes.length)]!;
      results.push({ ...base, status, comment: note.comment, actualResult: note.actual, defectRef: note.defect, createdAt: executedAt });
    } else if (status === "BLOCKED") {
      const comment = blockedNotes[Math.floor(random() * blockedNotes.length)]!;
      results.push({ ...base, status, comment, actualResult: null, defectRef: null, createdAt: executedAt });
    } else {
      // Some passes were a failure first, so the result history has depth.
      if (status === "PASSED" && random() < 0.15) {
        const note = failureNotes[Math.floor(random() * failureNotes.length)]!;
        const earlier = new Date(executedAt.getTime() - DAY * (0.5 + random()));
        results.push({ ...base, status: "FAILED", comment: note.comment, actualResult: note.actual, defectRef: note.defect, createdAt: earlier });
      }
      const comment = status === "RETEST" ? "Fix deployed. Needs another pass." : null;
      results.push({ ...base, status, comment, actualResult: null, defectRef: null, createdAt: executedAt });
    }
  }

  await db.testResult.createMany({ data: results });
  return { id: run.id, results: results.length };
}

/** Creates the demo workspace in an empty database. */
export async function seedData(db: Client, options: { password: string; demo: boolean }) {
  const passwordHash = await bcrypt.hash(options.password, 10);

  const admin = await db.user.create({
    data: { name: "Avery Chen", email: "admin@testvault.dev", passwordHash, role: "ADMIN" },
    select: { id: true },
  });
  const maya = await db.user.create({
    data: { name: "Maya Patel", email: "maya@testvault.dev", passwordHash, role: "TESTER" },
    select: { id: true },
  });
  const liam = await db.user.create({
    data: { name: "Liam Novak", email: "liam@testvault.dev", passwordHash, role: "TESTER" },
    select: { id: true },
  });
  // Visitors share this account. Its password is random and never used, because the demo signs in with one click.
  const demoVisitor = options.demo
    ? await db.user.create({
        data: { name: "Demo Visitor", email: DEMO_EMAIL, passwordHash: await bcrypt.hash(randomUUID(), 10), role: "LEAD" },
        select: { id: true },
      })
    : null;
  const members = [
    { userId: admin.id, role: "ADMIN" as const },
    { userId: maya.id, role: "TESTER" as const },
    { userId: liam.id, role: "TESTER" as const },
    ...(demoVisitor ? [{ userId: demoVisitor.id, role: "LEAD" as const }] : []),
  ];

  const commerce = await db.project.create({
    data: {
      name: "Aurora Commerce Web",
      key: "AC",
      color: "#7C3AED",
      description: "Customer storefront: login, cart, checkout, payment and profile.",
      createdById: admin.id,
      members: { create: members },
    },
    select: { id: true },
  });
  const mobile = await db.project.create({
    data: {
      name: "Aurora Mobile App",
      key: "AM",
      color: "#0EA5E9",
      description: "iOS and Android shopping app.",
      createdById: admin.id,
      members: { create: members },
    },
    select: { id: true },
  });

  const commerceCounter = { next: 1 };
  const commerceCases = await createSections(db, commerce.id, commerceSections, admin.id, commerceCounter);
  const mobileCounter = { next: 1 };
  const mobileCases = await createSections(db, mobile.id, mobileSections, admin.id, mobileCounter);
  await db.project.update({ where: { id: commerce.id }, data: { nextCaseNumber: commerceCounter.next } });
  await db.project.update({ where: { id: mobile.id }, data: { nextCaseNumber: mobileCounter.next } });

  const now = Date.now();
  const milestone = await db.milestone.create({
    data: {
      projectId: commerce.id,
      name: "Release 2.4",
      description: "Holiday checkout improvements and the new payment provider.",
      startDate: new Date(now - 18 * DAY),
      dueDate: new Date(now + 10 * DAY),
    },
    select: { id: true },
  });

  const random = createRandom(2024);
  const smokeCases = commerceCases.filter((c) => c.seed.priority === "CRITICAL" || c.seed.priority === "HIGH");
  const smoke = await createRun(
    db,
    {
      name: "Release 2.4 Smoke",
      description: "Critical and high priority paths ahead of the release candidate.",
      environment: "Chrome / Staging",
      milestoneId: milestone.id,
      projectId: commerce.id,
      createdById: admin.id,
      assignees: [maya.id],
      cases: smokeCases,
      completed: true,
      startedDaysAgo: 13,
      distribution: [["PASSED", 0.82], ["FAILED", 0.92], ["BLOCKED", 0.96], ["SKIPPED", 1]],
    },
    random,
  );
  const regression = await createRun(
    db,
    {
      name: "Sprint 24 Regression",
      description: "Full regression pass for the current sprint.",
      environment: "Safari / Staging",
      milestoneId: milestone.id,
      projectId: commerce.id,
      createdById: admin.id,
      assignees: demoVisitor ? [demoVisitor.id, maya.id, liam.id] : [maya.id, liam.id],
      cases: commerceCases,
      completed: false,
      startedDaysAgo: 6,
      distribution: [["PASSED", 0.48], ["FAILED", 0.58], ["BLOCKED", 0.64], ["RETEST", 0.68], ["SKIPPED", 0.71]],
    },
    random,
  );

  // Open a few realistic bugs from the regression run's failures.
  const failed = await db.testRunCase.findMany({
    where: { runId: regression.id, currentStatus: "FAILED" },
    select: { id: true, testCaseId: true, testCase: { select: { title: true, priority: true } }, results: { select: { actualResult: true, defectRef: true }, orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { order: "asc" },
    take: 6,
  });
  const bugStatuses = ["OPEN", "OPEN", "IN_PROGRESS", "OPEN", "RESOLVED", "CLOSED"] as const;
  for (const [index, runCase] of failed.entries()) {
    const status = bugStatuses[index] ?? "OPEN";
    await db.bug.create({
      data: {
        projectId: commerce.id,
        bugNumber: index + 1,
        title: `${runCase.testCase.title} fails on Safari`,
        description: "Found during the Sprint 24 regression pass.",
        stepsToReproduce: "1. Open the storefront in Safari on staging\n2. Follow the linked test case",
        expectedResult: "The case passes as written.",
        actualResult: runCase.results[0]?.actualResult ?? null,
        severity: runCase.testCase.priority,
        status,
        environment: "Safari / Staging",
        externalRef: runCase.results[0]?.defectRef ?? null,
        assignedToId: index % 2 === 0 ? liam.id : maya.id,
        reportedById: maya.id,
        testCaseId: runCase.testCaseId,
        runCaseId: runCase.id,
        resolvedAt: status === "RESOLVED" || status === "CLOSED" ? new Date(now - DAY) : null,
        createdAt: new Date(now - (5 - Math.min(index, 4)) * DAY),
      },
      select: { id: true },
    });
  }
  await db.project.update({ where: { id: commerce.id }, data: { nextBugNumber: failed.length + 1 } });

  await db.activityLog.createMany({
    data: [
      { projectId: commerce.id, userId: admin.id, action: "created", entityType: "project", entityId: commerce.id, meta: { name: "Aurora Commerce Web" }, createdAt: new Date(now - 20 * DAY) },
      { projectId: mobile.id, userId: admin.id, action: "created", entityType: "project", entityId: mobile.id, meta: { name: "Aurora Mobile App" }, createdAt: new Date(now - 19 * DAY) },
      { projectId: commerce.id, userId: admin.id, action: "created", entityType: "milestone", entityId: milestone.id, meta: { name: "Release 2.4" }, createdAt: new Date(now - 18 * DAY) },
      { projectId: commerce.id, userId: admin.id, action: "created", entityType: "run", entityId: smoke.id, meta: { name: "Release 2.4 Smoke" }, createdAt: new Date(now - 13 * DAY) },
      { projectId: commerce.id, userId: maya.id, action: "completed", entityType: "run", entityId: smoke.id, meta: { name: "Release 2.4 Smoke" }, createdAt: new Date(now - DAY) },
      { projectId: commerce.id, userId: admin.id, action: "created", entityType: "run", entityId: regression.id, meta: { name: "Sprint 24 Regression" }, createdAt: new Date(now - 6 * DAY) },
    ],
  });

  return { cases: commerceCases.length + mobileCases.length, results: smoke.results + regression.results };
}
