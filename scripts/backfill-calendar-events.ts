import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ONE_HOUR_MS = 3600000;

async function main() {
  console.log('🔍 Buscando actividades con dueDate sin calendarEventId...');

  const activities = await prisma.activity.findMany({
    where: {
      dueDate: { not: null },
      calendarEventId: null,
    },
    select: {
      id: true,
      subject: true,
      description: true,
      dueDate: true,
      status: true,
      clientId: true,
      assignedToId: true,
    },
  });

  console.log(`📊 Encontradas ${activities.length} actividades para sincronizar`);

  let created = 0;
  let failed = 0;

  for (const activity of activities) {
    try {
      const event = await prisma.calendarEvent.create({
        data: {
          title: activity.subject,
          description: activity.description || undefined,
          category: 'TAREA',
          status: activity.status || 'PENDIENTE',
          source: 'LOCAL',
          startDate: activity.dueDate!,
          endDate: new Date(activity.dueDate!.getTime() + ONE_HOUR_MS),
          allDay: false,
          clientId: activity.clientId,
          assignedToId: activity.assignedToId,
        },
      });

      await prisma.activity.update({
        where: { id: activity.id },
        data: { calendarEventId: event.id },
      });

      created++;
    } catch (err) {
      console.error(`❌ Error con actividad ${activity.id}:`, err);
      failed++;
    }
  }

  console.log(`✅ ${created} eventos de calendario creados`);
  if (failed > 0) console.warn(`⚠️  ${failed} fallaron`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
