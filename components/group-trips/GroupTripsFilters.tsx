'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Paper,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Slider,
  Switch,
  FormControlLabel,
  TextField,
  Divider,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
  CalendarToday as CalendarIcon,
  Schedule as TimeIcon,
  People as PeopleIcon,
  Sort as SortIcon,
  Phishing as FishIcon,
  EmojiEvents as TrophyIcon,
  School as LearningIcon,
  Group as CommunityIcon,
  Star as SkillIcon,
  Build as EquipmentIcon,
  WbCloudy as WeatherIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru } from 'date-fns/locale';
import {
  TripFilters as GroupTripFilters,
  TripSortBy as SortOption,
} from '@/lib/types/group-events';

interface GroupTripsFiltersProps {
  filters: GroupTripFilters;
  onFiltersChange: (filters: Partial<GroupTripFilters>) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'date_asc', label: 'По дате (сначала ближайшие)' },
  { value: 'date_desc', label: 'По дате (сначала дальние)' },
  { value: 'participants_desc', label: 'По количеству участников (убыв.)' },
  { value: 'participants_asc', label: 'По количеству участников (возр.)' },
  { value: 'created_desc', label: 'По времени создания (новые)' },
  { value: 'urgency_desc', label: 'По срочности' },
];

const timeSlotOptions = [
  { value: 'morning', label: 'Утром (9:00)' },
  { value: 'afternoon', label: 'Днём (14:00)' },
];

const statusOptions = [
  { value: 'forming', label: 'Набираются' },
  { value: 'almost_full', label: 'Почти заполнены' },
  { value: 'confirmed', label: 'Подтверждены' },
];

// 🎣 NEW FISHING EVENT OPTIONS
const eventTypeOptions = [
  { value: 'commercial', label: 'Коммерческая' },
  { value: 'tournament', label: 'Турнир' },
  { value: 'learning', label: 'Обучение' },
  { value: 'community', label: 'Сообщество' },
];

const skillLevelOptions = [
  { value: 'beginner', label: 'Новичок' },
  { value: 'intermediate', label: 'Средний' },
  { value: 'advanced', label: 'Продвинутый' },
  { value: 'expert', label: 'Эксперт' },
];

const socialModeOptions = [
  { value: 'competitive', label: 'Соревновательный' },
  { value: 'collaborative', label: 'Совместный' },
  { value: 'educational', label: 'Обучающий' },
  { value: 'recreational', label: 'Отдых' },
  { value: 'family', label: 'Семейный' },
];

const equipmentOptions = [
  { value: 'provided', label: 'Предоставляется' },
  { value: 'bring_own', label: 'Свое' },
  { value: 'rental_available', label: 'Есть аренда' },
  { value: 'partially_provided', label: 'Частично' },
];

