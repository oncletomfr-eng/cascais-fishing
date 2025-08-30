import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Mail, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'page' | 'component' | 'critical';
  name?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

// Тип ошибки для отчетности
type ErrorReport = {
  id: string;
  error: Error;
  errorInfo: ErrorInfo;
  timestamp: Date;
  userAgent: string;
  url: string;
  userId?: string;
  level: 'page' | 'component' | 'critical';
  boundaryName?: string;
};

// Утилита для генерации ID ошибки
const generateErrorId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Утилита для отправки отчета об ошибке
const reportError = async (errorReport: ErrorReport): Promise<void> => {
  try {
    // В production здесь должна быть интеграция с системой мониторинга
    // Например: Sentry, LogRocket, Bugsnag, или собственная система
    
    console.group(`🚨 Error Boundary Report [${errorReport.level.toUpperCase()}]`);
    console.error('Error ID:', errorReport.id);
    console.error('Boundary:', errorReport.boundaryName || 'Unknown');
    console.error('Timestamp:', errorReport.timestamp.toISOString());
    console.error('URL:', errorReport.url);
    console.error('User Agent:', errorReport.userAgent);
    console.error('Error:', errorReport.error);
    console.error('Component Stack:', errorReport.errorInfo.componentStack);
    console.groupEnd();

    // Development mode - логируем в консоль
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    // Production mode - отправляем в систему мониторинга
    await fetch('/api/error-reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorReport),
    });

  } catch (reportingError) {
    console.error('Failed to report error:', reportingError);
    
    // Fallback: отправляем в window.reportError если доступно
    if (typeof window !== 'undefined' && 'reportError' in window) {
      window.reportError(errorReport.error);
    }
  }
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Обновляем состояние для показа fallback UI
    return {
      hasError: true,
      error,
      errorId: generateErrorId(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Сохраняем информацию об ошибке в состоянии
    this.setState({
      errorInfo,
    });

    // Создаем отчет об ошибке
    const errorReport: ErrorReport = {
      id: this.state.errorId || generateErrorId(),
      error,
      errorInfo,
      timestamp: new Date(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
      level: this.props.level || 'component',
      boundaryName: this.props.name,
    };

    // Отправляем отчет
    reportError(errorReport);

    // Вызываем пользовательский обработчик ошибок
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  // Метод для сброса состояния ошибки
  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  // Метод для перезагрузки страницы
  reloadPage = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  // Метод для перехода на главную
  goHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  // Метод для отправки отчета пользователем
  sendReport = async () => {
    if (this.state.error && this.state.errorInfo && this.state.errorId) {
      const userFeedback = prompt('Опишите что вы делали когда произошла ошибка (необязательно):');
      
      const enhancedReport: ErrorReport & { userFeedback?: string } = {
        id: this.state.errorId,
        error: this.state.error,
        errorInfo: this.state.errorInfo,
        timestamp: new Date(),
        userAgent: window.navigator.userAgent,
        url: window.location.href,
        level: this.props.level || 'component',
        boundaryName: this.props.name,
        userFeedback: userFeedback || undefined,
      };

      await reportError(enhancedReport);
      alert('Спасибо за отчет! Мы рассмотрим эту проблему.');
    }
  };

  // Рендер fallback UI в зависимости от уровня ошибки
  renderFallbackUI() {
    const { level = 'component', name } = this.props;
    const { error, errorId } = this.state;
    
    const getLevelColor = () => {
      switch (level) {
        case 'critical': return 'destructive';
        case 'page': return 'warning';
        case 'component': return 'secondary';
        default: return 'secondary';
      }
    };

    const getLevelDescription = () => {
      switch (level) {
        case 'critical': return 'Критическая ошибка системы';
        case 'page': return 'Ошибка загрузки страницы';
        case 'component': return 'Ошибка компонента';
        default: return 'Произошла ошибка';
      }
    };

    const getErrorActions = () => {
      switch (level) {
        case 'critical':
          return (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={this.reloadPage} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Перезагрузить страницу
              </Button>
              <Button variant="outline" onClick={this.sendReport} className="flex-1">
                <Bug className="w-4 h-4 mr-2" />
                Сообщить об ошибке
              </Button>
            </div>
          );
          
        case 'page':
          return (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={this.resetError} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Попробовать снова
              </Button>
              <Button variant="outline" onClick={this.goHome} className="flex-1">
                <Home className="w-4 h-4 mr-2" />
                На главную
              </Button>
            </div>
          );
          
        case 'component':
        default:
          return (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={this.resetError} size="sm" className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Попробовать снова
              </Button>
              <Button variant="outline" size="sm" onClick={this.sendReport} className="flex-1">
                <Mail className="w-4 h-4 mr-2" />
                Сообщить
              </Button>
            </div>
          );
      }
    };

    // Компактный UI для component-level ошибок
    if (level === 'component') {
      return (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-medium text-orange-800">
                    {name ? `Ошибка в ${name}` : 'Ошибка компонента'}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {errorId?.slice(-6)}
                  </Badge>
                </div>
                <p className="text-sm text-orange-700 mb-3">
                  Этот компонент временно недоступен
                </p>
                {getErrorActions()}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Полный UI для page/critical ошибок
    return (
      <div className="min-h-[400px] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-lg text-gray-900">
              {getLevelDescription()}
            </CardTitle>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant={getLevelColor()}>
                {level.toUpperCase()}
              </Badge>
              {errorId && (
                <Badge variant="outline" className="text-xs">
                  ID: {errorId.slice(-8)}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              {name && `Ошибка в компоненте: ${name}. `}
              Мы уже получили уведомление об этой проблеме и работаем над ее устранением.
            </p>
            
            {error && process.env.NODE_ENV === 'development' && (
              <details className="text-left bg-gray-50 p-3 rounded border">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">
                  Детали ошибки (только для разработки)
                </summary>
                <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-32">
                  {error.message}
                </pre>
              </details>
            )}
            
            {getErrorActions()}
          </CardContent>
        </Card>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      // Если передан кастомный fallback, используем его
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Иначе рендерим встроенный UI
      return this.renderFallbackUI();
    }

    return this.props.children;
  }
}

// HOC для оборачивания компонентов в Error Boundary
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  options?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary {...options}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Экспорт по умолчанию
export default ErrorBoundary;
