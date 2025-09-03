'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fish, Menu, X, LogIn, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import WeatherNotificationBell from '@/components/weather/WeatherNotificationBell';
import { useSession, signIn, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';

const NAVIGATION_ITEMS = [
  { href: '/', label: 'Главная' },
  { href: '/smart-recommendations', label: '🧠 Умные рекомендации' },
  { href: '/fishing-diary', label: '🎣 Дневник рыболова' },
  { href: '/admin', label: 'Админ' },
  { href: '/test-weather', label: 'Тест погоды' },
  { href: '/test-mobile-optimization', label: 'Тест мобильной версии' },
  { href: '/test-confetti', label: 'Тест конфетти' },
  { href: '/test-achievement-system', label: '🏆 Система достижений' },
  { href: '/test-progress-tracking', label: '📈 Прогресс и уровни' },
  { href: '/test-profile-statistics', label: '📊 Статистика профиля' },
  { href: '/test-real-time-chat', label: '💬 Real-time чат' },
  { href: '/test-captain-dashboard', label: '🚢 Captain Dashboard' },
  { href: '/test-stripe-elements', label: '💳 Stripe Elements' },
  { href: '/test-production-integration', label: 'Тест интеграции' },
];

interface GlobalHeaderProps {
  className?: string;
  showWeatherNotifications?: boolean;
}

export default function GlobalHeader({ 
  className,
  showWeatherNotifications = true 
}: GlobalHeaderProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const { data: session, status } = useSession();

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      className
    )}>
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Fish className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Cascais Fishing</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {NAVIGATION_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === item.href
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2">
            {/* Weather Notifications */}
            {showWeatherNotifications && (
              <WeatherNotificationBell className="hidden sm:flex" />
            )}

            {/* User Authentication */}
            {status === "loading" ? (
              <div className="animate-pulse h-8 w-8 bg-muted rounded-full" />
            ) : session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session.user?.image || ''} alt={session.user?.name || ''} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {session.user?.name || 'Пользователь'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session.user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Выйти</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="hidden md:flex"
              >
                <Link href="/auth/signin">
                  <LogIn className="mr-2 h-4 w-4" />
                  Войти
                </Link>
              </Button>
            )}

            {/* Mobile Menu Trigger */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden h-10 w-10 p-0"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Открыть меню</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col space-y-4">
                  {/* Mobile Header */}
                  <div className="flex items-center justify-between pb-4 border-b">
                    <div className="flex items-center space-x-2">
                      <Fish className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Cascais Fishing</span>
                    </div>
                    {showWeatherNotifications && <WeatherNotificationBell />}
                  </div>

                  {/* Mobile Navigation */}
                  <nav className="flex flex-col space-y-2">
                    {NAVIGATION_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                          pathname === item.href
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-primary hover:bg-muted"
                        )}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </nav>

                  {/* Mobile User Authentication */}
                  <div className="pt-4 border-t">
                    {status === "loading" ? (
                      <div className="animate-pulse h-10 bg-muted rounded" />
                    ) : session ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3 px-3 py-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={session.user?.image || ''} alt={session.user?.name || ''} />
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {session.user?.name || 'Пользователь'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {session.user?.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            signOut();
                            setIsMobileMenuOpen(false);
                          }}
                          className="w-full"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Выйти
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="w-full"
                      >
                        <Link 
                          href="/auth/signin"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <LogIn className="mr-2 h-4 w-4" />
                          Войти
                        </Link>
                      </Button>
                    )}
                  </div>

                  {/* Weather Info Section (Mobile) */}
                  {showWeatherNotifications && (
                    <div className="pt-4 border-t">
                      <div className="text-sm font-medium mb-2">Погодные условия</div>
                      <div className="text-xs text-muted-foreground">
                        Касаиш Марина • Атлантический океан
                      </div>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
