import React, { useState, useEffect, useRef } from 'react'
import {
  Trophy,
  Award,
  Flame,
  Download,
  Copy,
  Plus,
  Trash2,
  Edit3,
  Check,
  CheckCircle2,
  X,
  Settings,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  Sliders,
  Eye,
  Tv,
} from 'lucide-react'

export interface MatchResultEntry {
  teamId: string
  teamName: string
  rank: number
  kills: number
  placementPoints: number
  killPoints: number
  totalPoints: number
}

export interface PointsMatch {
  id: string
  matchNumber: number
  map: string
  group?: string
  title: string
  status: 'completed' | 'in_progress'
  createdAt: string
  results: MatchResultEntry[]
}

export interface TeamStanding {
  rank: number
  teamId: string
  teamName: string
  matchesPlayed: number
  booyahs: number
  killPoints: number
  placementPoints: number
  totalPoints: number
  bestPlacement: number
}

export interface PointSystem {
  killPoint: number
  placementPoints: Record<string, number>
}

interface PointsTableManagerProps {
  tournamentId: string
  tournamentName: string
  gameFormat?: string
  isOrganizer?: boolean
}

const FREE_FIRE_DEFAULT_PRESET: PointSystem = {
  killPoint: 1,
  placementPoints: {
    '1': 12,
    '2': 9,
    '3': 8,
    '4': 7,
    '5': 6,
    '6': 5,
    '7': 4,
    '8': 3,
    '9': 2,
    '10': 1,
    '11': 0,
    '12': 0,
  },
}

const BGMI_DEFAULT_PRESET: PointSystem = {
  killPoint: 1,
  placementPoints: {
    '1': 10,
    '2': 6,
    '3': 5,
    '4': 4,
    '5': 3,
    '6': 2,
    '7': 1,
    '8': 1,
    '9': 0,
    '10': 0,
    '11': 0,
    '12': 0,
  },
}

const MAP_OPTIONS = [
  'Bermuda',
  'Purgatory',
  'Kalahari',
  'Alpine',
  'NexTerra',
  'Erangel',
  'Miramar',
  'Sanhok',
  'Vikendi',
]

