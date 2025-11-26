import { prisma } from "../../../lib/prisma";
import ServicesClient from "./ServicesClient";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const services = await prisma.service.findMany({ orderBy: { name: "asc" } });
  return <ServicesClient initial={services} />;
}
