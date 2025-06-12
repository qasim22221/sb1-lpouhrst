"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, X, Bell, Megaphone, Zap, Info, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'promo';
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [isAnimating, setIsAnimating] = useState(false);
  const announcementRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadAnnouncements();
    
    // Set up subscription for real-time announcements
    const subscription = supabase
      .channel('public:announcements')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'announcements' 
      }, () => {
        loadAnnouncements();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  // Rotate through multiple announcements
  useEffect(() => {
    if (announcements.length <= 1) return;
    
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % announcements.length);
        setIsAnimating(false);
      }, 500);
    }, 8000);
    
    return () => clearInterval(interval);
  }, [announcements]);

  const loadAnnouncements = async () => {
    if (!user) return;
    
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Filter out dismissed announcements
      const filteredAnnouncements = data?.filter(a => !dismissed.has(a.id)) || [];
      setAnnouncements(filteredAnnouncements);
      
      // Reset current index if needed
      if (currentIndex >= filteredAnnouncements.length) {
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error('Failed to load announcements:', err);
    }
  };

  const dismissAnnouncement = (id: string) => {
    setDismissed(prev => new Set([...prev, id]));
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  // If no announcements or all dismissed, don't render anything
  if (announcements.length === 0) return null;

  const currentAnnouncement = announcements[currentIndex];
  
  // Get appropriate styles based on announcement type
  const getAnnouncementStyles = (type: string) => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-amber-500 to-orange-600',
          icon: <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
        };
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-green-500 to-emerald-600',
          icon: <CheckIcon className="w-5 h-5 mr-2 flex-shrink-0" />
        };
      case 'promo':
        return {
          bg: 'bg-gradient-to-r from-purple-500 to-pink-600',
          icon: <Zap className="w-5 h-5 mr-2 flex-shrink-0" />
        };
      default: // info
        return {
          bg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
          icon: <Info className="w-5 h-5 mr-2 flex-shrink-0" />
        };
    }
  };

  const styles = getAnnouncementStyles(currentAnnouncement.type);

  return (
    <div 
      ref={announcementRef}
      className={`${styles.bg} text-white p-3 rounded-lg shadow-md transition-opacity duration-500 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center overflow-hidden">
          {styles.icon}
          <div className="overflow-hidden">
            <p className="font-medium whitespace-nowrap">{currentAnnouncement.title}</p>
            <div className="relative overflow-hidden">
              <p className="text-sm text-white/90 whitespace-nowrap animate-marquee">
                {currentAnnouncement.message}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          {announcements.length > 1 && (
            <div className="flex space-x-1 mr-2">
              {announcements.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-2 h-2 rounded-full ${i === currentIndex ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </div>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => dismissAnnouncement(currentAnnouncement.id)}
            className="text-white hover:bg-white/20 p-1 h-auto"
          >
            <span className="sr-only">Dismiss</span>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          display: inline-block;
          white-space: nowrap;
          animation: marquee 15s linear infinite;
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}

// CheckIcon component
function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}