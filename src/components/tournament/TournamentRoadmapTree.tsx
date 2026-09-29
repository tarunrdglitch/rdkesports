import React, { useState } from 'react'
import {
  Trophy,
  Crown,
  Sparkles,
  Radio,
  Edit3,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Settings2,
  X,
  AlertCircle,
  Layers,
} from 'lucide-react'

export interface BracketMatch {
  id: string
  stageId: string
  matchNumber: number
  team1: { name: string; score?: string; isWinner?: boolean; seed?: string; logo?: string }
  team2: { name: string; score?: string; isWinner?: boolean; seed?: string; logo?: string }
  scheduleTime?: string
  status: 'upcoming' | 'live' | 'completed'
}

export interface RoadmapStage {
  id: string
  name: string
  shortCode: string
  dateRange: string
  matches: BracketMatch[]
}

export interface TournamentRoadmap {
  title: string
  trophyName: string
  trophyIcon?: string
  stages: RoadmapStage[]
}

interface TournamentRoadmapTreeProps {
  roadmap: TournamentRoadmap
  isEditable?: boolean
  selectedMatchId?: string | null
  onSelectMatch?: (match: BracketMatch) => void
  onUpdateRoadmap?: (updatedRoadmap: TournamentRoadmap) => void
  onDeleteMatch?: (matchId: string) => void
}

const STAGE_PRESETS = [
  { key: 'QUAL', name: 'Qualifiers', shortCode: 'QUAL', dateRange: 'Day 1 - Prelims', matches: 4 },
  { key: 'KOPO', name: 'Knockout Play-offs', shortCode: 'KOPO', dateRange: 'Day 1 - Qualifying', matches: 4 },
  { key: 'R16', name: 'Round of 16', shortCode: 'R16', dateRange: 'Day 2 - Elimination', matches: 4 },
  { key: 'QF', name: 'Quarter-Finals', shortCode: 'QF', dateRange: 'Day 3 - Super 8', matches: 2 },
  { key: 'SF', name: 'Semi-Finals', shortCode: 'SF', dateRange: 'Day 4 - Final 4', matches: 2 },
  { key: 'FINAL', name: 'Grand Finals', shortCode: 'FINAL', dateRange: 'Grand Championship', matches: 1 },
  { key: 'custom', name: 'Custom Stage', shortCode: 'RND', dateRange: 'Phase TBD', matches: 2 },
]

