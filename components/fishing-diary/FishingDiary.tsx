'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useDropzone } from 'react-dropzone';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement, 
  PointElement,
  Title, 
  Tooltip, 
  Legend,
  ArcElement 
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
// @ts-ignore
import * as piexif from 'piexifjs';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { 
  MapPin, 
  Camera, 
  Plus, 
  Save, 
  Calendar, 
  Fish, 
  TrendingUp, 
  Upload,
  Star,
  MapPinIcon,
  Thermometer,
  Wind,
  Clock,
  Target,
  BarChart3
} from 'lucide-react';

// Регистрируем Chart.js компоненты
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface ExifData {
  gpsLatitude?: number;
  gpsLongitude?: number;
  captureTime?: string;
  cameraModel?: string;
  lensModel?: string;
  allExif?: any;
}

interface MediaFile extends File {
  preview?: string;
  exifData?: ExifData;
}

interface DiaryEntry {
  id?: string;
  title: string;
  description?: string;
  date: Date;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  weather?: any;
  temperature?: number;
  windSpeed?: number;
  windDirection?: string;
  totalWeight?: number;
  totalCount: number;
  rodType?: string;
  reelType?: string;
  lineType?: string;
  baitUsed: string[];
  lureColor?: string;
  tags: string[];
  isPrivate: boolean;
  rating?: number;
  fishCaught: FishCatch[];
  media: MediaFile[];
}

interface FishCatch {
  id?: string;
  species: string;
  weight?: number;
  length?: number;
  quantity: number;
  timeOfCatch?: Date;
  depth?: number;
  method?: string;
  baitUsed?: string;
  wasReleased: boolean;
  notes?: string;
}

interface Statistics {
  totalEntries: number;
  totalFish: number;
  totalWeight: number;
  favoriteSpecies: string;
  bestSpot: string;
  monthlyStats: Array<{ month: string; catches: number }>;
  speciesDistribution: Array<{ species: string; count: number }>;
}