export function PointsTableManager({
  tournamentId,
  tournamentName,
  gameFormat = 'Free Fire',
  isOrganizer = false,
}: PointsTableManagerProps) {
  const [pointSystem, setPointSystem] = useState<PointSystem>(FREE_FIRE_DEFAULT_PRESET)
  const [matches, setMatches] = useState<PointsMatch[]>([])
  const [standings, setStandings] = useState<TeamStanding[]>([])
  const [availableTeams, setAvailableTeams] = useState<Array<{ id: string; name: string }>>([])
  const [activeView, setActiveView] = useState<'overall' | string>('overall')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Match Entry / Edit Modal State
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false)
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null)
  const [matchFormMap, setMatchFormMap] = useState('Bermuda')
  const [matchFormNumber, setMatchFormNumber] = useState(1)
  const [matchFormTitle, setMatchFormTitle] = useState('')
  const [matchResultsRows, setMatchResultsRows] = useState<
    Array<{ teamName: string; rank: number; kills: number }>
  >([])
  const [isSavingMatch, setIsSavingMatch] = useState(false)

  // Point System Config Modal
  const [isPointSystemModalOpen, setIsPointSystemModalOpen] = useState(false)
  const [tempPointSystem, setTempPointSystem] = useState<PointSystem>(FREE_FIRE_DEFAULT_PRESET)
  const [isSavingSystem, setIsSavingSystem] = useState(false)

  // Graphic Poster & Image Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [exportTheme, setExportTheme] = useState<'cyber_red' | 'royal_gold' | 'stealth_dark'>('cyber_red')
  const [exportFormat, setExportFormat] = useState<'broadcast_16_9' | 'poster_4_5'>('broadcast_16_9')
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [copiedNotification, setCopiedNotification] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const loadPointsTable = async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/points-table`)
      if (!res.ok) throw new Error('Failed to load points table data')
      const data = await res.json()
      if (data.pointSystem) setPointSystem(data.pointSystem)
      if (data.matches) setMatches(data.matches)
      if (data.standings) setStandings(data.standings)
      if (data.availableTeams) setAvailableTeams(data.availableTeams)
    } catch (err: any) {
      setError(err.message || 'Error loading points table')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPointsTable()
  }, [tournamentId])

  // Open Add/Edit Match Modal
  const handleOpenAddMatch = (matchToEdit?: PointsMatch) => {
    if (matchToEdit) {
      setEditingMatchId(matchToEdit.id)
      setMatchFormMap(matchToEdit.map)
      setMatchFormNumber(matchToEdit.matchNumber)
      setMatchFormTitle(matchToEdit.title)
      setMatchResultsRows(
        matchToEdit.results.map((r) => ({
          teamName: r.teamName,
          rank: r.rank,
          kills: r.kills,
        }))
      )
    } else {
      setEditingMatchId(null)
      const nextNum = matches.length + 1
      const defaultMap = MAP_OPTIONS[(nextNum - 1) % MAP_OPTIONS.length] || 'Bermuda'
      setMatchFormMap(defaultMap)
      setMatchFormNumber(nextNum)
      setMatchFormTitle(`Match ${nextNum} - ${defaultMap}`)

      // Prepopulate with top standings or available teams (12 teams)
      const baseTeams =
        standings.length > 0
          ? standings.map((s) => s.teamName)
          : availableTeams.length > 0
          ? availableTeams.map((t) => t.name)
          : Array.from({ length: 12 }, (_, i) => `Team ${i + 1}`)

      const initialRows = Array.from({ length: 12 }, (_, i) => ({
        teamName: baseTeams[i] || `Team ${i + 1}`,
        rank: i + 1,
        kills: 0,
      }))
      setMatchResultsRows(initialRows)
    }
    setIsMatchModalOpen(true)
  }

  // Pre-fill teams in match form
  const handlePrefillTeams = () => {
    const list =
      availableTeams.length > 0
        ? availableTeams.map((t) => t.name)
        : standings.length > 0
        ? standings.map((s) => s.teamName)
        : []

    if (list.length === 0) return

    setMatchResultsRows((prev) =>
      prev.map((r, idx) => ({
        ...r,
        teamName: list[idx] || r.teamName,
      }))
    )
  }

  // Save Match Score Submission
  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingMatch(true)
    setError('')
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/points-table/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: editingMatchId || undefined,
          matchNumber: matchFormNumber,
          map: matchFormMap,
          title: matchFormTitle || `Match ${matchFormNumber} - ${matchFormMap}`,
          results: matchResultsRows,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save match scores')

      setSuccessMsg(`Match ${matchFormNumber} results recorded & points table recalculated!`)
      setTimeout(() => setSuccessMsg(''), 4000)
      setIsMatchModalOpen(false)
      loadPointsTable()
    } catch (err: any) {
      setError(err.message || 'Failed to save match')
    } finally {
      setIsSavingMatch(false)
    }
  }

  // Delete Match
  const handleDeleteMatch = async (matchId: string, matchTitle: string) => {
    if (!confirm(`Delete "${matchTitle}"? Standings will be recalculated automatically.`)) return
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/points-table/match/${matchId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete match')
      setSuccessMsg('Match removed and standings recalculated')
      setTimeout(() => setSuccessMsg(''), 3000)
      if (activeView === matchId) setActiveView('overall')
      loadPointsTable()
    } catch (err: any) {
      setError(err.message || 'Failed to delete match')
    }
  }

  // Clear / Reset All Matches in Points Table
  const handleResetTable = async () => {
    if (!confirm('Are you sure you want to clear all matches from this points table? This will remove all match scores and reset the leaderboard.')) return
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/points-table/reset`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to reset points table')
      setMatches([])
      setStandings([])
      setActiveView('overall')
      setSuccessMsg('Points table cleared successfully. Ready for new matches.')
      setTimeout(() => setSuccessMsg(''), 4000)
      loadPointsTable()
    } catch (err: any) {
      setError(err.message || 'Failed to clear points table')
    }
  }

  // Save Point System
  const handleSavePointSystem = async () => {
    setIsSavingSystem(true)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/points-table`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pointSystem: tempPointSystem,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update scoring rules')

      setPointSystem(data.pointSystem)
      setStandings(data.standings)
      setSuccessMsg('Scoring formula updated! All match point tallies refreshed.')
      setTimeout(() => setSuccessMsg(''), 4000)
      setIsPointSystemModalOpen(false)
    } catch (err: any) {
      setError(err.message || 'Failed to update point system')
    } finally {
      setIsSavingSystem(false)
    }
  }

  // Active match data if inspecting a specific match
  const selectedMatch = matches.find((m) => m.id === activeView)

  // ═══════════════════════════════════════════════════════════════
  // HIGH-RESOLUTION CANVAS GRAPHIC POSTER GENERATOR
  // ═══════════════════════════════════════════════════════════════
  const drawGraphicToCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const is16x9 = exportFormat === 'broadcast_16_9'
    const width = is16x9 ? 1920 : 1080
    const height = is16x9 ? 1080 : 1350

    canvas.width = width
    canvas.height = height

    // Palette per theme
    const themes = {
      cyber_red: {
        bgGradientStart: '#0f0507',
        bgGradientEnd: '#060102',
        accent: '#f51a1a',
        accentGlow: 'rgba(245, 26, 26, 0.4)',
        headerBg: 'rgba(245, 26, 26, 0.12)',
        cardBg: '#140c10',
        tableHeaderBg: '#1f0d14',
        rowEven: '#12080d',
        rowOdd: '#0d0509',
        border: 'rgba(245, 26, 26, 0.25)',
        textLight: '#ffffff',
        textMuted: '#9ca3af',
        gold: '#fbbf24',
      },
      royal_gold: {
        bgGradientStart: '#141005',
        bgGradientEnd: '#080602',
        accent: '#f59e0b',
        accentGlow: 'rgba(245, 158, 11, 0.4)',
        headerBg: 'rgba(245, 158, 11, 0.12)',
        cardBg: '#18140b',
        tableHeaderBg: '#231c0e',
        rowEven: '#151109',
        rowOdd: '#0f0c06',
        border: 'rgba(245, 158, 11, 0.28)',
        textLight: '#ffffff',
        textMuted: '#a3a3a3',
        gold: '#fcd34d',
      },
      stealth_dark: {
        bgGradientStart: '#090d16',
        bgGradientEnd: '#03050a',
        accent: '#3b82f6',
        accentGlow: 'rgba(59, 130, 246, 0.4)',
        headerBg: 'rgba(59, 130, 246, 0.12)',
        cardBg: '#0d1322',
        tableHeaderBg: '#131c33',
        rowEven: '#0c111e',
        rowOdd: '#080c16',
        border: 'rgba(59, 130, 246, 0.25)',
        textLight: '#ffffff',
        textMuted: '#94a3b8',
        gold: '#38bdf8',
      },
    }

    const t = themes[exportTheme]

    // 1. Dark Background with Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height)
    bgGrad.addColorStop(0, t.bgGradientStart)
    bgGrad.addColorStop(1, t.bgGradientEnd)
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, width, height)

    // Subtle Grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)'
    ctx.lineWidth = 1
    for (let x = 0; x < width; x += 60) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y < height; y += 60) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // Outer Glow Border
    ctx.strokeStyle = t.border
    ctx.lineWidth = 4
    ctx.strokeRect(20, 20, width - 40, height - 40)

    // 2. Top Header Bar
    const padX = is16x9 ? 90 : 50
    let curY = is16x9 ? 80 : 70

    // Small Top Brand Badge
    ctx.fillStyle = t.accent
    ctx.font = 'bold 14px sans-serif'
    ctx.fillText('RDK ESPORTS • TOURNAMENT OS', padX, curY)

    curY += 45
    // Big Title
    ctx.fillStyle = t.textLight
    ctx.font = `900 ${is16x9 ? '46px' : '38px'} sans-serif`
    ctx.fillText(tournamentName.toUpperCase(), padX, curY)

    // Subtitle & Stage Info
    curY += 32
    ctx.fillStyle = t.textMuted
    ctx.font = 'bold 16px sans-serif'
    const stageDesc =
      activeView === 'overall'
        ? `OVERALL STANDINGS • CUMULATIVE AFTER ${matches.length} MATCHES • ${gameFormat.toUpperCase()}`
        : `${(selectedMatch?.title || 'MATCH RESULTS').toUpperCase()} • MAP: ${(selectedMatch?.map || '').toUpperCase()}`
    ctx.fillText(stageDesc, padX, curY)

    // Right Side Trophy / Booyah Badge
    const rightX = width - padX
    ctx.textAlign = 'right'
    ctx.fillStyle = t.gold
    ctx.font = 'bold 18px sans-serif'
    ctx.fillText(`OFFICIAL POINTS TABLE`, rightX, curY - 32)
    ctx.fillStyle = t.textMuted
    ctx.font = '13px sans-serif'
    ctx.fillText(`Scoring: Placement + Kills (1 pt/kill)`, rightX, curY - 10)
    ctx.textAlign = 'left'

    curY += 45

    // 3. Table Dimensions & Header
    const tableWidth = width - padX * 2
    const rows =
      activeView === 'overall'
        ? standings.slice(0, is16x9 ? 12 : 14)
        : (selectedMatch?.results || []).slice(0, is16x9 ? 12 : 14)

    const rowHeight = is16x9 ? 48 : 52
    const headerHeight = 44

    // Table Header Background
    ctx.fillStyle = t.tableHeaderBg
    ctx.fillRect(padX, curY, tableWidth, headerHeight)
    ctx.strokeStyle = t.border
    ctx.lineWidth = 1.5
    ctx.strokeRect(padX, curY, tableWidth, headerHeight)

    // Columns Definition
    const isOverall = activeView === 'overall'
    const colRank = padX + 24
    const colTeam = padX + (is16x9 ? 120 : 90)
    const colMP = isOverall ? padX + (is16x9 ? 750 : 420) : 0
    const colWins = isOverall ? padX + (is16x9 ? 950 : 540) : 0
    const colPlace = padX + (is16x9 ? (isOverall ? 1150 : 750) : (isOverall ? 670 : 450))
    const colKills = padX + (is16x9 ? (isOverall ? 1350 : 950) : (isOverall ? 800 : 600))
    const colTotal = padX + tableWidth - 80

    ctx.fillStyle = t.textMuted
    ctx.font = 'bold 13px sans-serif'
    ctx.fillText('# RANK', colRank, curY + 27)
    ctx.fillText('FRANCHISE / TEAM NAME', colTeam, curY + 27)
    if (isOverall) {
      ctx.fillText('MATCHES', colMP, curY + 27)
      ctx.fillText('BOOYAHS', colWins, curY + 27)
    }
    ctx.fillText('PLACE PTS', colPlace, curY + 27)
    ctx.fillText('KILLS', colKills, curY + 27)
    ctx.fillText('TOTAL PTS', colTotal - 25, curY + 27)

    curY += headerHeight

    // 4. Render Table Rows
    rows.forEach((r: any, idx: number) => {
      const isTop1 = idx === 0
      const isTop2 = idx === 1
      const isTop3 = idx === 2

      // Row Background
      if (isTop1) {
        ctx.fillStyle = 'rgba(251, 191, 36, 0.12)'
      } else if (isTop2) {
        ctx.fillStyle = 'rgba(209, 213, 219, 0.08)'
      } else if (isTop3) {
        ctx.fillStyle = 'rgba(217, 119, 6, 0.08)'
      } else {
        ctx.fillStyle = idx % 2 === 0 ? t.rowEven : t.rowOdd
      }

      ctx.fillRect(padX, curY, tableWidth, rowHeight)

      // Row Border
      ctx.strokeStyle = isTop1 ? 'rgba(251, 191, 36, 0.35)' : 'rgba(255, 255, 255, 0.06)'
      ctx.lineWidth = 1
      ctx.strokeRect(padX, curY, tableWidth, rowHeight)

      // Rank Badge
      const rankNum = r.rank || idx + 1
      if (isTop1) {
        ctx.fillStyle = '#fbbf24'
        ctx.fillRect(colRank - 8, curY + 10, 32, 28)
        ctx.fillStyle = '#000000'
        ctx.font = '900 15px sans-serif'
        ctx.fillText(`${rankNum}`, colRank + 3, curY + 29)
      } else if (isTop2) {
        ctx.fillStyle = '#e5e7eb'
        ctx.fillRect(colRank - 8, curY + 10, 32, 28)
        ctx.fillStyle = '#000000'
        ctx.font = '900 15px sans-serif'
        ctx.fillText(`${rankNum}`, colRank + 3, curY + 29)
      } else if (isTop3) {
        ctx.fillStyle = '#d97706'
        ctx.fillRect(colRank - 8, curY + 10, 32, 28)
        ctx.fillStyle = '#ffffff'
        ctx.font = '900 15px sans-serif'
        ctx.fillText(`${rankNum}`, colRank + 3, curY + 29)
      } else {
        ctx.fillStyle = t.textMuted
        ctx.font = 'bold 15px sans-serif'
        ctx.fillText(`${rankNum}`, colRank, curY + 29)
      }

      // Team Name
      ctx.fillStyle = isTop1 ? '#fef08a' : t.textLight
      ctx.font = `bold ${is16x9 ? '16px' : '15px'} sans-serif`
      const truncatedName = String(r.teamName).length > 28 ? String(r.teamName).slice(0, 26) + '…' : String(r.teamName)
      ctx.fillText(truncatedName.toUpperCase(), colTeam, curY + 29)

      // Additional Stats
      ctx.fillStyle = t.textLight
      ctx.font = '14px sans-serif'
      if (isOverall) {
        ctx.fillText(`${r.matchesPlayed || 0}`, colMP + 10, curY + 29)
        ctx.fillStyle = r.booyahs > 0 ? '#fbbf24' : t.textMuted
        ctx.fillText(`${r.booyahs || 0}`, colWins + 10, curY + 29)
        ctx.fillStyle = t.textLight
      }

      ctx.fillText(`${r.placementPoints || 0}`, colPlace + 10, curY + 29)
      ctx.fillText(`${r.kills || (r.killPoints || 0)}`, colKills + 8, curY + 29)

      // Total Points (Bold & Highlighted)
      ctx.fillStyle = isTop1 ? '#fbbf24' : t.accent
      ctx.font = '900 17px sans-serif'
      ctx.fillText(`${r.totalPoints || 0}`, colTotal, curY + 30)

      curY += rowHeight
    })

    // 5. Footer Watermark
    const footerY = height - 42
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.font = '12px sans-serif'
    ctx.fillText(`POWERED BY RDK ESPORTS PLATFORM • VERIFIED SCORING OS • ${new Date().toLocaleDateString('en-IN')}`, padX, footerY)

    ctx.textAlign = 'right'
    ctx.fillText(`rdkesports.in`, width - padX, footerY)
    ctx.textAlign = 'left'
  }

  // Redraw canvas whenever export settings change
  useEffect(() => {
    if (isExportModalOpen) {
      setTimeout(() => {
        drawGraphicToCanvas()
      }, 100)
    }
  }, [isExportModalOpen, exportTheme, exportFormat, activeView, standings, matches])

  // Download PNG to Device
  const handleDownloadPNG = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setIsGeneratingImage(true)
    try {
      const dataUrl = canvas.toDataURL('image/png', 1.0)
      const cleanName = tournamentName.replace(/[^a-zA-Z0-9]/g, '_')
      const viewTag = activeView === 'overall' ? 'Overall_Standings' : `Match_${selectedMatch?.matchNumber || 1}`
      const link = document.createElement('a')
      link.download = `${cleanName}_Points_Table_${viewTag}.png`
      link.href = dataUrl
      link.click()
    } finally {
      setIsGeneratingImage(false)
    }
  }

  // Copy PNG to Clipboard
  const handleCopyToClipboard = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob,
          }),
        ])
        setCopiedNotification(true)
        setTimeout(() => setCopiedNotification(false), 2500)
      }, 'image/png')
    } catch {
      alert('Could not copy image to clipboard. Please use Download PNG.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Alert Notices */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="p-1 text-red-400 hover:text-white">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header & Controls Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Trophy className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-black text-base text-foreground tracking-wide">
                ESPORTS POINTS TABLE & LEADERBOARD
              </h3>
              <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                {gameFormat}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live placement + kill scoring, tie-breakers, and broadcast graphic generator
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Export Graphic Poster */}
          <button
            onClick={() => {
              if (matches.length === 0) {
                alert('No matches have been recorded yet. Please record at least 1 match before exporting graphic poster.')
                return
              }
              setIsExportModalOpen(true)
            }}
            disabled={matches.length === 0}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              matches.length === 0
                ? 'bg-muted/70 text-muted-foreground cursor-not-allowed opacity-60 border border-border'
                : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-600/20'
            }`}
            title={matches.length === 0 ? 'Record at least 1 match to export graphic poster' : 'Export official points table PNG'}
          >
            <ImageIcon className="size-3.5" />
            <span>Export Image (PNG)</span>
          </button>

          {isOrganizer && (
            <>
              {/* Record Match */}
              <button
                onClick={() => handleOpenAddMatch()}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-background transition shadow-md cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>{matches.length === 0 ? 'Record Match 1' : 'Record Match'}</span>
              </button>

              {/* Point System Settings */}
              <button
                onClick={() => {
                  setTempPointSystem(pointSystem)
                  setIsPointSystemModalOpen(true)
                }}
                className="p-2 rounded-lg border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                title="Configure Point System"
              >
                <Settings className="size-4" />
              </button>

              {/* Reset Table (If matches exist) */}
              {matches.length > 0 && (
                <button
                  onClick={() => handleResetTable()}
                  className="p-2 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition cursor-pointer"
                  title="Clear all matches & reset points table"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </>
          )}

          <button
            onClick={() => loadPointsTable()}
            className="p-2 rounded-lg border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
            title="Refresh Leaderboard"
          >
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sub-Tabs: Overall vs Match 1, Match 2... */}
      <div className="flex items-center gap-1.5 border-b border-border pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveView('overall')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeView === 'overall'
              ? 'bg-primary text-background shadow-md'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Trophy className="size-3.5" />
          <span>Overall Standings</span>
          <span className="text-[10px] opacity-75">({matches.length} matches)</span>
        </button>

        {matches.map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveView(m.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeView === m.id
                ? 'bg-amber-500 text-black font-bold shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Flame className="size-3 text-amber-400" />
            <span>Match {m.matchNumber}</span>
            <span className="text-[10px] opacity-75">({m.map})</span>
          </button>
        ))}
      </div>

      {/* MATCH SPECIFIC BANNER (If a match is selected) */}
      {selectedMatch && (
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/05 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs">
              M{selectedMatch.matchNumber}
            </div>
            <div>
              <h4 className="font-heading font-black text-sm text-foreground">{selectedMatch.title}</h4>
              <p className="text-[11px] text-muted-foreground">Map: {selectedMatch.map} • Recorded: {new Date(selectedMatch.createdAt).toLocaleString('en-IN')}</p>
            </div>
          </div>

          {isOrganizer && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleOpenAddMatch(selectedMatch)}
                className="px-2.5 py-1 rounded bg-muted hover:bg-primary/20 hover:text-primary text-xs font-semibold text-muted-foreground transition flex items-center gap-1"
              >
                <Edit3 className="size-3" />
                <span>Edit Match</span>
              </button>
              <button
                onClick={() => handleDeleteMatch(selectedMatch.id, selectedMatch.title)}
                className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition"
                title="Delete Match"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* POINTS TABLE DATA GRID */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 border-b border-border text-muted-foreground text-[11px] uppercase font-bold tracking-wider">
              <tr>
                <th className="p-3.5 w-16 text-center">Rank</th>
                <th className="p-3.5">Team Name</th>
                {activeView === 'overall' && (
                  <>
                    <th className="p-3.5 text-center">Matches</th>
                    <th className="p-3.5 text-center">Booyahs</th>
                  </>
                )}
                <th className="p-3.5 text-center">Placement Pts</th>
                <th className="p-3.5 text-center">Kill Pts</th>
                <th className="p-3.5 text-right font-black text-foreground">Total Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {activeView === 'overall' ? (
                standings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                        <div className="size-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
                          <Trophy className="size-7 opacity-80" />
                        </div>
                        <div>
                          <p className="font-heading font-black text-sm text-foreground tracking-wide">
                            NO MATCHES RECORDED YET
                          </p>
                          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                            {isOrganizer
                              ? 'No match scores have been entered for this tournament yet. When your matches conclude, click "Record Match" to tally and publish official points.'
                              : 'Official match results, kill scores, and team leaderboard standings will appear here once tournament officials record match results.'}
                          </p>
                        </div>
                        {isOrganizer && (
                          <button
                            type="button"
                            onClick={() => handleOpenAddMatch()}
                            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-background transition shadow-lg shadow-primary/25 cursor-pointer"
                          >
                            <Plus className="size-3.5" />
                            <span>Record Match 1</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  standings.map((s, idx) => {
                    const isFirst = s.rank === 1
                    const isSecond = s.rank === 2
                    const isThird = s.rank === 3

                    return (
                      <tr
                        key={s.teamId}
                        className={`transition hover:bg-muted/30 ${
                          isFirst
                            ? 'bg-amber-500/05'
                            : isSecond
                            ? 'bg-slate-300/05'
                            : isThird
                            ? 'bg-amber-700/05'
                            : ''
                        }`}
                      >
                        {/* Rank Badge */}
                        <td className="p-3 text-center">
                          {isFirst ? (
                            <span className="inline-flex size-6 items-center justify-center rounded-full bg-amber-500 text-black font-black text-xs shadow-md shadow-amber-500/30">
                              1
                            </span>
                          ) : isSecond ? (
                            <span className="inline-flex size-6 items-center justify-center rounded-full bg-slate-300 text-black font-black text-xs">
                              2
                            </span>
                          ) : isThird ? (
                            <span className="inline-flex size-6 items-center justify-center rounded-full bg-amber-700 text-white font-black text-xs">
                              3
                            </span>
                          ) : (
                            <span className="font-bold text-muted-foreground">{s.rank}</span>
                          )}
                        </td>

                        {/* Team Name */}
                        <td className="p-3 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            {isFirst && <Award className="size-3.5 text-amber-400 shrink-0" />}
                            <span className={isFirst ? 'text-amber-300 font-bold' : ''}>
                              {s.teamName}
                            </span>
                          </div>
                        </td>

                        {/* Matches Played */}
                        <td className="p-3 text-center text-muted-foreground font-mono">
                          {s.matchesPlayed}
                        </td>

                        {/* Booyahs */}
                        <td className="p-3 text-center font-mono">
                          {s.booyahs > 0 ? (
                            <span className="rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold px-2 py-0.5 text-[11px]">
                              {s.booyahs} 🔥
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>

                        {/* Placement Points */}
                        <td className="p-3 text-center font-mono text-muted-foreground">
                          {s.placementPoints}
                        </td>

                        {/* Kill Points */}
                        <td className="p-3 text-center font-mono text-rose-400 font-semibold">
                          {s.killPoints}
                        </td>

                        {/* Total Points */}
                        <td className="p-3 text-right font-black font-mono text-sm text-primary">
                          {s.totalPoints}
                        </td>
                      </tr>
                    )
                  })
                )
              ) : selectedMatch ? (
                selectedMatch.results.map((r) => (
                  <tr key={r.teamId} className="hover:bg-muted/30 transition">
                    <td className="p-3 text-center">
                      {r.rank === 1 ? (
                        <span className="inline-flex size-6 items-center justify-center rounded-full bg-amber-500 text-black font-black text-xs">
                          1
                        </span>
                      ) : (
                        <span className="font-bold text-muted-foreground">{r.rank}</span>
                      )}
                    </td>
                    <td className="p-3 font-semibold text-foreground">{r.teamName}</td>
                    <td className="p-3 text-center font-mono text-muted-foreground">
                      {r.placementPoints}
                    </td>
                    <td className="p-3 text-center font-mono text-rose-400 font-semibold">
                      {r.kills}
                    </td>
                    <td className="p-3 text-right font-black font-mono text-sm text-primary">
                      {r.totalPoints}
                    </td>
                  </tr>
                ))
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          EXPORT IMAGE MODAL (THE GRAPHIC POSTER GENERATOR)
      ═══════════════════════════════════════════════════════════════ */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative w-full max-w-4xl rounded-2xl border border-red-500/30 bg-[#0e0c10] p-6 shadow-2xl space-y-5 max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
                  <ImageIcon className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-white">
                    Points Table Poster & Stream Card Generator
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    High-resolution broadcast image ready for YouTube streams, casters, and Instagram stories
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-white transition"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Options Row */}
            <div className="grid sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-border/60 bg-muted/20 text-xs">
              {/* Scope */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Score Scope
                </label>
                <select
                  value={activeView}
                  onChange={(e) => setActiveView(e.target.value)}
                  className="w-full rounded border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                >
                  <option value="overall">Overall Standings (All Matches)</option>
                  {matches.map((m) => (
                    <option key={m.id} value={m.id}>
                      Match {m.matchNumber} ({m.map}) Only
                    </option>
                  ))}
                </select>
              </div>

              {/* Format / Aspect Ratio */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Format / Dimension
                </label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  className="w-full rounded border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                >
                  <option value="broadcast_16_9">16:9 Stream Card (1920 x 1080 Full HD)</option>
                  <option value="poster_4_5">4:5 Poster / Story (1080 x 1350 Instagram)</option>
                </select>
              </div>

              {/* Theme */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Color Theme
                </label>
                <select
                  value={exportTheme}
                  onChange={(e) => setExportTheme(e.target.value as any)}
                  className="w-full rounded border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                >
                  <option value="cyber_red">Cyber Red (RDK Signature)</option>
                  <option value="royal_gold">Royal Gold & Obsidian</option>
                  <option value="stealth_dark">Stealth Electric Blue</option>
                </select>
              </div>
            </div>

            {/* Live Canvas Preview */}
            <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-border/80 bg-black/60 overflow-hidden">
              <canvas
                ref={canvasRef}
                className="max-h-[50vh] w-auto max-w-full rounded-lg shadow-2xl object-contain border border-white/10"
              />
              <span className="text-[11px] text-muted-foreground/60 mt-2 font-mono">
                Canvas render resolution: {exportFormat === 'broadcast_16_9' ? '1920 × 1080' : '1080 × 1350'} (Crystal Clear 2K Vector Equivalent)
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="size-4 text-amber-400" />
                <span>Ready to drop into OBS studio or share on WhatsApp / Discord</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopyToClipboard}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-border hover:bg-muted text-foreground transition cursor-pointer"
                >
                  {copiedNotification ? (
                    <>
                      <Check className="size-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      <span>Copy Image</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPNG}
                  disabled={isGeneratingImage}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-background transition cursor-pointer shadow-lg shadow-primary/20"
                >
                  <Download className="size-4" />
                  <span>Download Image (PNG)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          RECORD / EDIT MATCH MODAL (Score Entry Grid)
      ═══════════════════════════════════════════════════════════════ */}
      {isMatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-primary/30 bg-[#0e0c10] p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-heading font-black text-base text-foreground">
                  {editingMatchId ? 'Edit Match Results' : 'Record Match Results'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enter placements & kills. Points and standings calculate automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMatchModalOpen(false)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMatch} className="space-y-4">
              {/* Match Meta */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1">
                    Match Number *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={matchFormNumber}
                    onChange={(e) => setMatchFormNumber(Number(e.target.value))}
                    className="w-full rounded border border-border bg-muted px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1">
                    Battle Map *
                  </label>
                  <select
                    value={matchFormMap}
                    onChange={(e) => setMatchFormMap(e.target.value)}
                    className="w-full rounded border border-border bg-muted px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    {MAP_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1">
                    Match Title
                  </label>
                  <input
                    type="text"
                    placeholder={`Match ${matchFormNumber} - ${matchFormMap}`}
                    value={matchFormTitle}
                    onChange={(e) => setMatchFormTitle(e.target.value)}
                    className="w-full rounded border border-border bg-muted px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Teams Score Entry Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    Match Teams & Placement Standings
                  </span>
                  <button
                    type="button"
                    onClick={handlePrefillTeams}
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    Auto-Fill Registered Teams
                  </button>
                </div>

                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="max-h-[46vh] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/80 border-b border-border text-[10px] text-muted-foreground uppercase font-bold sticky top-0">
                        <tr>
                          <th className="p-2.5 w-16 text-center">Rank</th>
                          <th className="p-2.5">Team Name</th>
                          <th className="p-2.5 w-24 text-center">Kills</th>
                          <th className="p-2.5 w-24 text-right">Pts Preview</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {matchResultsRows.map((row, idx) => {
                          const placePts =
                            pointSystem.placementPoints[String(row.rank)] !== undefined
                              ? pointSystem.placementPoints[String(row.rank)]
                              : 0
                          const killPts = (row.kills || 0) * (pointSystem.killPoint || 1)
                          const totalPts = placePts + killPts

                          return (
                            <tr key={idx} className="hover:bg-muted/30">
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  min={1}
                                  max={48}
                                  value={row.rank}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 1
                                    const next = [...matchResultsRows]
                                    next[idx].rank = val
                                    setMatchResultsRows(next)
                                  }}
                                  className="w-12 rounded border border-border bg-card px-1.5 py-1 text-center font-bold text-xs"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  required
                                  value={row.teamName}
                                  onChange={(e) => {
                                    const next = [...matchResultsRows]
                                    next[idx].teamName = e.target.value
                                    setMatchResultsRows(next)
                                  }}
                                  className="w-full rounded border border-border bg-card px-2.5 py-1 text-xs text-foreground font-semibold"
                                  placeholder={`Team ${idx + 1}`}
                                />
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  value={row.kills}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0
                                    const next = [...matchResultsRows]
                                    next[idx].kills = val
                                    setMatchResultsRows(next)
                                  }}
                                  className="w-16 rounded border border-border bg-card px-1.5 py-1 text-center font-bold text-xs text-rose-400"
                                />
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-primary">
                                {totalPts} pts
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsMatchModalOpen(false)}
                  className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMatch}
                  className="rounded bg-primary px-4 py-1.5 text-xs font-bold text-background hover:opacity-90 disabled:opacity-60 flex items-center gap-1.5"
                >
                  {isSavingMatch ? 'Saving…' : 'Save Match & Recalculate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          POINT SYSTEM CONFIGURATION MODAL
      ═══════════════════════════════════════════════════════════════ */}
      {isPointSystemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="size-5 text-primary" />
                <h3 className="font-heading font-black text-base text-foreground">
                  Scoring Formula Rules
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPointSystemModalOpen(false)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-muted-foreground uppercase">
                Quick Standard Presets
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTempPointSystem(FREE_FIRE_DEFAULT_PRESET)}
                  className="p-2.5 rounded-lg border border-border bg-muted/40 hover:border-primary/40 text-left text-xs transition"
                >
                  <div className="font-bold text-foreground">Free Fire Official (12 pts)</div>
                  <div className="text-[10px] text-muted-foreground">1st: 12, 2nd: 9, 3rd: 8...</div>
                </button>
                <button
                  type="button"
                  onClick={() => setTempPointSystem(BGMI_DEFAULT_PRESET)}
                  className="p-2.5 rounded-lg border border-border bg-muted/40 hover:border-primary/40 text-left text-xs transition"
                >
                  <div className="font-bold text-foreground">BGMI / PUBG Official (10 pts)</div>
                  <div className="text-[10px] text-muted-foreground">1st: 10, 2nd: 6, 3rd: 5...</div>
                </button>
              </div>
            </div>

            {/* Kill Point */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Points Per Kill
              </label>
              <input
                type="number"
                min={0}
                value={tempPointSystem.killPoint}
                onChange={(e) =>
                  setTempPointSystem({
                    ...tempPointSystem,
                    killPoint: Number(e.target.value) || 0,
                  })
                }
                className="w-full rounded border border-border bg-muted px-3 py-1.5 text-xs text-foreground"
              />
            </div>

            {/* Placement Points Grid */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-foreground">
                Rank Placement Points (1st - 12th)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((rank) => (
                  <div key={rank} className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground w-6">#{rank}</span>
                    <input
                      type="number"
                      min={0}
                      value={tempPointSystem.placementPoints[String(rank)] || 0}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0
                        setTempPointSystem({
                          ...tempPointSystem,
                          placementPoints: {
                            ...tempPointSystem.placementPoints,
                            [String(rank)]: val,
                          },
                        })
                      }}
                      className="w-full rounded border border-border bg-muted px-2 py-1 text-xs text-center font-bold"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-border">
              <button
                type="button"
                onClick={() => setIsPointSystemModalOpen(false)}
                className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePointSystem}
                disabled={isSavingSystem}
                className="rounded bg-primary px-4 py-1.5 text-xs font-bold text-background hover:opacity-90 disabled:opacity-60"
              >
                {isSavingSystem ? 'Saving…' : 'Apply Scoring Rules'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
