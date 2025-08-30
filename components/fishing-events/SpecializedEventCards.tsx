'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Trophy,
  GraduationCap,
  Users,
  Star,
  Fish,
  Clock,
  MapPin,
  DollarSign,
  TrendingUp,
  Award,
  BookOpen,
  Heart,
  Target,
  Anchor,
  Wind,
  Thermometer,
  Calendar,
  UserCheck,
  Crown,
  Medal,
} from 'lucide-react';
import { GroupTripDisplay } from '@/lib/types/group-events';
import { format } from 'date-fns';

interface SpecializedEventCardProps {
  event: GroupTripDisplay;
  onJoin?: (eventId: string) => void;
  onViewDetails?: (eventId: string) => void;
}

// 🏆 TOURNAMENT EVENT CARD
export function TournamentEventCard({ event, onJoin, onViewDetails }: SpecializedEventCardProps) {
  const progressPercentage = ((event.currentParticipants / event.maxParticipants) * 100);
  const isAlmostFull = progressPercentage >= 80;
  const isRegistrationOpen = event.status !== 'confirmed' && event.currentParticipants < event.maxParticipants;

  return (
    <Card className="relative overflow-hidden border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
      {/* Tournament Header Badge */}
      <div className="absolute top-0 right-0 bg-yellow-500 text-white px-3 py-1 rounded-bl-lg text-xs font-bold">
        <Trophy className="inline w-3 h-3 mr-1" />
        TOURNAMENT
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-600" />
            <span className="text-lg font-bold">Fishing Tournament</span>
          </div>
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
            {event.skillLevel?.toLowerCase()}
          </Badge>
        </CardTitle>
        <CardDescription className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {format(event.date, 'MMM dd')}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {event.timeDisplay}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {event.meetingPoint}
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Competition Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 p-2 bg-white/60 rounded-lg">
            <Target className="h-4 w-4 text-red-500" />
            <div>
              <div className="font-medium">Prize Target</div>
              <div className="text-xs text-muted-foreground">
                {Array.isArray(event.targetSpecies) && event.targetSpecies.length > 0 
                  ? event.targetSpecies.slice(0, 2).join(', ')
                  : 'Various Species'
                }
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white/60 rounded-lg">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <div>
              <div className="font-medium">Difficulty</div>
              <div className="flex items-center text-xs">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-3 w-3 ${
                      i < (event.difficultyRating || 3) 
                        ? 'text-yellow-500 fill-yellow-500' 
                        : 'text-gray-300'
                    }`} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Prize & Competition Info */}
        <div className="bg-yellow-100 dark:bg-yellow-900/20 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1 font-medium text-yellow-800 dark:text-yellow-200">
              <Medal className="h-4 w-4" />
              Competition Details
            </span>
            <Badge className="bg-yellow-200 text-yellow-800 text-xs">
              €{event.pricePerPerson}
            </Badge>
          </div>
          <div className="text-sm text-yellow-700 dark:text-yellow-300">
            Entry fee includes equipment, guide, and prizes for top 3 anglers
          </div>
        </div>

        {/* Participants Status */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-1">
              <UserCheck className="h-4 w-4" />
              Registered Competitors
            </span>
            <span className="font-medium">
              {event.currentParticipants}/{event.maxParticipants}
            </span>
          </div>
          <Progress 
            value={progressPercentage} 
            className={`h-2 ${isAlmostFull ? 'bg-red-100' : 'bg-green-100'}`}
          />
          {isAlmostFull && (
            <div className="text-xs text-red-600 flex items-center gap-1">
              <Award className="h-3 w-3" />
              Tournament almost full! Register now to secure your spot
            </div>
          )}
        </div>

        {/* Weather & Conditions */}
        {event.weatherDependency && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 p-2 rounded">
            <Wind className="h-3 w-3" />
            Weather dependent event • Min score: {event.minimumWeatherScore}/10
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {isRegistrationOpen ? (
            <Button 
              onClick={() => onJoin?.(event.tripId)} 
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Register for Tournament
            </Button>
          ) : (
            <Button variant="secondary" className="flex-1" disabled>
              Registration Closed
            </Button>
          )}
          <Button variant="outline" onClick={() => onViewDetails?.(event.tripId)}>
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// 🎓 LEARNING EXPERIENCE CARD
export function LearningEventCard({ event, onJoin, onViewDetails }: SpecializedEventCardProps) {
  const progressPercentage = ((event.currentParticipants / event.maxParticipants) * 100);
  const spotsLeft = event.maxParticipants - event.currentParticipants;

  return (
    <Card className="relative overflow-hidden border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
      {/* Learning Header Badge */}
      <div className="absolute top-0 right-0 bg-green-500 text-white px-3 py-1 rounded-bl-lg text-xs font-bold">
        <GraduationCap className="inline w-3 h-3 mr-1" />
        LEARNING
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-green-600" />
            <span className="text-lg font-bold">Fishing Masterclass</span>
          </div>
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            {event.skillLevel?.toLowerCase()}
          </Badge>
        </CardTitle>
        <CardDescription className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {format(event.date, 'MMM dd')}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {event.timeDisplay}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {event.meetingPoint}
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Learning Objectives */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 p-2 bg-white/60 rounded-lg">
            <Target className="h-4 w-4 text-green-500" />
            <div>
              <div className="font-medium">Learn Techniques</div>
              <div className="text-xs text-muted-foreground">
                {Array.isArray(event.fishingTechniques) && event.fishingTechniques.length > 0
                  ? event.fishingTechniques.slice(0, 1).join(', ')
                  : 'Various Methods'
                }
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white/60 rounded-lg">
            <Fish className="h-4 w-4 text-blue-500" />
            <div>
              <div className="font-medium">Target Species</div>
              <div className="text-xs text-muted-foreground">
                {Array.isArray(event.targetSpecies) && event.targetSpecies.length > 0
                  ? event.targetSpecies.slice(0, 2).join(', ')
                  : 'Educational Focus'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Educational Features */}
        <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1 font-medium text-green-800 dark:text-green-200">
              <GraduationCap className="h-4 w-4" />
              What You'll Learn
            </span>
            <Badge className="bg-green-200 text-green-800 text-xs">
              €{event.pricePerPerson}
            </Badge>
          </div>
          <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
            <li>• Professional fishing techniques & tips</li>
            <li>• Fish behavior & seasonal patterns</li>
            <li>• Equipment selection & maintenance</li>
            <li>• Safety protocols & best practices</li>
          </ul>
        </div>

        {/* Class Size */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Class Size (Small Groups)
            </span>
            <span className="font-medium">
              {event.currentParticipants}/{event.maxParticipants}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2 bg-green-100" />
          <div className="text-xs text-green-600">
            {spotsLeft} learning spots available • Individual attention guaranteed
          </div>
        </div>

        {/* Skill Level Info */}
        <div className="flex items-center gap-2 text-xs bg-blue-50 p-2 rounded">
          <Star className="h-3 w-3 text-blue-500" />
          Perfect for {event.skillLevel?.toLowerCase()} anglers wanting to improve their skills
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={() => onJoin?.(event.tripId)} 
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <GraduationCap className="h-4 w-4 mr-2" />
            Join Learning Session
          </Button>
          <Button variant="outline" onClick={() => onViewDetails?.(event.tripId)}>
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// 👥 COMMUNITY EVENT CARD
export function CommunityEventCard({ event, onJoin, onViewDetails }: SpecializedEventCardProps) {
  const progressPercentage = ((event.currentParticipants / event.maxParticipants) * 100);
  const isPopular = progressPercentage >= 60;

  return (
    <Card className="relative overflow-hidden border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
      {/* Community Header Badge */}
      <div className="absolute top-0 right-0 bg-purple-500 text-white px-3 py-1 rounded-bl-lg text-xs font-bold">
        <Users className="inline w-3 h-3 mr-1" />
        COMMUNITY
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-purple-600" />
            <span className="text-lg font-bold">Community Fishing</span>
          </div>
          <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
            {event.socialMode?.toLowerCase()}
          </Badge>
        </CardTitle>
        <CardDescription className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {format(event.date, 'MMM dd')}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {event.timeDisplay}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {event.meetingPoint}
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Community Features */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 p-2 bg-white/60 rounded-lg">
            <Users className="h-4 w-4 text-purple-500" />
            <div>
              <div className="font-medium">Social Experience</div>
              <div className="text-xs text-muted-foreground">
                Meet fellow anglers
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white/60 rounded-lg">
            <Anchor className="h-4 w-4 text-blue-500" />
            <div>
              <div className="font-medium">Relaxed Pace</div>
              <div className="text-xs text-muted-foreground">
                Difficulty: {event.difficultyRating}/5 ⭐
              </div>
            </div>
          </div>
        </div>

        {/* Community Benefits */}
        <div className="bg-purple-100 dark:bg-purple-900/20 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1 font-medium text-purple-800 dark:text-purple-200">
              <Heart className="h-4 w-4" />
              Community Experience
            </span>
            <Badge className="bg-purple-200 text-purple-800 text-xs">
              €{event.pricePerPerson}
            </Badge>
          </div>
          <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
            <li>• Share stories & fishing experiences</li>
            <li>• Make new fishing buddies</li>
            <li>• Group photo & memories</li>
            <li>• Inclusive & welcoming atmosphere</li>
          </ul>
        </div>

        {/* Participants & Social Proof */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Community Members
            </span>
            <span className="font-medium">
              {event.currentParticipants}/{event.maxParticipants}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2 bg-purple-100" />
          {isPopular && (
            <div className="text-xs text-purple-600 flex items-center gap-1">
              <Heart className="h-3 w-3 fill-current" />
              Popular community event! Great group forming
            </div>
          )}
        </div>

        {/* Current Participants Preview */}
        {Array.isArray(event.participants) && event.participants.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {event.participants.slice(0, 3).map((participant: any, i) => (
                <div 
                  key={i}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs font-medium flex items-center justify-center border-2 border-white"
                >
                  {participant.initials || '?'}
                </div>
              ))}
              {event.participants.length > 3 && (
                <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-xs font-medium flex items-center justify-center border-2 border-white">
                  +{event.participants.length - 3}
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {event.participants.length > 0 ? 'already joined' : 'be the first to join!'}
            </span>
          </div>
        )}

        {/* Social Mode Info */}
        <div className="flex items-center gap-2 text-xs bg-pink-50 p-2 rounded">
          <Heart className="h-3 w-3 text-pink-500" />
          {event.socialMode === 'FAMILY' 
            ? 'Family-friendly event • Kids welcome'
            : event.socialMode === 'COLLABORATIVE'
            ? 'Collaborative fishing • Share techniques & spots'
            : 'Social fishing experience • All levels welcome'
          }
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={() => onJoin?.(event.tripId)} 
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Users className="h-4 w-4 mr-2" />
            Join Community
          </Button>
          <Button variant="outline" onClick={() => onViewDetails?.(event.tripId)}>
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// 🎣 COMMERCIAL EVENT CARD (Default/Enhanced)
export function CommercialEventCard({ event, onJoin, onViewDetails }: SpecializedEventCardProps) {
  const progressPercentage = ((event.currentParticipants / event.maxParticipants) * 100);
  const isUrgent = event.urgencyLevel === 'high';
  const spotsLeft = event.maxParticipants - event.currentParticipants;

  return (
    <Card className="relative overflow-hidden border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
      {/* Commercial Header Badge */}
      <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 rounded-bl-lg text-xs font-bold">
        <Fish className="inline w-3 h-3 mr-1" />
        COMMERCIAL
      </div>

      {isUrgent && (
        <div className="absolute top-4 left-4 bg-red-500 text-white px-2 py-1 rounded text-xs animate-pulse">
          🔥 URGENT
        </div>
      )}

      <CardHeader className="pb-3">
        <CardTitle className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Fish className="h-5 w-5 text-blue-600" />
            <span className="text-lg font-bold">Professional Fishing</span>
          </div>
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            {event.skillLevel?.toLowerCase()}
          </Badge>
        </CardTitle>
        <CardDescription className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {format(event.date, 'MMM dd')}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {event.timeDisplay}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {event.meetingPoint}
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Professional Features */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 p-2 bg-white/60 rounded-lg">
            <Target className="h-4 w-4 text-blue-500" />
            <div>
              <div className="font-medium">Prime Spots</div>
              <div className="text-xs text-muted-foreground">
                Professional locations
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white/60 rounded-lg">
            <Award className="h-4 w-4 text-yellow-500" />
            <div>
              <div className="font-medium">Expert Guide</div>
              <div className="text-xs text-muted-foreground">
                15+ years experience
              </div>
            </div>
          </div>
        </div>

        {/* Commercial Package */}
        <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1 font-medium text-blue-800 dark:text-blue-200">
              <Fish className="h-4 w-4" />
              Professional Package
            </span>
            <Badge className="bg-blue-200 text-blue-800 text-xs">
              €{event.pricePerPerson}
            </Badge>
          </div>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Professional equipment included</li>
            <li>• Expert captain & guide</li>
            <li>• Fish cleaning service</li>
            <li>• Photos & certificates</li>
          </ul>
        </div>

        {/* Booking Status */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-1">
              <UserCheck className="h-4 w-4" />
              Bookings
            </span>
            <span className="font-medium">
              {event.currentParticipants}/{event.maxParticipants}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2 bg-blue-100" />
          <div className="text-xs text-blue-600">
            {spotsLeft === 1 ? 'Last spot available!' : `${spotsLeft} spots remaining`}
          </div>
        </div>

        {/* Expected Catch */}
        {event.estimatedFishCatch && event.estimatedFishCatch > 0 && (
          <div className="flex items-center gap-2 text-xs bg-cyan-50 p-2 rounded">
            <Fish className="h-3 w-3 text-cyan-500" />
            Expected catch: {event.estimatedFishCatch}kg per person
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={() => onJoin?.(event.tripId)} 
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Fish className="h-4 w-4 mr-2" />
            Book Professional Trip
          </Button>
          <Button variant="outline" onClick={() => onViewDetails?.(event.tripId)}>
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// 🎯 SMART CARD SELECTOR
interface SmartEventCardProps {
  event: GroupTripDisplay;
  onJoin?: (eventId: string) => void;
  onViewDetails?: (eventId: string) => void;
}

export function SmartEventCard({ event, onJoin, onViewDetails }: SmartEventCardProps) {
  // Determine card type based on eventType
  switch (event.eventType) {
    case 'TOURNAMENT':
      return <TournamentEventCard event={event} onJoin={onJoin} onViewDetails={onViewDetails} />;
    case 'LEARNING':
      return <LearningEventCard event={event} onJoin={onJoin} onViewDetails={onViewDetails} />;
    case 'COMMUNITY':
      return <CommunityEventCard event={event} onJoin={onJoin} onViewDetails={onViewDetails} />;
    case 'COMMERCIAL':
    default:
      return <CommercialEventCard event={event} onJoin={onJoin} onViewDetails={onViewDetails} />;
  }
}
