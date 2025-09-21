'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, X, Filter, Calendar, User, Hash, ChevronDown, ChevronUp, Clock, ArrowRight } from 'lucide-react'
import { Button } from './Button'

interface SearchResult {
  id: string
  content: string
  created_at: string
  user_id: string
  room_id: string
  username: string
  room_name: string
  room_code: string
  rank: number
}

interface MessageSearchProps {
  currentUser: any
  currentRoom?: any
  onJumpToMessage?: (messageId: string, roomId: string) => void
}

export function MessageSearch({ currentUser, currentRoom, onJumpToMessage }: MessageSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [totalResults, setTotalResults] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  
  // Filter states
  const [searchInCurrentRoom, setSearchInCurrentRoom] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Search history
  const [searchHistory, setSearchHistory] = useState<Array<{search_query: string, search_count: number, last_searched: string}>>([])
  const [showHistory, setShowHistory] = useState(false)
  
  // Room users for filtering
  const [roomUsers, setRoomUsers] = useState<Array<{id: string, username: string}>>([])
  
  const supabase = createClient()
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const resultsPerPage = 20

  // Debounced search function
  const debouncedSearch = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      if (query.length >= 2) { // Search after 2 characters
        performSearch(query, 1)
      } else {
        setResults([])
        setTotalResults(0)
        setCurrentPage(1)
      }
    }, 300) // 300ms delay for debouncing
  }, [searchInCurrentRoom, selectedUserId, startDate, endDate])

  // Effect to trigger search when query changes
  useEffect(() => {
    debouncedSearch(searchQuery)
    
    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, debouncedSearch])

  // Effect to re-search when filters change
  useEffect(() => {
    if (searchQuery.length >= 2) {
      debouncedSearch(searchQuery)
    }
  }, [searchInCurrentRoom, selectedUserId, startDate, endDate, debouncedSearch])

  const performSearch = async (query: string, page: number) => {
    if (!currentUser) return
    
    setIsSearching(true)
    
    try {
      const offset = (page - 1) * resultsPerPage
      
      // Search messages
      const { data: searchResults, error: searchError } = await supabase.rpc('search_messages', {
        search_query: query,
        user_id_param: currentUser.id,
        room_id_param: searchInCurrentRoom && currentRoom ? currentRoom.id : null,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate + 'T23:59:59').toISOString() : null,
        search_user_id: selectedUserId || null,
        limit_param: resultsPerPage,
        offset_param: offset
      })

      if (searchError) throw searchError

      // Count total results
      const { data: countResult, error: countError } = await supabase.rpc('count_search_messages', {
        search_query: query,
        user_id_param: currentUser.id,
        room_id_param: searchInCurrentRoom && currentRoom ? currentRoom.id : null,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate + 'T23:59:59').toISOString() : null,
        search_user_id: selectedUserId || null
      })

      if (countError) throw countError

      setResults(searchResults || [])
      setTotalResults(countResult || 0)
      setCurrentPage(page)
      
      // Save search to history (only for meaningful searches)
      if (query.length >= 3 && page === 1) {
        await supabase.rpc('save_search_history', {
          user_id_param: currentUser.id,
          search_query_param: query
        })
        loadSearchHistory()
      }
    } catch (error) {
      console.error('Error performing search:', error)
      setResults([])
      setTotalResults(0)
    } finally {
      setIsSearching(false)
    }
  }

  const loadSearchHistory = async () => {
    if (!currentUser) return
    
    try {
      const { data, error } = await supabase.rpc('get_search_suggestions', {
        user_id_param: currentUser.id,
        limit_param: 5
      })
      
      if (!error && data) {
        setSearchHistory(data)
      }
    } catch (error) {
      console.error('Error loading search history:', error)
    }
  }

  const loadRoomUsers = async () => {
    if (!currentRoom) return
    
    try {
      const { data, error } = await supabase
        .from('room_memberships')
        .select(`
          user_id,
          profiles!inner(id, username)
        `)
        .eq('room_id', currentRoom.id)
      
      if (!error && data) {
        const users = data.map((membership: any) => ({
          id: membership.profiles.id,
          username: membership.profiles.username
        }))
        setRoomUsers(users)
      }
    } catch (error) {
      console.error('Error loading room users:', error)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadSearchHistory()
      loadRoomUsers()
    }
  }, [isOpen, currentRoom])

  const highlightSearchTerms = (text: string, query: string) => {
    if (!query || query.length < 2) return text
    
    const terms = query.toLowerCase().split(' ').filter(term => term.length > 1)
    let highlightedText = text
    
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi')
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-600">$1</mark>')
    })
    
    return highlightedText
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const clearFilters = () => {
    setSelectedUserId('')
    setStartDate('')
    setEndDate('')
    setSearchInCurrentRoom(true)
  }

  const deleteSearchHistoryItem = async (searchQuery: string) => {
    if (!currentUser) return
    
    try {
      const { error } = await supabase.rpc('delete_search_history_item', {
        user_id_param: currentUser.id,
        search_query_param: searchQuery
      })
      
      if (!error) {
        // Remove from local state
        setSearchHistory(prev => prev.filter(item => item.search_query !== searchQuery))
      }
    } catch (error) {
      console.error('Error deleting search history item:', error)
    }
  }

  const clearAllSearchHistory = async () => {
    if (!currentUser) return
    
    try {
      const { error } = await supabase.rpc('clear_all_search_history', {
        user_id_param: currentUser.id
      })
      
      if (!error) {
        // Clear local state
        setSearchHistory([])
      }
    } catch (error) {
      console.error('Error clearing search history:', error)
    }
  }

  const totalPages = Math.ceil(totalResults / resultsPerPage)

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="btn-secondary flex items-center gap-2 rounded-lg"
      >
        <Search size={14} />
        Search
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-primary">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
              <Search size={20} />
              Search Messages
            </h2>
            <Button
              onClick={() => setIsOpen(false)}
              variant="outline"
              size="sm"
              className="btn-secondary rounded-lg"
            >
              <X size={16} />
            </Button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder={`Search messages${currentRoom ? ` in ${currentRoom.name}` : ''}... (type 2+ chars)`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              className="w-full pl-10 pr-20 py-3 text-sm rounded-lg border border-primary/20 bg-card text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute right-2 flex items-center gap-1">
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setResults([])
                    setTotalResults(0)
                  }}
                  className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg text-red-500 hover:text-red-600 transition-all duration-200 hover:scale-110"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Search indicator */}
          {isSearching && (
            <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          )}

          {/* Search History */}
          {searchHistory.length > 0 && searchQuery.length < 2 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Clock size={14} className="text-blue-500" />
                  Recent Searches
                </h4>
                <button
                  onClick={clearAllSearchHistory}
                  className="group flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 dark:hover:text-red-300 rounded-lg transition-all duration-200 hover:scale-105"
                  title="Clear all search history"
                >
                  Delete All
                </button>
              </div>
              {searchHistory.map((item, index) => (
                <div
                  key={index}
                  className="group flex items-center p-3 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 dark:hover:from-blue-900/10 dark:hover:to-purple-900/10 rounded-lg text-sm border border-transparent hover:border-primary/10 transition-all duration-200"
                >
                  <button
                    onClick={() => setSearchQuery(item.search_query)}
                    className="flex-1 text-left flex items-center justify-between"
                  >
                    <span className="text-secondary font-medium">{item.search_query}</span>
                    <span className="text-xs text-muted bg-primary/10 px-2 py-0.5 rounded-full">
                      {item.search_count} times
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteSearchHistoryItem(item.search_query)
                    }}
                    className="ml-3 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-500 hover:text-red-600 transition-all duration-200 hover:scale-110"
                    title="Delete this search"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Empty state when no search history and no search query */}
          {searchHistory.length === 0 && searchQuery.length < 2 && (
            <div className="text-center py-8 text-muted">
              <Search size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Type at least 2 characters to search</p>
              <p className="text-xs mt-1">Your recent searches will appear here</p>
            </div>
          )}

          {/* Filters Toggle */}
          <div className="flex items-center justify-between mt-6 mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="group flex items-center gap-2 px-5 py-3 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg transition-all duration-200 hover:scale-105"
            >
              <Filter size={16} className="group-hover:scale-110 transition-transform" />
              Advanced Filters
              {showFilters ? (
                <ChevronUp size={16} className="group-hover:scale-110 transition-transform" />
              ) : (
                <ChevronDown size={16} className="group-hover:scale-110 transition-transform" />
              )}
            </button>
            
            {totalResults > 0 && (
              <div className="text-sm text-muted bg-primary/5 px-3 py-1.5 rounded-lg">
                <span className="font-medium text-primary">{totalResults}</span> result{totalResults !== 1 ? 's' : ''}
                {searchInCurrentRoom && currentRoom && (
                  <span className="text-xs"> in {currentRoom.name}</span>
                )}
              </div>
            )}
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/60 dark:from-slate-900/80 dark:via-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-slate-200/60 dark:border-slate-700/50 shadow-md backdrop-blur-sm space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                    <Filter size={14} className="text-white" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100">Filters</h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Refine results</p>
                  </div>
                </div>
                <button
                  onClick={clearFilters}
                  className="group flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50/80 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 dark:hover:text-red-300 rounded-lg transition-all duration-200 hover:scale-105"
                >
                  <X size={12} className="group-hover:rotate-90 transition-transform duration-200" />
                  Reset
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Room Filter */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Hash size={12} className="text-blue-500" />
                    Scope
                  </label>
                  <div className="relative">
                    <select
                      value={searchInCurrentRoom ? 'current' : 'all'}
                      onChange={(e) => setSearchInCurrentRoom(e.target.value === 'current')}
                      title="Select search scope"
                      className="w-full appearance-none px-3 py-2 text-sm rounded-lg border border-slate-200/60 dark:border-slate-600/50 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-500"
                    >
                      <option value="all">🌍 All rooms</option>
                      {currentRoom && <option value="current">📍 {currentRoom.name}</option>}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* User Filter */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <User size={12} className="text-indigo-500" />
                    User
                  </label>
                  <div className="relative">
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      title="Filter by user"
                      className="w-full appearance-none px-3 py-2 text-sm rounded-lg border border-slate-200/60 dark:border-slate-600/50 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-500"
                    >
                      <option value="">👥 All users</option>
                      {roomUsers.map(user => (
                        <option key={user.id} value={user.id}>👤 {user.username}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Date Range */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    <Calendar size={12} className="text-emerald-500" />
                    Date Range
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">From</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        title="Start date for search range"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200/60 dark:border-slate-600/50 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">To</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        title="End date for search range"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200/60 dark:border-slate-600/50 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/50">
                <button
                  onClick={() => performSearch(searchQuery, 1)}
                  className="group flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
                >
                  <Search size={12} className="group-hover:scale-110 transition-transform" />
                  Apply
                </button>
                <button
                  onClick={clearFilters}
                  className="group flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-600/50 hover:border-slate-300 dark:hover:border-slate-500 rounded-lg transition-all duration-200 hover:scale-105"
                >
                  <X size={12} className="group-hover:rotate-90 transition-transform duration-200" />
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {isSearching ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2 text-muted">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                Searching...
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-4">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="p-4 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer"
                  onClick={() => onJumpToMessage?.(result.id, result.room_id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-primary">{result.username}</span>
                      <span className="text-muted">in</span>
                      <span className="text-sm bg-primary/20 px-2 py-1 rounded-full text-primary flex items-center gap-1">
                        <Hash size={10} />
                        {result.room_code}
                      </span>
                    </div>
                    <div className="text-xs text-muted">{formatDate(result.created_at)}</div>
                  </div>
                  <div 
                    className="text-sm text-primary"
                    dangerouslySetInnerHTML={{ 
                      __html: highlightSearchTerms(result.content, searchQuery) 
                    }}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted">{result.room_name}</span>
                    <ArrowRight size={14} className="text-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery.trim() || startDate || endDate || selectedUserId ? (
            <div className="text-center py-8 text-muted">
              <Search size={48} className="mx-auto mb-4 opacity-50" />
              <p>No messages found matching your search criteria.</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted">
              <Search size={48} className="mx-auto mb-4 opacity-50" />
              <p>Enter a search term to find messages.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-primary/20">
              <Button
                onClick={() => performSearch(searchQuery, currentPage - 1)}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
                className="btn-secondary"
              >
                Previous
              </Button>
              <span className="text-sm text-muted px-4">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                onClick={() => performSearch(searchQuery, currentPage + 1)}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
                className="btn-secondary"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}