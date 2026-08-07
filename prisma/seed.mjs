if (
  process.env.NODE_ENV === "production" ||
  process.env.ENABLE_DEV_SEED !== "true"
) {
  console.log("Development seed is disabled.");
  process.exit(0);
}

const email = process.env.DEV_SEED_EMAIL?.trim().toLowerCase();
const password = process.env.DEV_SEED_PASSWORD;
if (!email || !password || password.length < 10) {
  throw new Error(
    "Set DEV_SEED_EMAIL and a DEV_SEED_PASSWORD of at least 10 characters.",
  );
}

const [{ PrismaClient }, { hash }] = await Promise.all([
  import("@prisma/client"),
  import("bcryptjs"),
]);
const prisma = new PrismaClient();
try {
  const passwordHash = await hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, displayName: "Kairo Dev", passwordHash, role: "USER" },
  });
  console.log("Development user is ready.");
} finally {
  await prisma.$disconnect();
}
