/**
 * CollapsibleComment — ported from ui/src/common/CollapsibleComment.jsx
 *
 * Renders multi-line comment text. Collapses to one line when long,
 * and expands on click.
 */
import { useState, useMemo } from 'react'

interface Props {
  comment?: string
  className?: string
}

export function CollapsibleComment({ comment, className }: Props) {
  const [expanded, setExpanded] = useState(false)

  const lines = useMemo(() => comment?.split('\n').filter(Boolean) ?? [], [comment])

  if (lines.length === 0) return null

  const isLong = lines.length > 2

  return (
    <div
      className={`text-sm text-white/70 leading-relaxed ${isLong ? 'cursor-pointer' : ''} ${className ?? ''}`}
      onClick={() => isLong && setExpanded((e) => !e)}
      title={isLong && !expanded ? 'Click to expand' : undefined}
    >
      {expanded || !isLong
        ? lines.map((line, i) => (
            <span key={i}>
              {line}
              {i < lines.length - 1 && <br />}
            </span>
          ))
        : <>
            <span className="line-clamp-2">{lines.join(' ')}</span>
            <span className="text-xs text-[#a7a7a7] ml-1">…more</span>
          </>
      }
      {isLong && expanded && (
        <span className="text-xs text-[#a7a7a7] ml-1 cursor-pointer" onClick={() => setExpanded(false)}>
          {' '}show less
        </span>
      )}
    </div>
  )
}
