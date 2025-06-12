"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  Gift, 
  X, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'promo';
  start_date: string;
  end_date: string;
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (announcements.length > 1 && isVisible) {
      startRotation();
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [announcements.length, isVisible, isPaused]);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_active_announcements');

      if (error) {
        console.error('Error fetching announcements:', error);
        return;
      }

      if (data && data.length > 0) {
        setAnnouncements(data);
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    }
  };

  const startRotation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (!isPaused) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prevIndex => 
          prevIndex === announcements.length - 1 ? 0 : prevIndex + 1
        );
      }, 8000); // Rotate every 8 seconds
    }
  };

  const handlePrevious = () => {
    setCurrentIndex(prevIndex => 
      prevIndex === 0 ? announcements.length - 1 : prevIndex - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex(prevIndex => 
      prevIndex === announcements.length - 1 ? 0 : prevIndex + 1
    );
  };

  const handleClose = () => {
    setIsVisible(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  if (!isVisible || announcements.length === 0) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];
  
  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case 'info': return <Info className="w-5 h-5 text-blue-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'promo': return <Gift className="w-5 h-5 text-purple-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getAnnouncementStyles = (type: string) => {
    switch (type) {
      case 'info': return 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 text-blue-800';
      case 'warning': return 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200 text-amber-800';
      case 'success': return 'bg-gradient-to-r from-green-50 to-green-100 border-green-200 text-green-800';
      case 'promo': return 'bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 text-purple-800';
      default: return 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 text-blue-800';
    }
  };

  return (
    <div 
      className={`relative border-b ${getAnnouncementStyles(currentAnnouncement.type)} transition-all duration-300 ease-in-out`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              {getAnnouncementIcon(currentAnnouncement.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {currentAnnouncement.title}
              </p>
              <p className="text-sm truncate">
                {currentAnnouncement.message}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            {announcements.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevious}
                  className="p-1 h-auto text-current hover:bg-white/20"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs">
                  {currentIndex + 1}/{announcements.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNext}
                  className="p-1 h-auto text-current hover:bg-white/20"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="p-1 h-auto text-current hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Progress bar */}
        {announcements.length > 1 && !isPaused && (
          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white/20">
            <div 
              className="h-full bg-white/40 transition-all duration-300 ease-linear"
              style={{
                width: `${((currentIndex + 1) / announcements.length) * 100}%`,
                animation: 'progress 8s linear infinite'
              }}
            />
          </div>
        )}
      </div>
      
      <style jsx>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}