export default function GroupTripsFilters({
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  className = '',
}: GroupTripsFiltersProps) {
  const [localFilters, setLocalFilters] = React.useState<GroupTripFilters>(filters);
  const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false);

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof GroupTripFilters];
    return value !== undefined && value !== null;
  });

  const handleFilterChange = (key: keyof GroupTripFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange({ [key]: value });
  };

  const handleDateRangeChange = (field: 'start' | 'end', date: Date | null) => {
    const currentRange = localFilters.dateRange || { start: new Date(), end: new Date() };
    const newRange = { ...currentRange, [field]: date };
    
    if (newRange.start && newRange.end) {
      handleFilterChange('dateRange', newRange);
    }
  };

  const handleClearFilters = () => {
    const emptyFilters: GroupTripFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const handleMinSpotsChange = (event: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    handleFilterChange('minAvailableSpots', value > 0 ? value : undefined);
  };

  const handleMaxDaysChange = (event: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    handleFilterChange('maxDaysAhead', value < 30 ? value : undefined);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={className}
      >
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Фильтры и сортировка
              </Typography>
              {hasActiveFilters && (
                <Chip 
                  label="Активны" 
                  size="small" 
                  color="primary" 
                  variant="outlined" 
                />
              )}
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="text"
                size="small"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              >
                {isAdvancedOpen ? 'Простые' : 'Расширенные'}
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={handleClearFilters}
                >
                  Очистить
                </Button>
              )}
            </Box>
          </Box>

          <Grid container spacing={3}>
            {/* Сортировка */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Сортировка</InputLabel>
                <Select
                  value={sortBy}
                  label="Сортировка"
                  onChange={(e) => onSortChange(e.target.value as SortOption)}
                  startAdornment={<SortIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                >
                  {sortOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Время поездки */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Время поездки</InputLabel>
                <Select
                  value={filters.timeSlot || ''}
                  label="Время поездки"
                  onChange={(e) => handleFilterChange('timeSlot', e.target.value || undefined)}
                  startAdornment={<TimeIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                >
                  <MenuItem value="">Любое время</MenuItem>
                  {timeSlotOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Статус поездки */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Статус</InputLabel>
                <Select
                  value={filters.status || ''}
                  label="Статус"
                  onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                  startAdornment={<PeopleIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                >
                  <MenuItem value="">Любой статус</MenuItem>
                  {statusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Расширенные фильтры */}
            {isAdvancedOpen && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    Расширенные фильтры
                  </Typography>
                </Grid>

                {/* Диапазон дат */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      Диапазон дат
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <DatePicker
                      label="С"
                      value={filters.dateRange?.start || null}
                      onChange={(date) => handleDateRangeChange('start', date)}
                      slotProps={{
                        textField: { 
                          size: 'small',
                          sx: { flexGrow: 1 },
                        },
                      }}
                      minDate={new Date()}
                    />
                    <DatePicker
                      label="По"
                      value={filters.dateRange?.end || null}
                      onChange={(date) => handleDateRangeChange('end', date)}
                      slotProps={{
                        textField: { 
                          size: 'small',
                          sx: { flexGrow: 1 },
                        },
                      }}
                      minDate={filters.dateRange?.start || new Date()}
                    />
                  </Box>
                </Grid>

                {/* Минимум свободных мест */}
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Минимум свободных мест: {filters.minAvailableSpots || 1}
                  </Typography>
                  <Slider
                    value={filters.minAvailableSpots || 1}
                    onChange={handleMinSpotsChange}
                    min={1}
                    max={8}
                    step={1}
                    marks
                    valueLabelDisplay="auto"
                    sx={{ mt: 1 }}
                  />
                </Grid>

                {/* Максимум дней вперед */}
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Максимум дней вперёд: {filters.maxDaysAhead || 30}
                  </Typography>
                  <Slider
                    value={filters.maxDaysAhead || 30}
                    onChange={handleMaxDaysChange}
                    min={1}
                    max={30}
                    step={1}
                    marks={[
                      { value: 1, label: '1' },
                      { value: 7, label: '7' },
                      { value: 14, label: '14' },
                      { value: 30, label: '30' },
                    ]}
                    valueLabelDisplay="auto"
                    sx={{ mt: 1 }}
                  />
                </Grid>

                {/* 🎣 FISHING EVENT FILTERS SECTION */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FishIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                    Фильтры рыбалки
                  </Typography>
                </Grid>

                {/* Event Type */}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Тип события</InputLabel>
                    <Select
                      value={filters.eventType || ''}
                      label="Тип события"
                      onChange={(e) => handleFilterChange('eventType', e.target.value || undefined)}
                      startAdornment={<FishIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                    >
                      <MenuItem value="">Любой тип</MenuItem>
                      {eventTypeOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Skill Level */}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Уровень навыков</InputLabel>
                    <Select
                      value={filters.experience === 'any' ? '' : filters.experience || ''}
                      label="Уровень навыков"
                      onChange={(e) => handleFilterChange('experience', e.target.value || 'any')}
                      startAdornment={<SkillIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                    >
                      <MenuItem value="">Любой</MenuItem>
                      {skillLevelOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Social Mode */}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Формат</InputLabel>
                    <Select
                      value={filters.socialMode || ''}
                      label="Формат"
                      onChange={(e) => handleFilterChange('socialMode', e.target.value || undefined)}
                      startAdornment={<CommunityIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                    >
                      <MenuItem value="">Любой</MenuItem>
                      {socialModeOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Equipment */}
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Снаряжение</InputLabel>
                    <Select
                      value={filters.equipment || ''}
                      label="Снаряжение"
                      onChange={(e) => handleFilterChange('equipment', e.target.value || undefined)}
                      startAdornment={<EquipmentIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                    >
                      <MenuItem value="">Любое</MenuItem>
                      {equipmentOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Difficulty Range */}
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Сложность: {filters.difficultyRange?.min || 1} - {filters.difficultyRange?.max || 5}
                  </Typography>
                  <Slider
                    value={[filters.difficultyRange?.min || 1, filters.difficultyRange?.max || 5]}
                    onChange={(e, values) => {
                      if (Array.isArray(values)) {
                        handleFilterChange('difficultyRange', {
                          min: values[0],
                          max: values[1]
                        });
                      }
                    }}
                    min={1}
                    max={5}
                    step={1}
                    marks
                    valueLabelDisplay="auto"
                    sx={{ mt: 1 }}
                  />
                </Grid>

                {/* Weather Dependency */}
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={filters.weatherDependency === false}
                        onChange={(e) => handleFilterChange('weatherDependency', e.target.checked ? false : undefined)}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WeatherIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2">Только независимые от погоды</Typography>
                      </Box>
                    }
                  />
                </Grid>
              </>
            )}
          </Grid>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Активные фильтры:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {filters.timeSlot && (
                  <Chip
                    label={`Время: ${timeSlotOptions.find(opt => opt.value === filters.timeSlot)?.label}`}
                    onDelete={() => handleFilterChange('timeSlot', undefined)}
                    size="small"
                  />
                )}
                {filters.status && (
                  <Chip
                    label={`Статус: ${statusOptions.find(opt => opt.value === filters.status)?.label}`}
                    onDelete={() => handleFilterChange('status', undefined)}
                    size="small"
                  />
                )}
                {filters.dateRange && (
                  <Chip
                    label="Диапазон дат выбран"
                    onDelete={() => handleFilterChange('dateRange', undefined)}
                    size="small"
                  />
                )}
                {filters.minAvailableSpots && filters.minAvailableSpots > 1 && (
                  <Chip
                    label={`Мин. места: ${filters.minAvailableSpots}`}
                    onDelete={() => handleFilterChange('minAvailableSpots', undefined)}
                    size="small"
                  />
                )}
                {filters.maxDaysAhead && filters.maxDaysAhead < 30 && (
                  <Chip
                    label={`Макс. дней: ${filters.maxDaysAhead}`}
                    onDelete={() => handleFilterChange('maxDaysAhead', undefined)}
                    size="small"
                  />
                )}
                {/* 🎣 NEW FISHING EVENT FILTER CHIPS */}
                {filters.eventType && (
                  <Chip
                    label={`Тип: ${eventTypeOptions.find(opt => opt.value === filters.eventType)?.label}`}
                    onDelete={() => handleFilterChange('eventType', undefined)}
                    size="small"
                  />
                )}
                {filters.experience && filters.experience !== 'any' && (
                  <Chip
                    label={`Навыки: ${skillLevelOptions.find(opt => opt.value === filters.experience)?.label}`}
                    onDelete={() => handleFilterChange('experience', 'any')}
                    size="small"
                  />
                )}
                {filters.socialMode && (
                  <Chip
                    label={`Формат: ${socialModeOptions.find(opt => opt.value === filters.socialMode)?.label}`}
                    onDelete={() => handleFilterChange('socialMode', undefined)}
                    size="small"
                  />
                )}
                {filters.equipment && (
                  <Chip
                    label={`Снаряжение: ${equipmentOptions.find(opt => opt.value === filters.equipment)?.label}`}
                    onDelete={() => handleFilterChange('equipment', undefined)}
                    size="small"
                  />
                )}
                {filters.difficultyRange && (filters.difficultyRange.min > 1 || filters.difficultyRange.max < 5) && (
                  <Chip
                    label={`Сложность: ${filters.difficultyRange.min}-${filters.difficultyRange.max}`}
                    onDelete={() => handleFilterChange('difficultyRange', undefined)}
                    size="small"
                  />
                )}
                {filters.weatherDependency === false && (
                  <Chip
                    label="Независимые от погоды"
                    onDelete={() => handleFilterChange('weatherDependency', undefined)}
                    size="small"
                  />
                )}
              </Box>
            </Box>
          )}
        </Paper>
      </motion.div>
    </LocalizationProvider>
  );
}
