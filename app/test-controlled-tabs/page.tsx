'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

export default function TestControlledTabsPage() {
  const [activeTab, setActiveTab] = useState('tab1');

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Тест контролируемых табов</h1>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600">Текущий таб: <strong>{activeTab}</strong></p>
        <button 
          onClick={() => setActiveTab('tab1')}
          className="mr-2 px-3 py-1 bg-blue-500 text-white rounded"
        >
          Переключить на tab1
        </button>
        <button 
          onClick={() => setActiveTab('tab2')}
          className="mr-2 px-3 py-1 bg-blue-500 text-white rounded"
        >
          Переключить на tab2
        </button>
        <button 
          onClick={() => setActiveTab('tab3')}
          className="px-3 py-1 bg-blue-500 text-white rounded"
        >
          Переключить на tab3
        </button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tab1">Таб 1</TabsTrigger>
          <TabsTrigger value="tab2">Таб 2</TabsTrigger>
          <TabsTrigger value="tab3">Таб 3</TabsTrigger>
        </TabsList>

        <TabsContent value="tab1">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-2">Содержимое Таба 1</h2>
              <p>Это содержимое первого таба. Состояние: {activeTab}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tab2">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-2">Содержимое Таба 2</h2>
              <p>Это содержимое второго таба. Состояние: {activeTab}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tab3">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-2">Содержимое Таба 3</h2>
              <p>Это содержимое третьего таба. Состояние: {activeTab}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
