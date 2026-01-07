'use client';

import { useState, useEffect } from 'react';
import { Quote } from 'lucide-react';

interface Story {
  id?: string;
  text: string;
  author: string;
  type: 'family' | 'agency';
  source?: 'curated' | 'agentic';
}

// Curated stories - always available as fallback
const CURATED_STORIES: Story[] = [
  // Family stories
  {
    text: "Dad skipped his heart medication twice. Now I know before dinner, not after the ER visit.",
    author: "Sarah, caring for her father",
    type: 'family',
    source: 'curated',
  },
  {
    text: "Three siblings, one app. We all see Mom's care updates without endless group texts.",
    author: "Michael, family caregiver",
    type: 'family',
    source: 'curated',
  },
  {
    text: "I used to forget if Mom took her morning pills. Now the app reminds us both.",
    author: "Jennifer, daughter and caregiver",
    type: 'family',
    source: 'curated',
  },
  {
    text: "My brother lives across the country. He finally feels involved in Dad's daily care.",
    author: "Lisa, primary caregiver",
    type: 'family',
    source: 'curated',
  },
  // Agency stories
  {
    text: "Eight loved ones, three caregivers, one dashboard. Shift handoffs finally make sense.",
    author: "Maria, agency owner",
    type: 'agency',
    source: 'curated',
  },
  {
    text: "New caregiver started Monday. She saw the full care history in five minutes.",
    author: "James, care coordinator",
    type: 'agency',
    source: 'curated',
  },
  {
    text: "We cut missed medications by 80% in the first month. Families noticed immediately.",
    author: "Amanda, home care agency",
    type: 'agency',
    source: 'curated',
  },
  {
    text: "No more sticky notes. Every caregiver sees the same care plan, updated in real time.",
    author: "Robert, agency manager",
    type: 'agency',
    source: 'curated',
  },
];

export function CaregiverStories() {
  const [stories, setStories] = useState<Story[]>(CURATED_STORIES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Fetch agentic stories from published tips
  useEffect(() => {
    const fetchAgenticStories = async () => {
      try {
        const response = await fetch('/api/stories');
        const data = await response.json();

        if (data.success && data.stories && data.stories.length > 0) {
          // Combine agentic stories with curated ones
          // Agentic stories come first, then curated as fallback
          const combinedStories = [...data.stories, ...CURATED_STORIES];
          setStories(combinedStories);
        }
      } catch (error) {
        // Silently fail - curated stories will be used
        console.log('Using curated stories (agentic fetch failed)');
      }
    };

    fetchAgenticStories();
  }, []);

  // Rotate stories every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % stories.length);
        setIsTransitioning(false);
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, [stories.length]);

  const currentStory = stories[currentIndex];

  return (
    <section className="py-12 bg-white dark:bg-gray-800">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
            From Caregivers Like You
          </h2>
        </div>

        {/* Single rotating story */}
        <div className="relative">
          <div
            className={`
              bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20
              rounded-2xl p-8 md:p-10 transition-opacity duration-300
              ${isTransitioning ? 'opacity-0' : 'opacity-100'}
            `}
          >
            <Quote className="w-8 h-8 text-blue-400 dark:text-blue-500 mb-4 mx-auto" />

            <blockquote className="text-center">
              <p className="text-xl md:text-2xl font-medium text-gray-900 dark:text-white leading-relaxed">
                &ldquo;{currentStory.text}&rdquo;
              </p>
              <footer className="mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  — {currentStory.author}
                </p>
                <span className={`
                  inline-block mt-2 text-xs px-3 py-1 rounded-full
                  ${currentStory.type === 'family'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                  }
                `}>
                  {currentStory.type === 'family' ? 'Family Caregiver' : 'Care Agency'}
                </span>
              </footer>
            </blockquote>
          </div>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {stories.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setIsTransitioning(true);
                  setTimeout(() => {
                    setCurrentIndex(index);
                    setIsTransitioning(false);
                  }, 300);
                }}
                className={`
                  w-2 h-2 rounded-full transition-all duration-300
                  ${index === currentIndex
                    ? 'bg-blue-600 w-6'
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                  }
                `}
                aria-label={`View story ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
