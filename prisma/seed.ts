import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const services = [
    { name: "Kinder (bis 13 Jahre)", priceCHF: 22, duration: 30 },
    { name: "Teenager (Alter 14–17)", priceCHF: 26, duration: 30 },
    { name: "Männer", priceCHF: 33, duration: 30 },
    { name: "Schneiden & Waschen", priceCHF: 38, duration: 45 },
    { name: "Haare schneiden mit Bart", priceCHF: 53, duration: 45 },
    { name: "Bart", priceCHF: 20, duration: 15 },
    { name: "Augenbrauen", priceCHF: 20, duration: 15 },
  ];
  for (const s of services) {
    await prisma.service.upsert({
      where: { name: s.name },
      update: { priceCHF: s.priceCHF, duration: s.duration },
      create: s,
    });
  }
  console.log("Preisliste aktualisiert: 7 Leistungen");

  const whDefaults = [
    { dayOfWeek: 0, isOpen: false, startTime: "00:00", endTime: "00:00" },
    { dayOfWeek: 1, isOpen: false, startTime: "00:00", endTime: "00:00" },
    { dayOfWeek: 2, isOpen: true, startTime: "09:00", endTime: "18:00" },
    { dayOfWeek: 3, isOpen: true, startTime: "09:00", endTime: "18:00" },
    { dayOfWeek: 4, isOpen: true, startTime: "09:00", endTime: "18:00" },
    { dayOfWeek: 5, isOpen: true, startTime: "09:00", endTime: "18:00" },
    { dayOfWeek: 6, isOpen: true, startTime: "08:00", endTime: "16:00" },
  ];
  for (const d of whDefaults) {
    await prisma.workingHours.upsert({
      where: { dayOfWeek: d.dayOfWeek },
      update: { isOpen: d.isOpen, startTime: d.startTime, endTime: d.endTime, breakStart: null, breakEnd: null },
      create: { dayOfWeek: d.dayOfWeek, isOpen: d.isOpen, startTime: d.startTime, endTime: d.endTime, breakStart: null, breakEnd: null },
    });
  }
  console.log("Öffnungszeiten aktualisiert: Di–Fr 09–18, Sa 08–16, So/Mo geschlossen");

  const existing = await prisma.storeConfig.findFirst();
  if (existing) {
    await prisma.storeConfig.update({ where: { id: existing.id }, data: {} });
    console.log("StoreConfig aktualisiert");
  } else {
    await prisma.storeConfig.create({ data: {} });
    console.log("StoreConfig erstellt: Barber Shop Brienz");
  }
}

(async () => {
  try {
    await main();
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
