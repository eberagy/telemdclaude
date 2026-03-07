/**
 * Unit tests for RBAC guards.
 * Run with: pnpm --filter telemd-api test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthorizationError } from "@/lib/rbac";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    practiceMember: {
      findFirst: vi.fn(),
    },
    clinicianProfile: {
      findUnique: vi.fn(),
    },
    appointment: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { requireMember, requireActiveSeat, requirePALicensure } from "@/lib/rbac";

describe("requireMember", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("throws AuthorizationError when member not found", async () => {
    vi.mocked(prisma.practiceMember.findFirst).mockResolvedValue(null);
    await expect(requireMember("user_1", "practice_1")).rejects.toThrow(AuthorizationError);
  });

  it("throws AuthorizationError when role not in allowedRoles", async () => {
    vi.mocked(prisma.practiceMember.findFirst).mockResolvedValue({
      id: "m1", clerkUserId: "user_1", practiceId: "practice_1",
      role: "Staff", isActive: true, email: "staff@test.com",
      firstName: "Jane", lastName: "Doe", createdAt: new Date(), updatedAt: new Date(),
    } as any);
    await expect(requireMember("user_1", "practice_1", ["PracticeOwner"])).rejects.toThrow(AuthorizationError);
  });

  it("returns member when role matches", async () => {
    const fakeMember = {
      id: "m1", clerkUserId: "user_1", practiceId: "practice_1",
      role: "PracticeOwner", isActive: true, email: "owner@test.com",
      firstName: "John", lastName: "Smith", createdAt: new Date(), updatedAt: new Date(),
    };
    vi.mocked(prisma.practiceMember.findFirst).mockResolvedValue(fakeMember as any);
    const result = await requireMember("user_1", "practice_1", ["PracticeOwner"]);
    expect(result.id).toBe("m1");
  });
});

describe("requireActiveSeat", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("throws when seat is INACTIVE", async () => {
    vi.mocked(prisma.clinicianProfile.findUnique).mockResolvedValue({
      seatStatus: "INACTIVE",
    } as any);
    await expect(requireActiveSeat("clinic_1")).rejects.toThrow(AuthorizationError);
  });

  it("throws when profile not found", async () => {
    vi.mocked(prisma.clinicianProfile.findUnique).mockResolvedValue(null);
    await expect(requireActiveSeat("clinic_1")).rejects.toThrow(AuthorizationError);
  });

  it("resolves when seat is ACTIVE", async () => {
    vi.mocked(prisma.clinicianProfile.findUnique).mockResolvedValue({
      seatStatus: "ACTIVE",
    } as any);
    await expect(requireActiveSeat("clinic_1")).resolves.not.toThrow();
  });
});

describe("requirePALicensure", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("throws when not licensed in PA", async () => {
    vi.mocked(prisma.clinicianProfile.findUnique).mockResolvedValue({
      licensedStates: ["NY", "NJ"],
      seatStatus: "ACTIVE",
    } as any);
    await expect(requirePALicensure("clinic_1")).rejects.toThrow(AuthorizationError);
  });

  it("resolves when licensed in PA with active seat", async () => {
    vi.mocked(prisma.clinicianProfile.findUnique).mockResolvedValue({
      licensedStates: ["PA", "NJ"],
      seatStatus: "ACTIVE",
    } as any);
    await expect(requirePALicensure("clinic_1")).resolves.not.toThrow();
  });
});
