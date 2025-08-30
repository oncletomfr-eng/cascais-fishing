'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { CalendarIcon, PlusIcon, FishIcon, StarIcon, CloudRainIcon, UsersIcon } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

// 🎣 FISHING EVENT DATA
const EVENT_TYPES = [
  { value: 'COMMERCIAL', label: 'Commercial Fishing', icon: '🎣', description: 'Professional guided fishing trips' },
  { value: 'TOURNAMENT', label: 'Tournament', icon: '🏆', description: 'Competitive fishing events' },
  { value: 'LEARNING', label: 'Learning Experience', icon: '🎓', description: 'Educational fishing sessions' },
  { value: 'COMMUNITY', label: 'Community Event', icon: '👥', description: 'Social fishing gatherings' },
] as const;

const SKILL_LEVELS = [
  { value: 'BEGINNER', label: 'Beginner', icon: '🌱' },
  { value: 'INTERMEDIATE', label: 'Intermediate', icon: '🎯' },
  { value: 'ADVANCED', label: 'Advanced', icon: '⭐' },
  { value: 'EXPERT', label: 'Expert', icon: '💎' },
  { value: 'ANY', label: 'Any Level', icon: '🌍' },
] as const;

const TARGET_SPECIES = [
  { value: 'SEABASS', label: 'Sea Bass', icon: '🐟' },
  { value: 'TUNA', label: 'Tuna', icon: '🐠' },
  { value: 'DORADO', label: 'Dorado', icon: '🐡' },
  { value: 'SARDINE', label: 'Sardine', icon: '🐠' },
  { value: 'MACKEREL', label: 'Mackerel', icon: '🐟' },
  { value: 'MARLIN', label: 'Marlin', icon: '🦈' },
  { value: 'COD', label: 'Cod', icon: '🐟' },
  { value: 'SALMON', label: 'Salmon', icon: '🍣' },
] as const;

const FISHING_TECHNIQUES = [
  { value: 'BOTTOM_FISHING', label: 'Bottom Fishing', icon: '⚓' },
  { value: 'TROLLING', label: 'Trolling', icon: '🚤' },
  { value: 'JIGGING', label: 'Jigging', icon: '🎣' },
  { value: 'FLY_FISHING', label: 'Fly Fishing', icon: '🦋' },
  { value: 'CASTING', label: 'Casting', icon: '🎯' },
  { value: 'DRIFT_FISHING', label: 'Drift Fishing', icon: '🌊' },
] as const;

const EQUIPMENT_OPTIONS = [
  { value: 'PROVIDED', label: 'All Equipment Provided', icon: '✅' },
  { value: 'BRING_OWN', label: 'Bring Your Own', icon: '🎒' },
  { value: 'RENTAL_AVAILABLE', label: 'Rental Available', icon: '🏪' },
  { value: 'PARTIALLY_PROVIDED', label: 'Partially Provided', icon: '⚡' },
] as const;

const SOCIAL_MODES = [
  { value: 'COMPETITIVE', label: 'Competitive', icon: '🏁' },
  { value: 'COLLABORATIVE', label: 'Collaborative', icon: '🤝' },
  { value: 'EDUCATIONAL', label: 'Educational', icon: '📚' },
  { value: 'RECREATIONAL', label: 'Recreational', icon: '🎉' },
  { value: 'FAMILY', label: 'Family Friendly', icon: '👨‍👩‍👧‍👦' },
] as const;

// Zod Schema for form validation
const CreateEventSchema = z.object({
  // Basic event details
  date: z.date({
    required_error: 'Please select a date for the event',
  }),
  timeSlot: z.enum(['MORNING_9AM', 'AFTERNOON_2PM'], {
    required_error: 'Please select a time slot',
  }),
  maxParticipants: z.coerce.number().min(2).max(12),
  minRequired: z.coerce.number().min(1).max(8),
  pricePerPerson: z.coerce.number().min(50).max(500),
  description: z.string().min(20).max(500),
  meetingPoint: z.string().min(5),
  
  // FishingEvent specific fields
  eventType: z.enum(['COMMERCIAL', 'TOURNAMENT', 'LEARNING', 'COMMUNITY']),
  skillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT', 'ANY']),
  socialMode: z.enum(['COMPETITIVE', 'COLLABORATIVE', 'EDUCATIONAL', 'RECREATIONAL', 'FAMILY']),
  equipment: z.enum(['PROVIDED', 'BRING_OWN', 'RENTAL_AVAILABLE', 'PARTIALLY_PROVIDED']),
  fishingTechniques: z.array(z.string()).min(1, 'Select at least one technique'),
  targetSpecies: z.array(z.string()).min(1, 'Select at least one target species'),
  weatherDependency: z.boolean(),
  difficultyRating: z.coerce.number().min(1).max(5),
  estimatedFishCatch: z.coerce.number().optional(),
  departureLocation: z.string().min(5),
  minimumWeatherScore: z.coerce.number().min(1).max(10),
  specialNotes: z.string().optional(),
});

type CreateEventFormData = z.infer<typeof CreateEventSchema>;

interface CreateEventDialogProps {
  children?: React.ReactNode;
  onEventCreated?: (event: any) => void;
  onRefreshEvents?: () => void;
}

