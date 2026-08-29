import { useState, useEffect } from 'react';
import { X, Bookmark, FileText, Search, Trash2, Plus, Save, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NOTES_KEY = 'bible_notes';
const BOOKMARKS_KEY = 'bible_bookmarks';

interface Note {
  verseKey: string;
  text: string;
  timestamp: string;
}

export function NotesPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'notes' | 'bookmarks'>('notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  
  // New note editor state
  const [isWriting, setIsWriting] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newVerseKey, setNewVerseKey] = useState('');
  const [newNoteText, setNewNoteText] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadNotes();
      loadBookmarks();
    }
  }, [isOpen]);

  const loadNotes = () => {
    try {
      const stored = localStorage.getItem(NOTES_KEY);
      setNotes(stored ? JSON.parse(stored) : []);
    } catch {
      setNotes([]);
    }
  };

  const loadBookmarks = () => {
    try {
      const stored = localStorage.getItem(BOOKMARKS_KEY);
      setBookmarks(stored ? JSON.parse(stored) : []);
    } catch {
      setBookmarks([]);
    }
  };

  const saveNote = () => {
    if (!newVerseKey.trim() || !newNoteText.trim()) return;
    
    const note: Note = {
      verseKey: newVerseKey.trim(),
      text: newNoteText.trim(),
      timestamp: new Date().toISOString(),
    };

    let updated: Note[];
    if (editingNote) {
      updated = notes.map(n => n.verseKey === editingNote.verseKey && n.timestamp === editingNote.timestamp ? note : n);
    } else {
      updated = [...notes, note];
    }
    
    setNotes(updated);
    localStorage.setItem(NOTES_KEY, JSON.stringify(updated));
    resetEditor();
  };

  const resetEditor = () => {
    setIsWriting(false);
    setEditingNote(null);
    setNewVerseKey('');
    setNewNoteText('');
  };

  const startEdit = (note: Note) => {
    setEditingNote(note);
    setNewVerseKey(note.verseKey);
    setNewNoteText(note.text);
    setIsWriting(true);
  };

  const deleteNote = (verseKey: string, timestamp?: string) => {
    const updated = notes.filter(n => !(n.verseKey === verseKey && (!timestamp || n.timestamp === timestamp)));
    setNotes(updated);
    localStorage.setItem(NOTES_KEY, JSON.stringify(updated));
  };

  const removeBookmark = (verseKey: string) => {
    const updated = bookmarks.filter(b => b !== verseKey);
    setBookmarks(updated);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  };

  const filteredNotes = notes.filter(n =>
    n.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.verseKey.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatVerseKey = (key: string) => {
    return key.replace(/_/g, ' ').replace(/(\d+)$/, ':$1');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-sacred-black border-l border-gold-dark/40 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gold-dark/40">
          <h2 className="text-gold-bright text-lg font-serif">My Library</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                resetEditor();
                setIsWriting(true);
              }}
              className="p-2 text-gold-muted/60 hover:text-gold-bright transition-colors"
              title="Write a note"
            >
              <Plus size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gold-muted/60 hover:text-gold-bright transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gold-dark/20">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-muted/40" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gold-dark/10 border border-gold-dark/30 rounded-lg text-gold-metallic text-sm placeholder:text-gold-muted/30 focus:outline-none focus:border-gold-bright/50"
            />
          </div>
        </div>

        {/* Note Editor (slides open when writing) */}
        <AnimatePresence>
          {isWriting && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-gold-dark/20"
            >
              <div className="p-4 space-y-3">
                <input
                  type="text"
                  placeholder="Verse (e.g., John 3:16 or John_3_16)"
                  value={newVerseKey}
                  onChange={(e) => setNewVerseKey(e.target.value)}
                  className="w-full px-3 py-2 bg-gold-dark/10 border border-gold-dark/30 rounded-lg text-gold-metallic text-sm placeholder:text-gold-muted/30 focus:outline-none focus:border-gold-bright/50"
                />
                <textarea
                  placeholder="Write your note or reflection..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-gold-dark/10 border border-gold-dark/30 rounded-lg text-gold-metallic text-sm placeholder:text-gold-muted/30 focus:outline-none focus:border-gold-bright/50 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveNote}
                    disabled={!newVerseKey.trim() || !newNoteText.trim()}
                    className="flex items-center gap-1 px-4 py-2 bg-gold-bright/20 border border-gold-bright/40 rounded-lg text-gold-bright text-sm font-medium hover:bg-gold-bright/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Save size={14} />
                    {editingNote ? 'Update' : 'Save'}
                  </button>
                  <button
                    onClick={resetEditor}
                    className="px-4 py-2 border border-gold-dark/30 rounded-lg text-gold-muted text-sm hover:text-gold-bright transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="flex border-b border-gold-dark/20">
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'notes'
                ? 'text-gold-bright border-b-2 border-gold-bright'
                : 'text-gold-muted/50 hover:text-gold-muted'
            }`}
          >
            <FileText size={14} className="inline mr-2" />
            Notes {notes.length > 0 && `(${notes.length})`}
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'bookmarks'
                ? 'text-gold-bright border-b-2 border-gold-bright'
                : 'text-gold-muted/50 hover:text-gold-muted'
            }`}
          >
            <Bookmark size={14} className="inline mr-2" />
            Bookmarks {bookmarks.length > 0 && `(${bookmarks.length})`}
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100vh-280px)] p-4">
          {activeTab === 'notes' && (
            <>
              {filteredNotes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gold-muted/40 text-sm mb-3">
                    {searchQuery ? 'No matching notes.' : 'No notes yet.'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => setIsWriting(true)}
                      className="text-sm text-gold-bright/70 hover:text-gold-bright transition-colors underline"
                    >
                      Write your first note
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotes.map((note) => (
                    <div key={`${note.verseKey}-${note.timestamp}`} className="p-4 bg-gold-dark/10 rounded-lg border border-gold-dark/20 group">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs text-gold-bright font-medium">
                          {formatVerseKey(note.verseKey)}
                        </span>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(note)}
                            className="text-gold-muted/40 hover:text-gold-bright transition-colors"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => deleteNote(note.verseKey, note.timestamp)}
                            className="text-gold-muted/40 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gold-metallic whitespace-pre-wrap">{note.text}</p>
                      <p className="text-[10px] text-gold-muted/40 mt-2">
                        {new Date(note.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'bookmarks' && (
            <>
              {bookmarks.length === 0 ? (
                <p className="text-center text-gold-muted/40 py-12 text-sm">
                  No bookmarks yet. Bookmark verses while reading.
                </p>
              ) : (
                <div className="space-y-2">
                  {bookmarks.map((bookmark) => (
                    <div
                      key={bookmark}
                      className="flex items-center justify-between p-3 bg-gold-dark/10 rounded-lg border border-gold-dark/20"
                    >
                      <a
                        href={`/read/${bookmark.replace(/_/g, '/')}`}
                        className="text-sm text-gold-metallic hover:text-gold-bright transition-colors"
                      >
                        {formatVerseKey(bookmark)}
                      </a>
                      <button
                        onClick={() => removeBookmark(bookmark)}
                        className="text-gold-muted/40 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}