const FishingDiary: React.FC = () => {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [currentEntry, setCurrentEntry] = useState<DiaryEntry>({
    title: '',
    description: '',
    date: new Date(),
    totalCount: 0,
    baitUsed: [],
    tags: [],
    isPrivate: false,
    fishCaught: [],
    media: []
  });
  const [isCreating, setIsCreating] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<GeolocationPosition | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Геолокация
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "Геолокация недоступна",
        description: "Ваш браузер не поддерживает геолокацию",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const geoPosition: GeolocationPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        };
        
        setCurrentPosition(geoPosition);
        setCurrentEntry(prev => ({
          ...prev,
          latitude: geoPosition.latitude,
          longitude: geoPosition.longitude,
          accuracy: geoPosition.accuracy
        }));
        
        setIsLoadingLocation(false);
        toast({
          title: "Локация получена!",
          description: `Координаты: ${geoPosition.latitude.toFixed(6)}, ${geoPosition.longitude.toFixed(6)}`
        });
      },
      (error) => {
        setIsLoadingLocation(false);
        let message = "Не удалось получить координаты";
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            message = "Доступ к геолокации запрещен";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Координаты недоступны";
            break;
          case error.TIMEOUT:
            message = "Превышено время ожидания";
            break;
        }
        
        toast({
          title: "Ошибка геолокации",
          description: message,
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000
      }
    );
  }, []);

  // Обработка файлов с react-dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const processFiles = async () => {
      const processedFiles: MediaFile[] = [];
      
      for (const file of acceptedFiles) {
        const mediaFile = file as MediaFile;
        
        // Создаем превью
        mediaFile.preview = URL.createObjectURL(file);
        
        // Извлекаем EXIF данные для изображений
        if (file.type.startsWith('image/')) {
          try {
            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                const result = e.target?.result as string;
                const exifObj = piexif.load(result);
                
                const exifData: ExifData = {
                  allExif: exifObj
                };
                
                // GPS координаты из EXIF
                if (exifObj.GPS && Object.keys(exifObj.GPS).length > 0) {
                  const gps = exifObj.GPS;
                  
                  if (gps[piexif.GPSIFD.GPSLatitude] && gps[piexif.GPSIFD.GPSLongitude]) {
                    const latRef = gps[piexif.GPSIFD.GPSLatitudeRef];
                    const lngRef = gps[piexif.GPSIFD.GPSLongitudeRef];
                    
                    const lat = convertDMSToDD(gps[piexif.GPSIFD.GPSLatitude], latRef);
                    const lng = convertDMSToDD(gps[piexif.GPSIFD.GPSLongitude], lngRef);
                    
                    exifData.gpsLatitude = lat;
                    exifData.gpsLongitude = lng;
                  }
                }
                
                // Время съемки
                if (exifObj.Exif && exifObj.Exif[piexif.ExifIFD.DateTimeOriginal]) {
                  exifData.captureTime = exifObj.Exif[piexif.ExifIFD.DateTimeOriginal];
                }
                
                // Модель камеры
                if (exifObj['0th'] && exifObj['0th'][piexif.ImageIFD.Make]) {
                  exifData.cameraModel = exifObj['0th'][piexif.ImageIFD.Make];
                }
                
                // Модель объектива
                if (exifObj.Exif && exifObj.Exif[piexif.ExifIFD.LensMake]) {
                  exifData.lensModel = exifObj.Exif[piexif.ExifIFD.LensMake];
                }
                
                mediaFile.exifData = exifData;
                
                // Если у фото есть GPS, предлагаем использовать его
                if (exifData.gpsLatitude && exifData.gpsLongitude && !currentEntry.latitude) {
                  setCurrentEntry(prev => ({
                    ...prev,
                    latitude: exifData.gpsLatitude!,
                    longitude: exifData.gpsLongitude!
                  }));
                  
                  toast({
                    title: "GPS из фото",
                    description: "Координаты извлечены из EXIF данных фотографии"
                  });
                }
                
              } catch (error) {
                console.warn('Ошибка при извлечении EXIF данных:', error);
              }
            };
            reader.readAsDataURL(file);
          } catch (error) {
            console.warn('Ошибка при обработке EXIF:', error);
          }
        }
        
        processedFiles.push(mediaFile);
      }
      
      setCurrentEntry(prev => ({
        ...prev,
        media: [...prev.media, ...processedFiles]
      }));
      
      toast({
        title: "Файлы загружены",
        description: `Добавлено файлов: ${processedFiles.length}`
      });
    };
    
    processFiles();
  }, [currentEntry.latitude]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'video/*': ['.mp4', '.mov', '.avi']
    },
    maxFiles: 10
  });

  // Конвертация DMS в decimal degrees
  const convertDMSToDD = (dms: number[][], ref: string): number => {
    let dd = dms[0][0] / dms[0][1] + dms[1][0] / (60 * dms[1][1]) + dms[2][0] / (3600 * dms[2][1]);
    if (ref === 'S' || ref === 'W') dd = dd * -1;
    return dd;
  };

  // Загрузка записей дневника
  const loadEntries = async () => {
    if (!session?.user?.id) return;
    
    try {
      const response = await fetch('/api/fishing-diary');
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries || []);
        setStatistics(data.statistics || null);
      }
    } catch (error) {
      console.error('Ошибка при загрузке записей:', error);
    }
  };

  // Сохранение записи
  const saveEntry = async () => {
    if (!session?.user?.id || !currentEntry.title.trim()) {
      toast({
        title: "Ошибка",
        description: "Необходимо указать заголовок записи",
        variant: "destructive"
      });
      return;
    }

    try {
      const formData = new FormData();
      
      // Основные данные
      formData.append('entry', JSON.stringify({
        ...currentEntry,
        media: undefined // медиа файлы обрабатываем отдельно
      }));
      
      // Медиа файлы
      currentEntry.media.forEach((file, index) => {
        formData.append(`media_${index}`, file);
        if (file.exifData) {
          formData.append(`exif_${index}`, JSON.stringify(file.exifData));
        }
      });
      
      const response = await fetch('/api/fishing-diary', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        toast({
          title: "Запись сохранена",
          description: "Ваша запись успешно добавлена в дневник"
        });
        
        // Сброс формы
        setCurrentEntry({
          title: '',
          description: '',
          date: new Date(),
          totalCount: 0,
          baitUsed: [],
          tags: [],
          isPrivate: false,
          fishCaught: [],
          media: []
        });
        
        setIsDialogOpen(false);
        loadEntries(); // Перезагружаем список
      } else {
        throw new Error('Ошибка при сохранении');
      }
    } catch (error) {
      console.error('Ошибка при сохранении записи:', error);
      toast({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить запись",
        variant: "destructive"
      });
    }
  };

  // Добавление рыбы в улов
  const addFishCatch = () => {
    const newCatch: FishCatch = {
      species: '',
      quantity: 1,
      wasReleased: false
    };
    
    setCurrentEntry(prev => ({
      ...prev,
      fishCaught: [...prev.fishCaught, newCatch]
    }));
  };

  // Удаление рыбы из улова
  const removeFishCatch = (index: number) => {
    setCurrentEntry(prev => ({
      ...prev,
      fishCaught: prev.fishCaught.filter((_, i) => i !== index)
    }));
  };

  // Обновление данных о рыбе
  const updateFishCatch = (index: number, updates: Partial<FishCatch>) => {
    setCurrentEntry(prev => ({
      ...prev,
      fishCaught: prev.fishCaught.map((fish, i) => 
        i === index ? { ...fish, ...updates } : fish
      )
    }));
  };

  useEffect(() => {
    loadEntries();
  }, [session?.user?.id]);

  // Очистка превью при размонтировании
  useEffect(() => {
    return () => {
      currentEntry.media.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [currentEntry.media]);

  // Подготовка данных для графиков
  const monthlyChartData = {
    labels: statistics?.monthlyStats.map(stat => stat.month) || [],
    datasets: [{
      label: 'Количество поимок',
      data: statistics?.monthlyStats.map(stat => stat.catches) || [],
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1
    }]
  };

  const speciesChartData = {
    labels: statistics?.speciesDistribution.map(spec => spec.species) || [],
    datasets: [{
      data: statistics?.speciesDistribution.map(spec => spec.count) || [],
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)',
        'rgba(245, 158, 11, 0.8)', 
        'rgba(34, 197, 94, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(147, 51, 234, 0.8)',
        'rgba(236, 72, 153, 0.8)'
      ]
    }]
  };

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <p>Для доступа к дневнику рыболова необходимо войти в систему.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🎣 Цифровой дневник рыболова</h1>
          <p className="text-gray-600 mt-2">GPS координаты, фото с метаданными, статистика</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Новая запись
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Создать запись в дневнике</DialogTitle>
              <DialogDescription>
                Добавьте детали вашей рыбалки с GPS координатами и фотографиями
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Основная информация */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Заголовок записи *</Label>
                  <Input
                    id="title"
                    value={currentEntry.title}
                    onChange={(e) => setCurrentEntry(prev => ({...prev, title: e.target.value}))}
                    placeholder="Например: Утренняя рыбалка в заливе"
                  />
                </div>
                
                <div>
                  <Label htmlFor="date">Дата рыбалки</Label>
                  <Input
                    id="date"
                    type="datetime-local"
                    value={currentEntry.date.toISOString().slice(0, 16)}
                    onChange={(e) => setCurrentEntry(prev => ({...prev, date: new Date(e.target.value)}))}
                  />
                </div>
              </div>
              
              {/* Описание */}
              <div>
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={currentEntry.description || ''}
                  onChange={(e) => setCurrentEntry(prev => ({...prev, description: e.target.value}))}
                  placeholder="Опишите как прошла рыбалка..."
                  rows={3}
                />
              </div>
              
              {/* GPS координаты */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    GPS Координаты
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <Button
                      onClick={getCurrentLocation}
                      disabled={isLoadingLocation}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <MapPinIcon className="h-4 w-4" />
                      {isLoadingLocation ? 'Получение...' : 'Получить координаты'}
                    </Button>
                    
                    {currentEntry.latitude && currentEntry.longitude && (
                      <div className="text-sm text-gray-600">
                        📍 {currentEntry.latitude.toFixed(6)}, {currentEntry.longitude.toFixed(6)}
                        {currentEntry.accuracy && (
                          <span className="ml-2">±{Math.round(currentEntry.accuracy)}м</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="locationName">Название места</Label>
                      <Input
                        id="locationName"
                        value={currentEntry.locationName || ''}
                        onChange={(e) => setCurrentEntry(prev => ({...prev, locationName: e.target.value}))}
                        placeholder="Например: Пирс Кашкайш"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="latitude">Широта</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="0.000001"
                        value={currentEntry.latitude || ''}
                        onChange={(e) => setCurrentEntry(prev => ({...prev, latitude: parseFloat(e.target.value) || undefined}))}
                        placeholder="38.696200"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="longitude">Долгота</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="0.000001"
                        value={currentEntry.longitude || ''}
                        onChange={(e) => setCurrentEntry(prev => ({...prev, longitude: parseFloat(e.target.value) || undefined}))}
                        placeholder="-9.421366"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Фото и видео */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Фото и видео
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    {...getRootProps()} 
                    className={`border-2 border-dashed p-6 rounded-lg text-center cursor-pointer transition-colors ${
                      isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    {isDragActive ? (
                      <p>Отпустите файлы здесь...</p>
                    ) : (
                      <div>
                        <p>Перетащите фото/видео сюда или кликните для выбора</p>
                        <p className="text-sm text-gray-500 mt-2">
                          Поддерживаются: JPEG, PNG, MP4, MOV (до 10 файлов)
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Превью загруженных файлов */}
                  {currentEntry.media.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Загруженные файлы:</h4>
                      <div className="grid grid-cols-3 gap-4">
                        {currentEntry.media.map((file, index) => (
                          <div key={index} className="relative">
                            {file.type.startsWith('image/') ? (
                              <img 
                                src={file.preview} 
                                alt={file.name}
                                className="w-full h-24 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                                <span className="text-xs text-gray-500">{file.name}</span>
                              </div>
                            )}
                            
                            {/* EXIF данные */}
                            {file.exifData && (
                              <div className="absolute top-1 right-1">
                                <Badge variant="secondary" className="text-xs">EXIF</Badge>
                              </div>
                            )}
                            
                            <Button
                              size="sm"
                              variant="destructive"
                              className="absolute top-1 left-1"
                              onClick={() => {
                                if (file.preview) URL.revokeObjectURL(file.preview);
                                setCurrentEntry(prev => ({
                                  ...prev,
                                  media: prev.media.filter((_, i) => i !== index)
                                }));
                              }}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Улов */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Fish className="h-5 w-5" />
                    Улов
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {currentEntry.fishCaught.map((fish, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-medium">Рыба #{index + 1}</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeFishCatch(index)}
                          >
                            Удалить
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Вид рыбы</Label>
                            <Select
                              value={fish.species}
                              onValueChange={(value) => updateFishCatch(index, { species: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите вид" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SEA_BASS">Окунь</SelectItem>
                                <SelectItem value="SARDINE">Сардина</SelectItem>
                                <SelectItem value="MACKEREL">Скумбрия</SelectItem>
                                <SelectItem value="BREAM">Лещ</SelectItem>
                                <SelectItem value="TUNA">Тунец</SelectItem>
                                <SelectItem value="CODFISH">Треска</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>Вес (кг)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={fish.weight || ''}
                              onChange={(e) => updateFishCatch(index, { 
                                weight: parseFloat(e.target.value) || undefined 
                              })}
                              placeholder="0.5"
                            />
                          </div>
                          
                          <div>
                            <Label>Длина (см)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={fish.length || ''}
                              onChange={(e) => updateFishCatch(index, { 
                                length: parseFloat(e.target.value) || undefined 
                              })}
                              placeholder="25"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <Label>Количество</Label>
                            <Input
                              type="number"
                              min="1"
                              value={fish.quantity}
                              onChange={(e) => updateFishCatch(index, { 
                                quantity: parseInt(e.target.value) || 1 
                              })}
                            />
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`released-${index}`}
                              checked={fish.wasReleased}
                              onChange={(e) => updateFishCatch(index, { 
                                wasReleased: e.target.checked 
                              })}
                            />
                            <Label htmlFor={`released-${index}`}>Отпущена</Label>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <Button 
                      onClick={addFishCatch} 
                      variant="outline" 
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить рыбу
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Снасти и условия */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Снасти</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Удилище</Label>
                      <Input
                        value={currentEntry.rodType || ''}
                        onChange={(e) => setCurrentEntry(prev => ({...prev, rodType: e.target.value}))}
                        placeholder="Спиннинг 2.4м"
                      />
                    </div>
                    
                    <div>
                      <Label>Катушка</Label>
                      <Input
                        value={currentEntry.reelType || ''}
                        onChange={(e) => setCurrentEntry(prev => ({...prev, reelType: e.target.value}))}
                        placeholder="Безынерционная"
                      />
                    </div>
                    
                    <div>
                      <Label>Леска</Label>
                      <Input
                        value={currentEntry.lineType || ''}
                        onChange={(e) => setCurrentEntry(prev => ({...prev, lineType: e.target.value}))}
                        placeholder="Плетенка 0.2мм"
                      />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Условия</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Температура (°C)</Label>
                      <Input
                        type="number"
                        value={currentEntry.temperature || ''}
                        onChange={(e) => setCurrentEntry(prev => ({...prev, temperature: parseFloat(e.target.value) || undefined}))}
                        placeholder="18"
                      />
                    </div>
                    
                    <div>
                      <Label>Скорость ветра (м/с)</Label>
                      <Input
                        type="number"
                        value={currentEntry.windSpeed || ''}
                        onChange={(e) => setCurrentEntry(prev => ({...prev, windSpeed: parseFloat(e.target.value) || undefined}))}
                        placeholder="5"
                      />
                    </div>
                    
                    <div>
                      <Label>Направление ветра</Label>
                      <Select
                        value={currentEntry.windDirection || ''}
                        onValueChange={(value) => setCurrentEntry(prev => ({...prev, windDirection: value}))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите направление" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NORTH">Север</SelectItem>
                          <SelectItem value="NORTHEAST">Северо-восток</SelectItem>
                          <SelectItem value="EAST">Восток</SelectItem>
                          <SelectItem value="SOUTHEAST">Юго-восток</SelectItem>
                          <SelectItem value="SOUTH">Юг</SelectItem>
                          <SelectItem value="SOUTHWEST">Юго-запад</SelectItem>
                          <SelectItem value="WEST">Запад</SelectItem>
                          <SelectItem value="NORTHWEST">Северо-запад</SelectItem>
                          <SelectItem value="CALM">Штиль</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Действия */}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Отменить
                </Button>
                <Button onClick={saveEntry} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Сохранить запись
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Обзор
          </TabsTrigger>
          <TabsTrigger value="entries" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Записи
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Статистика
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Статистика в карточках */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Всего записей</p>
                    <p className="text-2xl font-bold">{statistics?.totalEntries || 0}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Поймано рыбы</p>
                    <p className="text-2xl font-bold">{statistics?.totalFish || 0}</p>
                  </div>
                  <Fish className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Общий вес (кг)</p>
                    <p className="text-2xl font-bold">{statistics?.totalWeight?.toFixed(1) || '0.0'}</p>
                  </div>
                  <Target className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Любимый вид</p>
                    <p className="text-lg font-bold">{statistics?.favoriteSpecies || 'Нет данных'}</p>
                  </div>
                  <Star className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Последние записи */}
          <Card>
            <CardHeader>
              <CardTitle>Последние записи</CardTitle>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Пока нет записей в дневнике. Создайте первую запись!
                </p>
              ) : (
                <div className="space-y-4">
                  {entries.slice(0, 5).map((entry, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{entry.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(entry.date).toLocaleDateString('ru-RU')}
                          </p>
                          {entry.locationName && (
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {entry.locationName}
                            </p>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            🐟 {entry.totalCount || 0} рыб
                          </p>
                          {entry.totalWeight && (
                            <p className="text-sm text-gray-500">
                              ⚖️ {entry.totalWeight.toFixed(1)} кг
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {entry.tags.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {entry.tags.slice(0, 3).map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="entries">
          <Card>
            <CardHeader>
              <CardTitle>Все записи дневника</CardTitle>
              <CardDescription>
                {entries.length} записей в вашем дневнике рыболова
              </CardDescription>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <div className="text-center py-12">
                  <Fish className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">У вас пока нет записей в дневнике</p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    Создать первую запись
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {entries.map((entry, index) => (
                    <div key={index} className="border rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold">{entry.title}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(entry.date).toLocaleDateString('ru-RU')}
                            </span>
                            
                            {entry.locationName && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {entry.locationName}
                              </span>
                            )}
                            
                            {entry.temperature && (
                              <span className="flex items-center gap-1">
                                <Thermometer className="h-4 w-4" />
                                {entry.temperature}°C
                              </span>
                            )}
                            
                            {entry.windSpeed && (
                              <span className="flex items-center gap-1">
                                <Wind className="h-4 w-4" />
                                {entry.windSpeed} м/с
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">
                            🐟 {entry.totalCount} рыб
                          </div>
                          {entry.totalWeight && (
                            <div className="text-gray-600">
                              ⚖️ {entry.totalWeight.toFixed(1)} кг
                            </div>
                          )}
                          {entry.rating && (
                            <div className="flex justify-end mt-1">
                              {Array.from({length: entry.rating}, (_, i) => (
                                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {entry.description && (
                        <p className="text-gray-700 mb-4">{entry.description}</p>
                      )}
                      
                      {/* Улов */}
                      {entry.fishCaught.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium mb-2">Улов:</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {entry.fishCaught.map((fish, fishIndex) => (
                              <div key={fishIndex} className="text-sm bg-gray-50 rounded p-2">
                                <span className="font-medium">{fish.species}</span>
                                {fish.weight && <span> • {fish.weight}кг</span>}
                                {fish.length && <span> • {fish.length}см</span>}
                                {fish.quantity > 1 && <span> • {fish.quantity}шт</span>}
                                {fish.wasReleased && <span className="text-green-600"> • отпущена</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Теги */}
                      {entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {entry.tags.map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {/* Медиа превью */}
                      {entry.media.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Фото и видео ({entry.media.length}):</h4>
                          <div className="grid grid-cols-6 gap-2">
                            {entry.media.slice(0, 6).map((file, mediaIndex) => (
                              <div key={mediaIndex} className="aspect-square bg-gray-100 rounded overflow-hidden">
                                {file.type?.startsWith('image/') ? (
                                  <img 
                                    src={file.preview || '/placeholder.svg'} 
                                    alt={`Фото ${mediaIndex + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                                    Видео
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="statistics" className="space-y-6">
          {!statistics ? (
            <Card>
              <CardContent className="p-12">
                <div className="text-center">
                  <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Недостаточно данных для статистики</p>
                  <p className="text-sm text-gray-400 mt-2">Добавьте несколько записей в дневник</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* График по месяцам */}
              <Card>
                <CardHeader>
                  <CardTitle>Активность по месяцам</CardTitle>
                  <CardDescription>Количество пойманной рыбы по месяцам</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <Bar 
                      data={monthlyChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              stepSize: 1
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Распределение по видам */}
              <Card>
                <CardHeader>
                  <CardTitle>Распределение по видам рыбы</CardTitle>
                  <CardDescription>Какую рыбу вы ловите чаще всего</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <Doughnut 
                      data={speciesChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom'
                          }
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Детальная статистика */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Лучшие места</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>🏆 {statistics.bestSpot || 'Нет данных'}</span>
                        <Badge>Топ</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Любимые виды</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {statistics.speciesDistribution.slice(0, 3).map((species, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span>🐟 {species.species}</span>
                          <Badge variant="secondary">{species.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FishingDiary;