export const TournamentRoadmapTree: React.FC<TournamentRoadmapTreeProps> = ({
  roadmap,
  isEditable = false,
  selectedMatchId = null,
  onSelectMatch,
  onUpdateRoadmap,
  onDeleteMatch,
}) => {
  // Modal State for Adding New Stage Column
  const [showAddStageModal, setShowAddStageModal] = useState(false)
  const [newStagePreset, setNewStagePreset] = useState<string>('SF')
  const [newStageName, setNewStageName] = useState('Semi-Finals')
  const [newStageCode, setNewStageCode] = useState('SF')
  const [newStageDate, setNewStageDate] = useState('Day 4 - Final 4')
  const [newStageMatchesCount, setNewStageMatchesCount] = useState<number>(2)

  // Modal State for Editing Existing Stage Column
  const [editingStage, setEditingStage] = useState<RoadmapStage | null>(null)
  const [editStageName, setEditStageName] = useState('')
  const [editStageCode, setEditStageCode] = useState('')
  const [editStageDate, setEditStageDate] = useState('')

  // Inline Roadmap Title / Trophy Editing
  const [isEditingHeader, setIsEditingHeader] = useState(false)
  const [headerTitle, setHeaderTitle] = useState(roadmap.title || 'ROAD TO CHAMPIONSHIP')
  const [headerTrophy, setHeaderTrophy] = useState(roadmap.trophyName || 'Grand Champions Trophy')

  // Pick Preset Handler
  const handleSelectPreset = (presetKey: string) => {
    setNewStagePreset(presetKey)
    const preset = STAGE_PRESETS.find((p) => p.key === presetKey)
    if (preset) {
      setNewStageName(preset.name)
      setNewStageCode(preset.shortCode)
      setNewStageDate(preset.dateRange)
      setNewStageMatchesCount(preset.matches)
    }
  }

  // Add Stage Column Handler
  const handleCreateStage = () => {
    if (!onUpdateRoadmap) return
    const stageId = `stage-${Date.now()}`

    // Calculate sequential match numbers
    const allMatches = roadmap.stages.flatMap((s) => s.matches)
    let nextNum = allMatches.reduce((max, m) => Math.max(max, m.matchNumber || 0), 0) + 1

    const newMatches: BracketMatch[] = []
    const count = Math.max(1, Math.min(16, Number(newStageMatchesCount) || 1))

    for (let i = 0; i < count; i++) {
      newMatches.push({
        id: `m-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        stageId,
        matchNumber: nextNum++,
        team1: { name: 'TBD', score: '', isWinner: false },
        team2: { name: 'TBD', score: '', isWinner: false },
        scheduleTime: 'Upcoming',
        status: 'upcoming',
      })
    }

    const newStage: RoadmapStage = {
      id: stageId,
      name: newStageName.trim() || 'New Round',
      shortCode: newStageCode.trim().toUpperCase() || 'STAGE',
      dateRange: newStageDate.trim() || 'TBD',
      matches: newMatches,
    }

    const updatedRoadmap = {
      ...roadmap,
      stages: [...roadmap.stages, newStage],
    }

    onUpdateRoadmap(updatedRoadmap)
    setShowAddStageModal(false)

    // Select first created match for quick editing
    if (newMatches.length > 0) {
      onSelectMatch?.(newMatches[0])
    }
  }

  // Delete Stage Column Handler
  const handleDeleteStage = (stageId: string, stageName: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!onUpdateRoadmap) return
    const confirmDelete = window.confirm(
      `Are you sure you want to remove the entire "${stageName}" round column and all its match boxes?`
    )
    if (!confirmDelete) return

    const updatedRoadmap = {
      ...roadmap,
      stages: roadmap.stages.filter((s) => s.id !== stageId),
    }
    onUpdateRoadmap(updatedRoadmap)

    // If currently selected match was in this stage, deselect it
    const removedStage = roadmap.stages.find((s) => s.id === stageId)
    if (removedStage && selectedMatchId) {
      const matchInStage = removedStage.matches.some((m) => m.id === selectedMatchId)
      if (matchInStage && onDeleteMatch) {
        onDeleteMatch(selectedMatchId)
      }
    }

    if (editingStage?.id === stageId) {
      setEditingStage(null)
    }
  }

  // Move Stage Left / Right
  const handleMoveStage = (stageIdx: number, direction: 'left' | 'right', e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!onUpdateRoadmap) return
    const targetIdx = direction === 'left' ? stageIdx - 1 : stageIdx + 1
    if (targetIdx < 0 || targetIdx >= roadmap.stages.length) return

    const newStages = [...roadmap.stages]
    const temp = newStages[stageIdx]
    newStages[stageIdx] = newStages[targetIdx]
    newStages[targetIdx] = temp

    onUpdateRoadmap({
      ...roadmap,
      stages: newStages,
    })
  }

  // Open Stage Edit Modal
  const handleOpenEditStage = (stage: RoadmapStage, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setEditingStage(stage)
    setEditStageName(stage.name)
    setEditStageCode(stage.shortCode)
    setEditStageDate(stage.dateRange)
  }

  // Save Stage Edit
  const handleSaveEditStage = () => {
    if (!editingStage || !onUpdateRoadmap) return
    const updatedStages = roadmap.stages.map((s) => {
      if (s.id === editingStage.id) {
        return {
          ...s,
          name: editStageName.trim() || s.name,
          shortCode: editStageCode.trim().toUpperCase() || s.shortCode,
          dateRange: editStageDate.trim() || s.dateRange,
        }
      }
      return s
    })

    onUpdateRoadmap({
      ...roadmap,
      stages: updatedStages,
    })
    setEditingStage(null)
  }

  // Add Match Box to Stage
  const handleAddMatch = (stageId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!onUpdateRoadmap) return

    const allMatches = roadmap.stages.flatMap((s) => s.matches)
    const maxNum = allMatches.reduce((max, m) => Math.max(max, m.matchNumber || 0), 0)

    const newMatch: BracketMatch = {
      id: `m-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      stageId,
      matchNumber: maxNum + 1,
      team1: { name: 'TBD', score: '', isWinner: false },
      team2: { name: 'TBD', score: '', isWinner: false },
      scheduleTime: 'Upcoming',
      status: 'upcoming',
    }

    const updatedStages = roadmap.stages.map((s) => {
      if (s.id === stageId) {
        return {
          ...s,
          matches: [...s.matches, newMatch],
        }
      }
      return s
    })

    onUpdateRoadmap({
      ...roadmap,
      stages: updatedStages,
    })

    // Immediately select the newly created match box
    onSelectMatch?.(newMatch)
  }

  // Delete Match Box from Stage
  const handleDeleteMatch = (stageId: string, matchId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onUpdateRoadmap) return

    const updatedStages = roadmap.stages.map((s) => {
      if (s.id === stageId) {
        return {
          ...s,
          matches: s.matches.filter((m) => m.id !== matchId),
        }
      }
      return s
    })

    onUpdateRoadmap({
      ...roadmap,
      stages: updatedStages,
    })

    if (selectedMatchId === matchId && onDeleteMatch) {
      onDeleteMatch(matchId)
    }
  }

  // Save Roadmap Header (Title & Trophy)
  const handleSaveHeader = () => {
    if (!onUpdateRoadmap) return
    onUpdateRoadmap({
      ...roadmap,
      title: headerTitle.trim() || roadmap.title,
      trophyName: headerTrophy.trim() || roadmap.trophyName,
    })
    setIsEditingHeader(false)
  }

  return (
    <div className="relative w-full overflow-x-auto rounded-2xl border border-blue-900/40 bg-gradient-to-br from-[#070b19] via-[#091129] to-[#040714] p-6 text-foreground shadow-2xl">
      {/* Background Decorative Esports Grid & Glows */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.18),rgba(255,255,255,0))]" />
      <div className="pointer-events-none absolute -right-20 top-1/4 size-96 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-1/4 size-96 rounded-full bg-indigo-600/10 blur-3xl" />

      {/* Header Banner */}
      <div className="relative mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-blue-900/50 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-400">
            <Sparkles className="size-4 animate-pulse text-amber-400" />
            <span>OFFICIAL CHAMPIONSHIP TOURNAMENT ROADMAP</span>
          </div>

          {isEditingHeader ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={headerTitle}
                onChange={(e) => setHeaderTitle(e.target.value)}
                placeholder="Tournament Roadmap Title"
                className="bg-blue-950/80 border border-blue-500 rounded px-3 py-1 text-lg font-black uppercase text-white focus:outline-none"
              />
              <button
                onClick={handleSaveHeader}
                className="rounded bg-primary text-background px-3 py-1 text-xs font-bold hover:opacity-90 transition"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditingHeader(false)}
                className="rounded bg-muted px-2 py-1 text-xs font-bold text-muted-foreground hover:text-white transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="group flex items-center gap-2 mt-1">
              <h2 className="font-heading text-2xl sm:text-3xl font-black uppercase tracking-tight text-white drop-shadow">
                {roadmap.title || 'ROAD TO CHAMPIONSHIP'}
              </h2>
              {isEditable && (
                <button
                  onClick={() => setIsEditingHeader(true)}
                  className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-white transition p-1"
                  title="Rename Roadmap Title"
                >
                  <Edit3 className="size-4" />
                </button>
              )}
            </div>
          )}

          <p className="text-xs text-blue-200/70 mt-0.5">
            Interactive playoff progression tree & visual knockout bracket. Click any match to inspect.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-right">
            <div className="text-[10px] uppercase font-bold text-blue-300">Target Trophy</div>
            <div className="text-sm font-black text-white flex items-center gap-1.5 justify-end">
              <Trophy className="size-4 text-amber-400" />
              {roadmap.trophyName || 'Grand Champions Cup'}
            </div>
          </div>

          {isEditable && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddStageModal(true)}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3.5 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition hover:scale-105 active:scale-95"
              >
                <Plus className="size-3.5" />
                Add Round Column
              </button>

              <div className="rounded-lg bg-primary/20 border border-primary/40 px-3 py-1.5 text-[11px] font-bold text-primary flex items-center gap-1">
                <Edit3 className="size-3" />
                Live Editing Mode
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bracket Tree Container */}
      <div className="relative flex items-stretch gap-6 sm:gap-8 min-w-[950px] py-4">
        {roadmap.stages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-blue-900/60 bg-blue-950/20">
            <Layers className="size-10 text-blue-400/60 mb-3" />
            <h3 className="text-base font-bold text-white">No Bracket Rounds Configured</h3>
            <p className="text-xs text-blue-300/70 max-w-sm mt-1 mb-4">
              Add your first stage column (such as Quarter-Finals, Semi-Finals, or Knockout Play-offs) to start building your roadmap.
            </p>
            {isEditable && (
              <button
                onClick={() => setShowAddStageModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-background shadow hover:opacity-90 transition"
              >
                <Plus className="size-4" />
                Add First Round Column
              </button>
            )}
          </div>
        )}

        {roadmap.stages.map((stage, sIdx) => {
          return (
            <div
              key={stage.id || sIdx}
              className="flex-1 flex flex-col min-w-[230px] max-w-[320px] rounded-2xl bg-blue-950/20 border border-blue-900/30 p-3"
            >
              {/* Stage Column Header with Reorder & Delete controls */}
              <div className="mb-4 pb-3 border-b border-blue-900/40 text-center">
                {isEditable && (
                  <div className="flex items-center justify-between gap-1 mb-2 px-1">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleMoveStage(sIdx, 'left', e)}
                        disabled={sIdx === 0}
                        className="rounded p-1 text-blue-300 hover:bg-blue-800/40 hover:text-white disabled:opacity-20 transition"
                        title="Move column left"
                      >
                        <ChevronLeft className="size-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleMoveStage(sIdx, 'right', e)}
                        disabled={sIdx === roadmap.stages.length - 1}
                        className="rounded p-1 text-blue-300 hover:bg-blue-800/40 hover:text-white disabled:opacity-20 transition"
                        title="Move column right"
                      >
                        <ChevronRight className="size-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleOpenEditStage(stage, e)}
                        className="rounded p-1 text-blue-300 hover:bg-blue-800/40 hover:text-white transition"
                        title="Edit round name, code, or schedule"
                      >
                        <Settings2 className="size-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteStage(stage.id, stage.name, e)}
                        className="rounded p-1 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition"
                        title="Delete this entire round column"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                <span className="inline-block rounded-full bg-blue-500/20 border border-blue-500/40 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-blue-300 shadow">
                  {stage.shortCode || `STAGE ${sIdx + 1}`}
                </span>
                <h4 className="mt-1 text-xs font-bold text-white tracking-wide">{stage.name}</h4>
                <p className="text-[10px] text-blue-300/60 font-mono">{stage.dateRange}</p>
              </div>

              {/* Stage Matches Column */}
              <div className="flex-1 flex flex-col justify-around gap-4 my-auto min-h-[140px]">
                {stage.matches.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-blue-900/60 bg-blue-950/20 p-4 text-center my-auto">
                    <p className="text-[11px] text-blue-300/60 font-medium">No match boxes</p>
                    {isEditable && (
                      <button
                        onClick={(e) => handleAddMatch(stage.id, e)}
                        className="mt-2 text-xs text-blue-400 hover:text-white font-bold flex items-center justify-center gap-1 mx-auto"
                      >
                        <Plus className="size-3" /> Add match box
                      </button>
                    )}
                  </div>
                ) : (
                  stage.matches.map((match, mIdx) => {
                    const isSelected = selectedMatchId === match.id
                    const isLive = match.status === 'live'
                    const isCompleted = match.status === 'completed'

                    return (
                      <div
                        key={match.id || mIdx}
                        onClick={() => onSelectMatch?.(match)}
                        className={`group relative rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden ${
                          isSelected
                            ? 'border-primary bg-primary/20 shadow-lg shadow-primary/20 ring-2 ring-primary/60 scale-[1.02]'
                            : 'border-blue-900/60 bg-[#0d1533]/80 hover:border-blue-500/60 hover:bg-[#121c42] hover:shadow-md'
                        }`}
                      >
                        {/* Match Status Strip */}
                        <div className="flex items-center justify-between border-b border-blue-950/80 bg-blue-950/40 px-2.5 py-1 text-[10px]">
                          <span className="font-mono text-blue-300/70 font-semibold">
                            M{match.matchNumber || mIdx + 1} • {stage.shortCode}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {isLive ? (
                              <span className="flex items-center gap-1 font-bold text-red-400 uppercase">
                                <Radio className="size-2.5 animate-pulse" /> LIVE
                              </span>
                            ) : isCompleted ? (
                              <span className="font-semibold text-emerald-400">Final</span>
                            ) : (
                              <span className="text-muted-foreground font-mono">
                                {match.scheduleTime || 'Upcoming'}
                              </span>
                            )}

                            {isEditable && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteMatch(stage.id, match.id, e)}
                                className="ml-1 p-0.5 rounded text-red-400/60 hover:text-red-300 hover:bg-red-500/20 transition"
                                title="Delete match box"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Team 1 Row */}
                        <div
                          className={`flex items-center justify-between px-3 py-2 border-b border-blue-950/60 transition ${
                            match.team1.isWinner
                              ? 'bg-blue-600/20 text-white font-extrabold'
                              : 'text-blue-100/90'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-1">
                            {match.team1.seed && (
                              <span className="size-4 shrink-0 rounded bg-blue-950 border border-blue-800/80 text-[9px] font-mono font-bold text-blue-300 flex items-center justify-center">
                                {match.team1.seed}
                              </span>
                            )}
                            <span className="truncate text-xs font-semibold tracking-tight">
                              {match.team1.name || 'TBD'}
                            </span>
                            {match.team1.isWinner && (
                              <Crown className="size-3 text-amber-400 shrink-0" />
                            )}
                          </div>
                          <span
                            className={`font-mono text-xs px-1.5 py-0.5 rounded font-black ${
                              match.team1.isWinner
                                ? 'bg-blue-500 text-white'
                                : 'text-blue-300/80'
                            }`}
                          >
                            {match.team1.score !== undefined && match.team1.score !== ''
                              ? match.team1.score
                              : '-'}
                          </span>
                        </div>

                        {/* Team 2 Row */}
                        <div
                          className={`flex items-center justify-between px-3 py-2 transition ${
                            match.team2.isWinner
                              ? 'bg-blue-600/20 text-white font-extrabold'
                              : 'text-blue-100/90'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-1">
                            {match.team2.seed && (
                              <span className="size-4 shrink-0 rounded bg-blue-950 border border-blue-800/80 text-[9px] font-mono font-bold text-blue-300 flex items-center justify-center">
                                {match.team2.seed}
                              </span>
                            )}
                            <span className="truncate text-xs font-semibold tracking-tight">
                              {match.team2.name || 'TBD'}
                            </span>
                            {match.team2.isWinner && (
                              <Crown className="size-3 text-amber-400 shrink-0" />
                            )}
                          </div>
                          <span
                            className={`font-mono text-xs px-1.5 py-0.5 rounded font-black ${
                              match.team2.isWinner
                                ? 'bg-blue-500 text-white'
                                : 'text-blue-300/80'
                            }`}
                          >
                            {match.team2.score !== undefined && match.team2.score !== ''
                              ? match.team2.score
                              : '-'}
                          </span>
                        </div>

                        {/* Edit Hover Indicator */}
                        {isEditable && (
                          <div className="absolute right-2 bottom-1 opacity-0 group-hover:opacity-100 transition pointer-events-none">
                            <span className="rounded bg-primary/90 text-background px-1.5 py-0.5 text-[9px] font-bold flex items-center gap-0.5 shadow">
                              <Edit3 className="size-2.5" /> Edit Box
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Add Match Box Button at Bottom of Column */}
              {isEditable && (
                <div className="mt-3 pt-2 border-t border-blue-900/30">
                  <button
                    type="button"
                    onClick={(e) => handleAddMatch(stage.id, e)}
                    className="w-full py-1.5 px-3 rounded-lg border border-dashed border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-400 text-blue-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <Plus className="size-3.5" /> Add Match Box
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Add Stage Column Card (when in edit mode) */}
        {isEditable && (
          <div
            onClick={() => setShowAddStageModal(true)}
            className="flex flex-col justify-center items-center min-w-[200px] max-w-[240px] p-6 rounded-2xl border-2 border-dashed border-blue-600/40 bg-blue-600/5 hover:bg-blue-600/15 hover:border-blue-400 transition cursor-pointer text-center group my-auto min-h-[220px]"
          >
            <div className="size-11 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition shadow-lg shadow-blue-500/20">
              <Plus className="size-5" />
            </div>
            <h4 className="mt-3 text-xs font-black uppercase text-blue-200 group-hover:text-white tracking-wide transition">
              + Add Round Column
            </h4>
            <p className="text-[10px] text-blue-300/60 mt-1 max-w-[140px]">
              Add Knockouts, Semi-Finals, or custom bracket stage
            </p>
          </div>
        )}

        {/* Grand Finale / Championship Trophy Column */}
        <div className="flex-1 flex flex-col justify-center items-center min-w-[200px] border-l border-blue-900/40 pl-6 my-auto text-center space-y-4">
          <div className="relative group">
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 opacity-20 blur-xl group-hover:opacity-40 transition" />
            <div className="relative size-24 rounded-2xl border-2 border-amber-400/50 bg-gradient-to-b from-amber-400/20 via-blue-950/60 to-background flex items-center justify-center shadow-2xl">
              <Trophy className="size-12 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)] animate-bounce" />
            </div>
          </div>

          <div>
            <span className="rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider">
              GRAND CHAMPIONS
            </span>
            <h3 className="mt-2 text-base font-extrabold text-white">
              {roadmap.trophyName || 'Champions Trophy'}
            </h3>
            <p className="text-[11px] text-blue-200/70 max-w-[180px] mx-auto mt-0.5">
              The supreme prize awaits the winning squad in the Grand LAN Finale!
            </p>
          </div>
        </div>
      </div>



      {/* ═══ MODAL: ADD STAGE COLUMN ═══ */}
      {showAddStageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-blue-500/40 bg-[#0a1026] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-blue-900/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Plus className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-white">
                    Add Bracket Round Column
                  </h3>
                  <p className="text-xs text-blue-300/70">
                    Select a preset or customize a stage to fit your tournament
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddStageModal(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-white transition"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Presets Grid */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-300 mb-2">
                Quick Stage Presets:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {STAGE_PRESETS.map((p) => {
                  const isSelected = newStagePreset === p.key
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handleSelectPreset(p.key)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/20 shadow-md ring-1 ring-blue-500'
                          : 'border-blue-900/60 bg-blue-950/40 hover:bg-blue-900/30 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-blue-400">
                          {p.shortCode}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {p.matches} {p.matches === 1 ? 'match' : 'matches'}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white mt-1">{p.name}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-blue-200 mb-1">
                  Round Name:
                </label>
                <input
                  type="text"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder="e.g. Semi-Finals, Knockouts"
                  className="w-full bg-[#0d1636] border border-blue-900 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-blue-200 mb-1">
                  Short Code (Badge):
                </label>
                <input
                  type="text"
                  value={newStageCode}
                  onChange={(e) => setNewStageCode(e.target.value)}
                  placeholder="e.g. SF, QF, KOPO"
                  className="w-full bg-[#0d1636] border border-blue-900 rounded-lg px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-blue-200 mb-1">
                  Schedule / Subtitle:
                </label>
                <input
                  type="text"
                  value={newStageDate}
                  onChange={(e) => setNewStageDate(e.target.value)}
                  placeholder="e.g. Day 4 - Final 4"
                  className="w-full bg-[#0d1636] border border-blue-900 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-blue-200 mb-1">
                  Initial Match Boxes:
                </label>
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={newStageMatchesCount}
                  onChange={(e) => setNewStageMatchesCount(Number(e.target.value) || 1)}
                  className="w-full bg-[#0d1636] border border-blue-900 rounded-lg px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-blue-900/60 pt-4">
              <button
                type="button"
                onClick={() => setShowAddStageModal(false)}
                className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateStage}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/30 flex items-center gap-1.5"
              >
                <Plus className="size-3.5" />
                Add Stage Column
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: EDIT STAGE COLUMN DETAILS ═══ */}
      {editingStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-blue-500/40 bg-[#0a1026] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-blue-900/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Settings2 className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-white">
                    Edit Round Column
                  </h3>
                  <p className="text-xs text-blue-300/70">Update stage name, badge code or schedule</p>
                </div>
              </div>
              <button
                onClick={() => setEditingStage(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-white transition"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-blue-200 mb-1">
                  Round Name:
                </label>
                <input
                  type="text"
                  value={editStageName}
                  onChange={(e) => setEditStageName(e.target.value)}
                  placeholder="e.g. Semi-Finals"
                  className="w-full bg-[#0d1636] border border-blue-900 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-blue-200 mb-1">
                  Short Code (Badge):
                </label>
                <input
                  type="text"
                  value={editStageCode}
                  onChange={(e) => setEditStageCode(e.target.value)}
                  placeholder="e.g. SF, QF"
                  className="w-full bg-[#0d1636] border border-blue-900 rounded-lg px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-blue-200 mb-1">
                  Schedule / Subtitle:
                </label>
                <input
                  type="text"
                  value={editStageDate}
                  onChange={(e) => setEditStageDate(e.target.value)}
                  placeholder="e.g. Day 4 - Final 4"
                  className="w-full bg-[#0d1636] border border-blue-900 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-blue-900/60 pt-4">
              <button
                type="button"
                onClick={(e) => handleDeleteStage(editingStage.id, editingStage.name, e)}
                className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 hover:underline"
              >
                <Trash2 className="size-3.5" /> Delete Round Column
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStage(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditStage}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