export function CreateEventDialog({ children, onEventCreated, onRefreshEvents }: CreateEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateEventFormData>({
    resolver: zodResolver(CreateEventSchema),
    defaultValues: {
      timeSlot: 'MORNING_9AM',
      maxParticipants: 8,
      minRequired: 4,
      pricePerPerson: 95,
      eventType: 'COMMERCIAL',
      skillLevel: 'ANY',
      socialMode: 'COLLABORATIVE',
      equipment: 'PROVIDED',
      fishingTechniques: [],
      targetSpecies: [],
      weatherDependency: true,
      difficultyRating: 3,
      minimumWeatherScore: 6,
      meetingPoint: 'Cascais Marina',
      departureLocation: 'Cascais Marina',
      description: '',
      specialNotes: '',
    },
  });

  const selectedEventType = form.watch('eventType');
  const selectedSkillLevel = form.watch('skillLevel');

  const onSubmit = async (data: CreateEventFormData) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/group-trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create event');
      }

      const result = await response.json();
      
      toast.success('🎣 Fishing Event Created!', {
        description: `Your ${data.eventType.toLowerCase()} event has been scheduled for ${format(data.date, 'PPP')}.`,
      });

      onEventCreated?.(result.data);
      onRefreshEvents?.();
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error('❌ Error creating event', {
        description: error instanceof Error ? error.message : 'Please try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="gap-2">
            <PlusIcon className="h-4 w-4" />
            Create Fishing Event
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FishIcon className="h-5 w-5 text-blue-600" />
            Create New Fishing Event
          </DialogTitle>
          <DialogDescription>
            Set up a new fishing adventure and invite participants to join your trip.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Event Type & Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select event type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EVENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <span>{type.icon}</span>
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="skillLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Skill Level Required</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select skill level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SKILL_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            <div className="flex items-center gap-2">
                              <span>{level.icon}</span>
                              <span>{level.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Event Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date() || date < new Date('1900-01-01')
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeSlot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Slot</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MORNING_9AM">🌅 Morning (9:00 AM)</SelectItem>
                        <SelectItem value="AFTERNOON_2PM">🌞 Afternoon (2:00 PM)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Participants & Pricing */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="maxParticipants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Participants</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min="2" max="12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minRequired"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Required</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min="1" max="8" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pricePerPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (€)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min="50" max="500" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Target Species Selection */}
            <FormField
              control={form.control}
              name="targetSpecies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Species</FormLabel>
                  <FormDescription>
                    Select the fish species you'll be targeting on this trip.
                  </FormDescription>
                  <div className="flex flex-wrap gap-2">
                    {TARGET_SPECIES.map((species) => (
                      <Badge
                        key={species.value}
                        variant={field.value.includes(species.value) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          const newValue = field.value.includes(species.value)
                            ? field.value.filter(v => v !== species.value)
                            : [...field.value, species.value];
                          field.onChange(newValue);
                        }}
                      >
                        <span className="mr-1">{species.icon}</span>
                        {species.label}
                      </Badge>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fishing Techniques Selection */}
            <FormField
              control={form.control}
              name="fishingTechniques"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fishing Techniques</FormLabel>
                  <FormDescription>
                    Choose the techniques that will be used during the trip.
                  </FormDescription>
                  <div className="flex flex-wrap gap-2">
                    {FISHING_TECHNIQUES.map((technique) => (
                      <Badge
                        key={technique.value}
                        variant={field.value.includes(technique.value) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          const newValue = field.value.includes(technique.value)
                            ? field.value.filter(v => v !== technique.value)
                            : [...field.value, technique.value];
                          field.onChange(newValue);
                        }}
                      >
                        <span className="mr-1">{technique.icon}</span>
                        {technique.label}
                      </Badge>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Equipment & Social Mode */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="equipment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipment</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select equipment option" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EQUIPMENT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <span>{option.icon}</span>
                              <span>{option.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="socialMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Social Mode</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select social mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SOCIAL_MODES.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>
                            <div className="flex items-center gap-2">
                              <span>{mode.icon}</span>
                              <span>{mode.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Difficulty & Weather Settings */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="difficultyRating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty (1-5)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min="1" max="5" />
                    </FormControl>
                    <FormDescription>
                      ⭐ 1 = Easy, 5 = Expert
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minimumWeatherScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Weather Score</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min="1" max="10" />
                    </FormControl>
                    <FormDescription>
                      🌤️ Required weather rating
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimatedFishCatch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Est. Fish Catch (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min="0" />
                    </FormControl>
                    <FormDescription>
                      🐟 Expected catch per person
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Weather Dependency */}
            <FormField
              control={form.control}
              name="weatherDependency"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="flex items-center gap-2">
                      <CloudRainIcon className="h-4 w-4" />
                      Weather Dependent Event
                    </FormLabel>
                    <FormDescription>
                      This event may be cancelled or rescheduled due to poor weather conditions.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Location Details */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="meetingPoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting Point</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Cascais Marina" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="departureLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departure Location</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Cascais Marina" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description & Notes */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Describe your fishing event, what participants can expect, any special features..."
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide a detailed description of the fishing experience (20-500 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Any special requirements, bring extra gear, dietary considerations..."
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Creating Event...
                  </>
                ) : (
                  <>
                    <FishIcon className="h-4 w-4" />
                    Create Fishing Event
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
