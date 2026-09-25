import { forwardRef, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import { NavLink } from './navConfig'

interface PageSearchProps {
  links: NavLink[]
  className?: string
  autoFocus?: boolean
  // Keep results open without focus, e.g. inside a dialog.
  alwaysOpen?: boolean
  onDone?: () => void
}

// Jump-to-page search over the role's navigation links.
const PageSearch = forwardRef<HTMLInputElement, PageSearchProps>(function PageSearch(
  { links, className = 'sf-search', autoFocus, alwaysOpen, onDone },
  ref,
) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return links
    return links.filter((link) => link.label.toLowerCase().includes(q) || link.path.toLowerCase().includes(q))
  }, [links, query])

  const goTo = (path: string) => {
    setQuery('')
    ;(document.activeElement as HTMLElement | null)?.blur()
    onDone?.()
    navigate(path)
  }

  return (
    <div className={className}>
      <SearchRoundedIcon sx={{ fontSize: 18 }} />
      <input
        ref={ref}
        value={query}
        autoFocus={autoFocus}
        placeholder='Search or jump to page'
        aria-label='Search pages'
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results[0]) goTo(results[0].path)
          if (e.key === 'Escape') {
            ;(e.target as HTMLInputElement).blur()
            onDone?.()
          }
        }}
      />
      <kbd>Ctrl K</kbd>
      {(focused || alwaysOpen) && (
        <ul className='sf-search-results' role='listbox'>
          {results.length === 0 && <li className='sf-search-empty'>No matching page</li>}
          {results.map((link) => (
            <li key={link.path + link.label}>
              <button type='button' onMouseDown={(e) => e.preventDefault()} onClick={() => goTo(link.path)}>
                <span>{link.label}</span>
                <small>{link.path}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
})

export default PageSearch
