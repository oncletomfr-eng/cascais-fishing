'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Fish, 
  Camera,
  MapPin,
  Ruler,
  Weight,
  Clock,
  Target,
  Package,
  Maximize2,
  X,
  ExternalLink,
  Award
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { CatchPhotoPayload } from '@/lib/types/multi-phase-chat'

interface CatchPhotoCardProps {
  payload: CatchPhotoPayload
  timestamp: Date
  author?: {
    name: string
    role?: string
  }
  className?: string
  onImageClick?: (imageUrl: string) => void
}

// Полноэкранный просмотр изображения
function ImageModal({ 
  imageUrl, 
  isOpen, 
  onClose 
}: { 
  imageUrl: string
  isOpen: boolean
  onClose: () => void 
}) {
  if (!isOpen) return null
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-white hover:bg-white/20"
          onClick={onClose}
        >
          <X className="w-6 h-6" />
        </Button>
        
        <motion.img
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.8 }}
          src={imageUrl}
          alt="Улов крупным планом"
          className="max-w-full max-h-full object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      </motion.div>
    </AnimatePresence>
  )
}

export function CatchPhotoCard({ 
  payload, 
  timestamp, 
  author,
  className,
  onImageClick
}: CatchPhotoCardProps) {
  const [showFullImage, setShowFullImage] = useState(false)
  const [imageSrc, setImageSrc] = useState(payload.imageUrl)
  
  const handleImageClick = () => {
    if (onImageClick) {
      onImageClick(payload.imageUrl)
    } else {
      setShowFullImage(true)
    }
  }

  // Получить иконку рыбы по видам
  const getFishIcon = (species?: string) => {
    // Всегда возвращаем React компонент Fish
    return <Fish className="w-4 h-4 text-blue-500" />
  }

  const formatDepth = (depth?: number) => {
    if (!depth) return null
    return `${depth}м`
  }

  const formatWeight = (weight?: number) => {
    if (!weight) return null
    if (weight < 1) return `${(weight * 1000).toFixed(0)}г`
    return `${weight.toFixed(1)}кг`
  }

  const formatSize = (size?: number) => {
    if (!size) return null
    return `${size}см`
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={cn("max-w-md mx-auto", className)}
      >
        <Card className="border-2 border-blue-200 bg-blue-50 shadow-lg overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fish className="w-6 h-6 text-blue-600" />
                <h3 className="font-semibold text-lg">Улов!</h3>
                {payload.fishSpecies && (
                  getFishIcon(payload.fishSpecies)
                )}
              </div>
              <Badge variant="secondary" className="bg-blue-600 text-white">
                <Camera className="w-3 h-3 mr-1" />
                Фото улова
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0 space-y-4">
            {/* Фото улова */}
            <div className="relative group cursor-pointer" onClick={handleImageClick}>
              <Image
                src={imageSrc}
                alt={payload.fishSpecies || 'Улов'}
                width={400}
                height={256}
                className="w-full h-64 object-cover rounded-lg shadow-md transition-transform group-hover:scale-105"
                onError={() => setImageSrc('/images/placeholder-fish.png')}
                unoptimized={imageSrc === '/images/placeholder-fish.png'}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center">
                <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            
            {/* Информация о рыбе */}
            {payload.fishSpecies && (
              <div className="bg-white/70 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-yellow-600" />
                  <span className="font-semibold text-gray-700">Вид:</span>
                  <span className="font-bold text-blue-700">{payload.fishSpecies}</span>
                </div>
                
                {/* Параметры рыбы */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {payload.fishWeight && (
                    <div className="flex items-center gap-1">
                      <Weight className="w-3 h-3 text-gray-500" />
                      <span>{formatWeight(payload.fishWeight)}</span>
                    </div>
                  )}
                  
                  {payload.fishSize && (
                    <div className="flex items-center gap-1">
                      <Ruler className="w-3 h-3 text-gray-500" />
                      <span>{formatSize(payload.fishSize)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Детали ловли */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {payload.technique && (
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-500">Техника</p>
                    <p className="font-semibold">{payload.technique}</p>
                  </div>
                </div>
              )}
              
              {payload.bait && (
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-600" />
                  <div>
                    <p className="text-xs text-gray-500">Наживка</p>
                    <p className="font-semibold">{payload.bait}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Дополнительные параметры */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {payload.depth && (
                <div className="flex items-center gap-1 text-gray-600">
                  <span className="text-blue-500">🌊</span>
                  <span>Глубина: {formatDepth(payload.depth)}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1 text-gray-600">
                <Clock className="w-3 h-3" />
                <span>{format(payload.timeOfCatch, 'HH:mm', { locale: ru })}</span>
              </div>
            </div>
            
            {/* Локация */}
            {payload.location && (
              <div className="border-t pt-3">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <p className="text-sm font-medium text-gray-700">Место ловли:</p>
                </div>
                {payload.location.name ? (
                  <p className="text-sm text-gray-600 ml-6">{payload.location.name}</p>
                ) : (
                  <p className="text-sm text-gray-600 ml-6">
                    {payload.location.lat.toFixed(4)}, {payload.location.lng.toFixed(4)}
                  </p>
                )}
              </div>
            )}
            
            {/* Заметки */}
            {payload.notes && (
              <div className="border-t pt-3">
                <p className="text-sm font-medium text-gray-700 mb-1">Заметки:</p>
                <p className="text-sm text-gray-600 italic">{payload.notes}</p>
              </div>
            )}
            
            {/* Мета-информация */}
            <div className="border-t pt-3 flex items-center justify-between text-xs text-gray-500">
              <span>
                {format(timestamp, 'dd.MM.yyyy HH:mm', { locale: ru })}
              </span>
              {author && (
                <span>{author.name}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Модальное окно для полноэкранного просмотра */}
      <ImageModal 
        imageUrl={payload.imageUrl}
        isOpen={showFullImage}
        onClose={() => setShowFullImage(false)}
      />
    </>
  )
}

export default CatchPhotoCard
