"use client";

import { useState, useEffect } from 'react';
import { ArrowUpDown, Clock, Cpu, Database, X, ChevronDown, ChevronUp } from 'lucide-react';

export default function PerformanceMonitor() {
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    domContentLoaded: 0,
    firstPaint: 0,
    firstContentfulPaint: 0,
    resources: 0,
    resourcesSize: 0,
    jsHeapSize: 0
  });

  // Couleur d'évaluation en fonction de la valeur et des seuils
  const getStatusColor = (value, type) => {
    const thresholds = {
      loadTime: { good: 1000, medium: 2500 },
      domContentLoaded: { good: 800, medium: 1500 },
      firstPaint: { good: 1000, medium: 2000 },
      firstContentfulPaint: { good: 1200, medium: 2500 },
      resources: { good: 20, medium: 50 },
      resourcesSize: { good: 500000, medium: 1500000 }, // 500KB, 1.5MB
      jsHeapSize: { good: 15000000, medium: 30000000 }, // 15MB, 30MB
    };

    const threshold = thresholds[type];
    if (!threshold) return 'text-gray-600';

    if (value <= threshold.good) return 'text-green-600';
    if (value <= threshold.medium) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Formater les tailles en KB ou MB
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  useEffect(() => {
    const measurePerformance = () => {
      const perf = window.performance;
      
      if (!perf) {
        console.error("L'API Performance n'est pas disponible dans ce navigateur");
        return;
      }

      // Calculer le temps de chargement total
      const loadTime = perf.timing.loadEventEnd - perf.timing.navigationStart;
      
      // Calculer le temps de chargement du DOM
      const domContentLoaded = perf.timing.domContentLoadedEventEnd - perf.timing.navigationStart;
      
      // Mesurer les ressources chargées
      const resources = perf.getEntriesByType('resource');
      const resourcesCount = resources.length;
      const resourcesSize = resources.reduce((total, resource) => {
        return total + (resource.transferSize || 0);
      }, 0);

      // Récupérer les métriques de peinture
      const paintMetrics = perf.getEntriesByType('paint');
      let firstPaint = 0;
      let firstContentfulPaint = 0;

      paintMetrics.forEach(metric => {
        if (metric.name === 'first-paint') {
          firstPaint = metric.startTime;
        }
        if (metric.name === 'first-contentful-paint') {
          firstContentfulPaint = metric.startTime;
        }
      });

      // Taille du tas JavaScript (si disponible)
      let jsHeapSize = 0;
      if (window.performance && performance.memory) {
        jsHeapSize = performance.memory.usedJSHeapSize;
      }

      setMetrics({
        loadTime,
        domContentLoaded,
        firstPaint,
        firstContentfulPaint,
        resources: resourcesCount,
        resourcesSize,
        jsHeapSize
      });
    };

    // Attendre que tout soit chargé
    if (document.readyState === 'complete') {
      setTimeout(measurePerformance, 100); // Petit délai pour s'assurer que toutes les métriques sont disponibles
    } else {
      window.addEventListener('load', () => {
        setTimeout(measurePerformance, 100);
      });
    }
  }, []);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-black text-white p-2 rounded-full shadow-lg hover:bg-gray-800 transition-colors"
        title="Moniteur de performance"
      >
        <Cpu size={20} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 max-w-md transition-all">
      <div className="p-3 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Cpu size={16} className="text-gray-700" />
          <h3 className="text-sm font-semibold">Moniteur de performance</h3>
        </div>
        <div className="flex items-center space-x-1">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <Clock size={14} className="text-gray-500" />
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Temps de chargement</span>
                </div>
                <p className={`font-medium ${getStatusColor(metrics.loadTime, 'loadTime')}`}>
                  {(metrics.loadTime / 1000).toFixed(2)} s
                </p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <Clock size={14} className="text-gray-500" />
                  <span className="text-xs text-gray-500 uppercase tracking-wider">DOM chargé</span>
                </div>
                <p className={`font-medium ${getStatusColor(metrics.domContentLoaded, 'domContentLoaded')}`}>
                  {(metrics.domContentLoaded / 1000).toFixed(2)} s
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <ArrowUpDown size={14} className="text-gray-500" />
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Ressources</span>
                </div>
                <p className={`font-medium ${getStatusColor(metrics.resources, 'resources')}`}>
                  {metrics.resources} fichiers
                </p>
                <p className={`text-xs ${getStatusColor(metrics.resourcesSize, 'resourcesSize')}`}>
                  {formatSize(metrics.resourcesSize)}
                </p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <Database size={14} className="text-gray-500" />
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Mémoire JS</span>
                </div>
                <p className={`font-medium ${getStatusColor(metrics.jsHeapSize, 'jsHeapSize')}`}>
                  {formatSize(metrics.jsHeapSize || 0)}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Métriques de peinture</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">First Paint:</span>
                  <span className={`ml-1 font-medium ${getStatusColor(metrics.firstPaint, 'firstPaint')}`}>
                    {(metrics.firstPaint / 1000).toFixed(2)} s
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">First Contentful Paint:</span>
                  <span className={`ml-1 font-medium ${getStatusColor(metrics.firstContentfulPaint, 'firstContentfulPaint')}`}>
                    {(metrics.firstContentfulPaint / 1000).toFixed(2)} s
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-2 text-center">
              {metrics.loadTime > 0 ? (
                <>
                  <span>Score de performance global: </span>
                  <span className={`font-medium ${
                    metrics.loadTime < 1500 ? 'text-green-600' : 
                    metrics.loadTime < 3000 ? 'text-yellow-600' : 
                    'text-red-600'
                  }`}>
                    {metrics.loadTime < 1500 ? 'Excellent' : 
                     metrics.loadTime < 3000 ? 'Bon' : 
                     'À améliorer'}
                  </span>
                </>
              ) : (
                'Chargement des métriques...'
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}