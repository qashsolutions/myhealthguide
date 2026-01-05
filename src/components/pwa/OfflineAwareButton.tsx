'use client';

import { forwardRef, ComponentPropsWithoutRef } from 'react';
import { Button } from '@/components/ui/button';
import { useOnlineStatusContext } from '@/contexts/OnlineStatusContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface OfflineAwareButtonProps extends ComponentPropsWithoutRef<typeof Button> {
  requiresOnline?: boolean;
  offlineMessage?: string;
}

/**
 * A button that is automatically disabled when offline
 * Shows a tooltip explaining why it's disabled
 */
export const OfflineAwareButton = forwardRef<HTMLButtonElement, OfflineAwareButtonProps>(
  (
    {
      requiresOnline = true,
      offlineMessage = "This action requires an internet connection",
      disabled,
      onClick,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const { isOnline } = useOnlineStatusContext();
    const isOfflineDisabled = requiresOnline && !isOnline;
    const isDisabled = disabled || isOfflineDisabled;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isOfflineDisabled) {
        e.preventDefault();
        return;
      }
      onClick?.(e);
    };

    const button = (
      <Button
        ref={ref}
        disabled={isDisabled}
        onClick={handleClick}
        className={cn(
          isOfflineDisabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );

    // Wrap with tooltip when offline
    if (isOfflineDisabled) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">{button}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{offlineMessage}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return button;
  }
);

OfflineAwareButton.displayName = 'OfflineAwareButton';
