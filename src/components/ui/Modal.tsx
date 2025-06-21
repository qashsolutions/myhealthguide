import React, { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { ARIA_LABELS } from '@/lib/constants';

/**
 * Accessible modal component for authentication gate
 * Follows WCAG 2.1 AA standards with focus management
 */
interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  description?: string;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  size?: 'small' | 'medium' | 'large' | 'full';
  children: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  size = 'medium',
  children,
}: ModalProps): JSX.Element | null {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Size classes
  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape || !onClose) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store current active element
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Focus the modal
      const focusTimeout = setTimeout(() => {
        modalRef.current?.focus();
      }, 100);

      return () => {
        clearTimeout(focusTimeout);
      };
    } else {
      // Return focus to previous element
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        previousActiveElement.current.focus();
      }
    }
  }, [isOpen]);

  // Trap focus within modal
  useEffect(() => {
    if (!isOpen) return;

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = modalRef.current?.querySelectorAll(
        'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );

      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && onClose && event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
        aria-hidden="true"
      />

      {/* Modal container */}
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        onClick={handleOverlayClick}
      >
        <div className="flex min-h-full items-center justify-center p-4">
          {/* Modal */}
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            aria-describedby={description ? 'modal-description' : undefined}
            tabIndex={-1}
            className={clsx(
              'relative w-full bg-white rounded-elder-lg shadow-elder-lg',
              'transform transition-all animate-slide-down',
              'focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500',
              sizeClasses[size]
            )}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between p-6 border-b border-elder-border">
                {title && (
                  <h2 
                    id="modal-title" 
                    className="text-elder-xl font-bold text-elder-text pr-4"
                  >
                    {title}
                  </h2>
                )}
                
                {showCloseButton && onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="touch-target flex items-center justify-center rounded-elder text-elder-text-secondary hover:text-elder-text hover:bg-gray-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                    aria-label={ARIA_LABELS.CLOSE_MODAL}
                  >
                    <X className="h-6 w-6" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}

            {/* Description */}
            {description && (
              <p 
                id="modal-description" 
                className="px-6 pt-4 text-elder-base text-elder-text-secondary"
              >
                {description}
              </p>
            )}

            {/* Content */}
            <div className="p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}