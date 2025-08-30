'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Star,
  Award,
  Users,
  Shield,
  Heart,
  MessageSquare,
} from 'lucide-react';

// 📝 Схема валидации рейтинга
const RatingFormSchema = z.object({
  mentorRating: z.number().min(1).max(10).optional(),
  teamworkRating: z.number().min(1).max(10).optional(), 
  reliabilityRating: z.number().min(1).max(10).optional(),
  respectRating: z.number().min(1).max(10).optional(),
  comment: z.string().min(10).max(500).optional(),
});

type RatingFormData = z.infer<typeof RatingFormSchema>;

// 🎨 Компонент слайдера рейтинга
interface RatingSliderProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  color: string;
}

const RatingSlider: React.FC<RatingSliderProps> = ({
  label,
  description,
  icon,
  value,
  onChange,
  color,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <div className="font-medium">{label}</div>
          <div className="text-sm text-gray-600">{description}</div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium min-w-[1rem]">1</span>
        <div className="flex-1 space-y-2">
          <input
            type="range"
            min="1"
            max="10"
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${color}`}
            style={{
              background: `linear-gradient(to right, ${color} 0%, ${color} ${value * 10}%, #e5e7eb ${value * 10}%, #e5e7eb 100%)`
            }}
          />
          <div className="flex items-center gap-2">
            <Progress value={value * 10} className={`flex-1 h-2`} />
            <Badge variant="outline" className="min-w-[3rem] justify-center">
              {value}/10
            </Badge>
          </div>
        </div>
        <span className="text-sm font-medium min-w-[2rem]">10</span>
      </div>
    </div>
  );
};

// 📊 Главный компонент диалога оценки
interface RateUserDialogProps {
  userId: string;
  userName: string;
  tripId?: string;
  reviewerId: string;
  onRatingAdded?: () => void;
  trigger?: React.ReactNode;
}

export const RateUserDialog: React.FC<RateUserDialogProps> = ({
  userId,
  userName,
  tripId,
  reviewerId,
  onRatingAdded,
  trigger,
}) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RatingFormData>({
    resolver: zodResolver(RatingFormSchema),
    defaultValues: {
      mentorRating: 5,
      teamworkRating: 5,
      reliabilityRating: 5,
      respectRating: 5,
      comment: '',
    },
  });

  const onSubmit = async (data: RatingFormData) => {
    try {
      setIsSubmitting(true);

      const response = await fetch('/api/reputation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          rating: {
            mentorRating: data.mentorRating,
            teamworkRating: data.teamworkRating,
            reliabilityRating: data.reliabilityRating,
            respectRating: data.respectRating,
          },
          reviewerId,
          tripId,
          comment: data.comment,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit rating');
      }

      toast.success('Рейтинг успешно добавлен!', {
        description: `Ваша оценка для ${userName} сохранена`,
      });

      setOpen(false);
      form.reset();
      onRatingAdded?.();

    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Ошибка при добавлении рейтинга', {
        description: error instanceof Error ? error.message : 'Попробуйте позже',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Проверяем, что пользователь не оценивает сам себя
  if (userId === reviewerId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Star className="w-4 h-4 mr-2" />
            Оценить
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-orange-500" />
            Оценить участника: {userName}
          </DialogTitle>
          <DialogDescription>
            Поделитесь своим опытом взаимодействия с этим рыболовом. 
            Ваша оценка поможет другим участникам сообщества.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-6">
              {/* Наставничество */}
              <FormField
                control={form.control}
                name="mentorRating"
                render={({ field }) => (
                  <FormItem>
                    <RatingSlider
                      label="Наставничество"
                      description="Как хорошо объясняет и помогает новичкам"
                      icon={<Award className="w-5 h-5 text-orange-500" />}
                      value={field.value || 5}
                      onChange={field.onChange}
                      color="bg-orange-500"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Командная работа */}
              <FormField
                control={form.control}
                name="teamworkRating"
                render={({ field }) => (
                  <FormItem>
                    <RatingSlider
                      label="Командная работа"
                      description="Как хорошо работает в команде, поддерживает других"
                      icon={<Users className="w-5 h-5 text-blue-500" />}
                      value={field.value || 5}
                      onChange={field.onChange}
                      color="bg-blue-500"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Надежность */}
              <FormField
                control={form.control}
                name="reliabilityRating"
                render={({ field }) => (
                  <FormItem>
                    <RatingSlider
                      label="Надежность"
                      description="Приходит вовремя, не отменяет в последний момент"
                      icon={<Shield className="w-5 h-5 text-green-500" />}
                      value={field.value || 5}
                      onChange={field.onChange}
                      color="bg-green-500"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Соблюдение правил */}
              <FormField
                control={form.control}
                name="respectRating"
                render={({ field }) => (
                  <FormItem>
                    <RatingSlider
                      label="Соблюдение правил"
                      description="Следует правилам рыбалки, заботится об экологии"
                      icon={<Heart className="w-5 h-5 text-red-500" />}
                      value={field.value || 5}
                      onChange={field.onChange}
                      color="bg-red-500"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Комментарий */}
              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Комментарий (необязательно)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Поделитесь деталями вашего опыта..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Опишите, что особенно понравилось или что можно улучшить
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Star className="w-4 h-4 mr-2" />
                    Отправить оценку
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RateUserDialog;
