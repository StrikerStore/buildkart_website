import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Five stars, `rating` of them filled.
 *
 * One label for the row rather than five unlabelled icons: a screen reader
 * should hear "Rated 4 out of 5" once, not "star, star, star, star, star".
 */
export function Stars({
  rating,
  label,
  size = 'sm',
}: {
  rating: number;
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <span role="img" aria-label={label} className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          aria-hidden
          strokeWidth={1.5}
          className={cn(
            size === 'md' ? 'size-5' : 'size-4',
            value <= rating ? 'fill-brand text-brand' : 'fill-transparent text-hairline',
          )}
        />
      ))}
    </span>
  );
}
