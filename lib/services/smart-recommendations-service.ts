import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import { 
  FishSpecies, 
  FishingTechnique, 
  SkillLevelRequired,
  UserRole,
  RecommendationType,
  CaptainRecommendationCategory,
  WindDirection
} from '@prisma/client';

// Инициализация OpenAI клиента
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class SmartRecommendationsService {

  // =========================================================================
  // ПОГОДНЫЙ AI: "При таких условиях лучше идёт морской окунь на джиг"
  // =========================================================================
  
  /**
   * Генерирует умные рекомендации на основе погодных условий
   */
  async generateWeatherAIRecommendations(weatherData: {
    temperature: number;
    windSpeed: number;
    windDirection: WindDirection;
    pressure: number;
    humidity: number;
    cloudCover: number;
    location: { lat: number; lon: number };
  }): Promise<{
    recommendation: string;
    recommendedSpecies: FishSpecies[];
    recommendedTechniques: FishingTechnique[];
    confidenceLevel: number;
    reasoning: string;
  }> {
    
    const prompt = `
Ты - опытный капитан рыболовного судна в Кашкайш, Португалия. 
На основе погодных условий дай умную рекомендацию для рыбалки.

ТЕКУЩИЕ ПОГОДНЫЕ УСЛОВИЯ:
- Температура: ${weatherData.temperature}°C
- Скорость ветра: ${weatherData.windSpeed} м/с
- Направление ветра: ${weatherData.windDirection}
- Атмосферное давление: ${weatherData.pressure} гПа
- Влажность: ${weatherData.humidity}%
- Облачность: ${Math.round(weatherData.cloudCover * 100)}%
- Координаты: ${weatherData.location.lat}, ${weatherData.location.lon}

ДОСТУПНЫЕ ВИДЫ РЫБ: ${Object.values(FishSpecies).join(', ')}
ДОСТУПНЫЕ ТЕХНИКИ: ${Object.values(FishingTechnique).join(', ')}

Дай рекомендацию в JSON формате:
{
  "recommendation": "Краткая рекомендация на русском (до 150 символов)",
  "species": ["SEABASS", "DORADO"], // 1-3 вида рыб из доступных
  "techniques": ["TROLLING", "JIGGING"], // 1-2 техники из доступных  
  "reasoning": "Подробное объяснение почему именно эти виды и техники лучше всего подходят при данных условиях",
  "confidence": 0.85, // уверенность от 0.1 до 0.95
  "depth_recommendation": 15.5, // рекомендуемая глубина в метрах
  "time_of_day": [6, 10] // лучшее время [начальный_час, конечный_час]
}

Базируй рекомендации на реальных знаниях о поведении рыб при разных погодных условиях.
`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Ты эксперт по морской рыбалке в Португалии. Отвечай всегда в указанном JSON формате.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) throw new Error('Нет ответа от OpenAI');

      // Парсим JSON ответ
      const aiData = JSON.parse(response);
      
      // Сохраняем рекомендацию в базу данных
      await prisma.weatherRecommendation.create({
        data: {
          weatherConditions: weatherData,
          windSpeed: weatherData.windSpeed,
          windDirection: weatherData.windDirection,
          temperature: weatherData.temperature,
          pressure: weatherData.pressure,
          humidity: weatherData.humidity,
          cloudCover: weatherData.cloudCover,
          recommendedSpecies: aiData.species || [],
          recommendedTechniques: aiData.techniques || [],
          recommendedTimeOfDay: aiData.time_of_day || null,
          recommendedDepth: aiData.depth_recommendation || null,
          aiAnalysis: aiData.recommendation,
          aiReasoning: aiData.reasoning,
          confidenceLevel: aiData.confidence || 0.5,
          location: weatherData.location,
          validFor: new Date(Date.now() + 6 * 60 * 60 * 1000), // Действительна 6 часов
          usageCount: 0,
          successRate: 0.0,
        },
      });

      return {
        recommendation: aiData.recommendation,
        recommendedSpecies: aiData.species || [],
        recommendedTechniques: aiData.techniques || [],
        confidenceLevel: aiData.confidence || 0.5,
        reasoning: aiData.reasoning,
      };

    } catch (error) {
      console.error('Ошибка генерации погодной AI рекомендации:', error);
      
      // Fallback рекомендация
      return {
        recommendation: 'При текущих условиях рекомендуется морская рыбалка с умеренной активностью.',
        recommendedSpecies: [FishSpecies.SEABASS],
        recommendedTechniques: [FishingTechnique.TROLLING],
        confidenceLevel: 0.3,
        reasoning: 'Базовая рекомендация из-за недоступности AI анализа.',
      };
    }
  }

  // =========================================================================
  // ИСТОРИЯ: "Участники похожих поездок также ходили на..."
  // =========================================================================

  /**
   * Генерирует рекомендации на основе истории похожих поездок
   */
  async generateHistoryBasedRecommendations(userId: string, currentTripId?: string): Promise<{
    recommendations: Array<{
      tripId: string;
      title: string;
      reason: string;
      similarity: number;
      participants: number;
    }>;
  }> {
    
    // Получаем историю пользователя
    const userBookings = await prisma.groupBooking.findMany({
      where: { 
        userId,
        status: 'CONFIRMED'
      },
      include: {
        trip: {
          include: {
            captain: true,
            bookings: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10, // Последние 10 поездок
    });

    if (userBookings.length === 0) {
      return { recommendations: [] };
    }

    // Извлекаем характеристики предпочтений пользователя
    const userPreferences = this.analyzeUserPreferences(userBookings);

    // Ищем похожие поездки
    const similarTrips = await prisma.groupTrip.findMany({
      where: {
        id: currentTripId ? { not: currentTripId } : undefined,
        status: 'OPEN',
        date: { gte: new Date() }, // Только будущие поездки
        OR: [
          { targetSpecies: { hasSome: userPreferences.preferredSpecies } },
          { fishingTechniques: { hasSome: userPreferences.preferredTechniques } },
          { skillLevel: { in: userPreferences.suitableSkillLevels } },
        ],
      },
      include: {
        captain: true,
        bookings: true,
        reviews: true,
      },
      take: 20,
    });

    // Вычисляем similarity score для каждой поездки
    const recommendations = similarTrips.map(trip => {
      const similarity = this.calculateTripSimilarity(userPreferences, trip);
      
      const participantsWhoBookedSimilar = this.getParticipantsWhoBookedSimilar(
        userBookings.map(b => b.tripId),
        trip.id
      );

      return {
        tripId: trip.id,
        title: trip.title,
        reason: this.generateHistoryReason(userPreferences, trip, similarity),
        similarity: similarity,
        participants: participantsWhoBookedSimilar,
      };
    })
    .filter(r => r.similarity > 0.3) // Только достаточно похожие
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5); // Топ 5 рекомендаций

    // Сохраняем рекомендации
    for (const rec of recommendations) {
      await prisma.smartRecommendation.create({
        data: {
          type: RecommendationType.HISTORY_BASED,
          targetUserId: userId,
          title: `Похожие участники также выбирают: ${rec.title}`,
          description: rec.reason,
          recommendedTripId: rec.tripId,
          relevanceScore: rec.similarity,
          confidenceScore: rec.similarity * 0.8,
          priority: Math.round(rec.similarity * 10),
          triggerContext: {
            userBookingsCount: userBookings.length,
            preferences: userPreferences,
          },
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
        },
      });
    }

    return { recommendations };
  }

  // =========================================================================
  // СОЦИАЛЬНЫЕ: "Капитан Мануэл особенно рекомендует новичкам"
  // =========================================================================

  /**
   * Генерирует социальные рекомендации от капитанов
   */
  async generateSocialRecommendations(userSkillLevel: SkillLevelRequired, userRole: UserRole): Promise<{
    recommendations: Array<{
      id: string;
      captainName: string;
      title: string;
      content: string;
      category: CaptainRecommendationCategory;
      helpfulVotes: number;
    }>;
  }> {

    const recommendations = await prisma.captainRecommendation.findMany({
      where: {
        isActive: true,
        moderationStatus: 'APPROVED',
        OR: [
          { targetSkillLevel: { has: userSkillLevel } },
          { targetSkillLevel: { has: SkillLevelRequired.ANY } },
        ],
      },
      include: {
        captain: true,
      },
      orderBy: [
        { helpfulVotes: 'desc' },
        { endorsements: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 10,
    });

    const result = recommendations.map(rec => ({
      id: rec.id,
      captainName: rec.captain?.name || 'Капитан',
      title: rec.title,
      content: rec.content,
      category: rec.category,
      helpfulVotes: rec.helpfulVotes,
    }));

    // Создаем умную рекомендацию на основе лучших советов капитанов
    if (recommendations.length > 0) {
      const bestRecommendation = recommendations[0];
      
      await prisma.smartRecommendation.create({
        data: {
          type: RecommendationType.SOCIAL_CAPTAIN,
          targetUserRole: [userRole],
          skillLevel: [userSkillLevel],
          title: `${bestRecommendation.captain?.name} рекомендует`,
          description: bestRecommendation.content,
          fromCaptainId: bestRecommendation.captainId,
          relevanceScore: Math.min(bestRecommendation.helpfulVotes / 100, 1.0),
          confidenceScore: bestRecommendation.isVerified ? 0.9 : 0.7,
          priority: bestRecommendation.helpfulVotes > 10 ? 8 : 6,
          metadata: {
            originalRecommendationId: bestRecommendation.id,
            category: bestRecommendation.category,
          },
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней
        },
      });
    }

    return { recommendations: result };
  }

  // =========================================================================
  // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
  // =========================================================================

  private analyzeUserPreferences(bookings: any[]) {
    const speciesCount: Record<string, number> = {};
    const techniquesCount: Record<string, number> = {};
    const skillLevels: SkillLevelRequired[] = [];

    bookings.forEach(booking => {
      const trip = booking.trip;
      
      // Подсчитываем предпочтения по видам рыб
      trip.targetSpecies?.forEach((species: FishSpecies) => {
        speciesCount[species] = (speciesCount[species] || 0) + 1;
      });

      // Подсчитываем предпочтения по техникам
      trip.fishingTechniques?.forEach((technique: FishingTechnique) => {
        techniquesCount[technique] = (techniquesCount[technique] || 0) + 1;
      });

      // Собираем уровни навыков
      if (trip.skillLevel) {
        skillLevels.push(trip.skillLevel);
      }
    });

    return {
      preferredSpecies: Object.entries(speciesCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([species]) => species as FishSpecies),
      
      preferredTechniques: Object.entries(techniquesCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([technique]) => technique as FishingTechnique),
        
      suitableSkillLevels: [...new Set(skillLevels)],
      totalTrips: bookings.length,
    };
  }

  private calculateTripSimilarity(userPrefs: any, trip: any): number {
    let score = 0;
    let factors = 0;

    // Сходство по видам рыб (вес 40%)
    const speciesOverlap = trip.targetSpecies?.filter((species: FishSpecies) => 
      userPrefs.preferredSpecies.includes(species)
    ).length || 0;
    
    if (trip.targetSpecies?.length > 0) {
      score += (speciesOverlap / Math.max(trip.targetSpecies.length, 1)) * 0.4;
      factors += 0.4;
    }

    // Сходство по техникам (вес 30%)
    const techniqueOverlap = trip.fishingTechniques?.filter((technique: FishingTechnique) =>
      userPrefs.preferredTechniques.includes(technique)  
    ).length || 0;

    if (trip.fishingTechniques?.length > 0) {
      score += (techniqueOverlap / Math.max(trip.fishingTechniques.length, 1)) * 0.3;
      factors += 0.3;
    }

    // Сходство по уровню навыков (вес 20%)
    if (userPrefs.suitableSkillLevels.includes(trip.skillLevel)) {
      score += 0.2;
    }
    factors += 0.2;

    // Популярность поездки (вес 10%)
    const popularity = Math.min((trip.bookings?.length || 0) / 10, 1);
    score += popularity * 0.1;
    factors += 0.1;

    return factors > 0 ? score / factors : 0;
  }

  private generateHistoryReason(userPrefs: any, trip: any, similarity: number): string {
    const reasons = [];

    const commonSpecies = trip.targetSpecies?.filter((species: FishSpecies) =>
      userPrefs.preferredSpecies.includes(species)
    ) || [];

    const commonTechniques = trip.fishingTechniques?.filter((technique: FishingTechnique) =>
      userPrefs.preferredTechniques.includes(technique)
    ) || [];

    if (commonSpecies.length > 0) {
      reasons.push(`вы часто ловите ${commonSpecies.join(', ')}`);
    }

    if (commonTechniques.length > 0) {
      reasons.push(`используете ${commonTechniques.join(', ')}`);
    }

    if (similarity > 0.7) {
      reasons.push('высокое сходство с вашими предпочтениями');
    }

    return reasons.length > 0 
      ? `Рекомендуется, поскольку ${reasons.join(' и ')}.`
      : 'Рекомендуется на основе анализа ваших предыдущих поездок.';
  }

  private async getParticipantsWhoBookedSimilar(userTripIds: string[], tripId: string): Promise<number> {
    // Находим пользователей, которые бронировали похожие поездки
    const similarBookings = await prisma.groupBooking.findMany({
      where: {
        tripId: { in: userTripIds },
        status: 'CONFIRMED',
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    const userIds = similarBookings.map(b => b.userId);

    if (userIds.length === 0) return 0;

    // Считаем сколько из них также забронировали текущую поездку
    const count = await prisma.groupBooking.count({
      where: {
        tripId: tripId,
        userId: { in: userIds },
        status: 'CONFIRMED',
      },
    });

    return count;
  }

  /**
   * Получает персонализированные рекомендации для пользователя
   */
  async getPersonalizedRecommendations(
    userId: string, 
    limit: number = 5,
    types?: RecommendationType[]
  ) {
    const where: any = {
      OR: [
        { targetUserId: userId },
        { targetUserId: null }, // Общие рекомендации
      ],
      isActive: true,
      validFrom: { lte: new Date() },
      OR: [
        { validUntil: null },
        { validUntil: { gte: new Date() } },
      ],
    };

    if (types && types.length > 0) {
      where.type = { in: types };
    }

    return await prisma.smartRecommendation.findMany({
      where,
      include: {
        recommendedTrip: {
          include: {
            captain: true,
            bookings: true,
          },
        },
        fromCaptain: true,
      },
      orderBy: [
        { priority: 'desc' },
        { relevanceScore: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });
  }
}

export const smartRecommendationsService = new SmartRecommendationsService();
