const prisma = require('../lib/prisma').default;

async function seedTestData() {
  try {
    console.log('🌱 Создание тестовых данных...');
    
    // Создаем дополнительные групповые поездки для демонстрации
    const futureTrips = [
      {
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // через 3 дня
        timeSlot: 'MORNING_9AM',
        maxParticipants: 8,
        minRequired: 4,
        pricePerPerson: 95,
        description: 'Морская рыбалка на тунца и дорадо у берегов Кашкайша',
        meetingPoint: 'Cascais Marina',
        status: 'FORMING'
      },
      {
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // через 5 дней
        timeSlot: 'AFTERNOON_2PM',
        maxParticipants: 8,
        minRequired: 4,
        pricePerPerson: 95,
        description: 'Дневная рыбалка с профессиональным гидом',
        meetingPoint: 'Cascais Marina',
        status: 'FORMING'
      },
      {
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // через неделю
        timeSlot: 'MORNING_9AM',
        maxParticipants: 8,
        minRequired: 4,
        pricePerPerson: 95,
        description: 'Утренняя рыбалка на скумбрию и сардины',
        meetingPoint: 'Cascais Marina',
        status: 'FORMING'
      },
      {
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // через 10 дней
        timeSlot: 'AFTERNOON_2PM',
        maxParticipants: 8,
        minRequired: 4,
        pricePerPerson: 95,
        description: 'Рыбалка на больших глубинах',
        meetingPoint: 'Cascais Marina',
        status: 'FORMING'
      },
      {
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // через 2 недели
        timeSlot: 'MORNING_9AM',
        maxParticipants: 8,
        minRequired: 4,
        pricePerPerson: 95,
        description: 'Специальная поездка для новичков',
        meetingPoint: 'Cascais Marina',
        status: 'FORMING'
      }
    ];

    let createdCount = 0;
    
    for (const tripData of futureTrips) {
      try {
        const existingTrip = await prisma.groupTrip.findFirst({
          where: {
            date: tripData.date,
            timeSlot: tripData.timeSlot
          }
        });
        
        if (!existingTrip) {
          await prisma.groupTrip.create({
            data: tripData
          });
          createdCount++;
          console.log(`✅ Создана поездка: ${tripData.date.toISOString().split('T')[0]} ${tripData.timeSlot}`);
        } else {
          console.log(`⏭️  Поездка уже существует: ${tripData.date.toISOString().split('T')[0]} ${tripData.timeSlot}`);
        }
      } catch (error) {
        console.error(`❌ Ошибка создания поездки:`, error.message);
      }
    }
    
    console.log(`\n🎉 Создано ${createdCount} новых групповых поездок`);
    
    // Обновляем статистику
    const totalTrips = await prisma.groupTrip.count({
      where: {
        date: {
          gte: new Date()
        }
      }
    });
    
    console.log(`📊 Всего активных поездок в системе: ${totalTrips}`);
    
  } catch (error) {
    console.error('❌ Ошибка при создании тестовых данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestData();
