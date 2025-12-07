/**
 * Feature 22: Analytics & Monitoring
 *
 * Event tracking for Google Analytics / Plausible
 */

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plausible?: (...args: any[]) => void;
  }
}

export const analytics = {
  /**
   * Track page view
   */
  pageView: (url: string) => {
    if (typeof window.gtag !== 'undefined') {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_ID || '', {
        page_path: url,
      });
    }
    if (typeof window.plausible !== 'undefined') {
      window.plausible('pageview');
    }
  },

  /**
   * Track custom event
   */
  event: (action: string, category: string, label?: string, value?: number) => {
    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value,
      });
    }
    if (typeof window.plausible !== 'undefined') {
      window.plausible(action, { props: { category, label, value } });
    }
  },

  /**
   * Track quiz completion
   */
  quizCompleted: (quizType: string, score: number) => {
    analytics.event('quiz_completed', 'engagement', quizType, score);
  },

  /**
   * Track streak milestone
   */
  streakMilestone: (streak: number) => {
    analytics.event('streak_milestone', 'achievement', `${streak}_days`, streak);
  },

  /**
   * Track share action
   */
  share: (platform: string) => {
    analytics.event('share', 'social', platform);
  },
};

export default analytics;
