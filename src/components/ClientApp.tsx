import React, { useState, useEffect, useCallback } from 'react'
import { Clock, Plus, Edit2, Trash2, LogOut, Moon, Sun, Download, Play, Square, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './ui/Button'
import { Input, Textarea, Select, Alert, Modal, Card, Badge } from './ui/index'
import { getTenantFromSession, clearTenantSession } from '@/lib/multiTenantUtils'
import { getTimeEntries, createTimeEntry, updateTimeEntry, deleteTimeEntry, getProjects, getTasks } from '@/lib/multiTenantOdooAPI'
import { useTheme } from '@/lib/themeContext'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Props {
  onLogout: () => void
}

interface TimeEntryForm {
  name: string
  date: string
  hours: string
  project_id: string
  task_id: string
  x_start_time: string
  x_end_time: string
}

const emptyForm = (): TimeEntryForm => ({
  name: '',
  date: new Date().toISOString().split('T')[0],
  hours: '',
  project_id: '',
  task_id: '',
  x_start_time: '',
  x_end_time: '',
})

function formatHours(h: number): string {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return `${hh}h${mm > 0 ? mm.toString().padStart(2, '0') : '00'}`
}

function getWeekBounds(offset = 0): { start: string; end: string; label: string } {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) + offset * 7
  const monday = new Date(now.setDate(diff))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const labelFmt = (d: Date) => d.toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' })
  return {
    start: fmt(monday),
    end: fmt(sunday),
    label: `${labelFmt(monday)} – ${labelFmt(sunday)}`,
  }
}

export function ClientApp({ onLogout }: Props) {
  const { isDark, toggleTheme } = useTheme()
  const session = getTenantFromSession()!
  const hasCustomTimeFields = session.has_custom_time_fields ?? true

  const [weekOffset, setWeekOffset] = useState(0)
  const [entries, setEntries] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Timer
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerStart, setTimerStart] = useState<Date | null>(null)
  const [timerElapsed, setTimerElapsed] = useState(0)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<any>(null)
  const [form, setForm] = useState<TimeEntryForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const week = getWeekBounds(weekOffset)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [entriesData, projectsData] = await Promise.all([
        getTimeEntries(week.start, week.end),
        getProjects(),
      ])
      setEntries(entriesData || [])
      setProjects(projectsData || [])
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [week.start, week.end])

  useEffect(() => { loadData() }, [loadData])

  // Timer tick
  useEffect(() => {
    if (!timerRunning || !timerStart) return
    const interval = setInterval(() => {
      setTimerElapsed(Math.floor((Date.now() - timerStart.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [timerRunning, timerStart])

  // Load tasks when project changes
  useEffect(() => {
    if (form.project_id) {
      getTasks(parseInt(form.project_id)).then(setTasks).catch(() => {})
    } else {
      setTasks([])
    }
  }, [form.project_id])

  const openCreate = () => {
    setEditingEntry(null)
    setForm(emptyForm())
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (entry: any) => {
    setEditingEntry(entry)
    setForm({
      name: entry.name || '',
      date: entry.date || new Date().toISOString().split('T')[0],
      hours: entry.unit_amount?.toString() || '',
      project_id: entry.project_id?.[0]?.toString() || '',
      task_id: entry.task_id?.[0]?.toString() || '',
      x_start_time: entry.x_start_time || '',
      x_end_time: entry.x_end_time || '',
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      const values: any = {
        name: form.name,
        date: form.date,
        unit_amount: parseFloat(form.hours),
      }
      if (form.project_id) values.project_id = parseInt(form.project_id)
      if (form.task_id) values.task_id = parseInt(form.task_id)
      if (hasCustomTimeFields && form.x_start_time) values.x_start_time = form.x_start_time
      if (hasCustomTimeFields && form.x_end_time) values.x_end_time = form.x_end_time

      if (editingEntry) {
        await updateTimeEntry(editingEntry.id, values)
      } else {
        await createTimeEntry(values)
      }
      setModalOpen(false)
      await loadData()
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Supprimer cette entrée ?')) return
    try {
      await deleteTimeEntry(id)
      await loadData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleTimerToggle = () => {
    if (timerRunning) {
      // Stop timer, fill form
      const hours = timerElapsed / 3600
      const startTime = timerStart!
      const endTime = new Date()
      setForm(f => ({
        ...f,
        hours: hours.toFixed(2),
        x_start_time: startTime.toTimeString().slice(0, 5),
        x_end_time: endTime.toTimeString().slice(0, 5),
        date: startTime.toISOString().split('T')[0],
      }))
      setTimerRunning(false)
      setTimerStart(null)
      setTimerElapsed(0)
      setEditingEntry(null)
      setFormError('')
      setModalOpen(true)
    } else {
      setTimerRunning(true)
      setTimerStart(new Date())
      setTimerElapsed(0)
    }
  }

  const formatTimer = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const totalHours = entries.reduce((sum, e) => sum + (e.unit_amount || 0), 0)

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(`Rapport heures — ${week.label}`, 14, 20)
    doc.setFontSize(10)
    doc.text(`Employé: ${session.user_email}`, 14, 30)
    doc.text(`Total: ${formatHours(totalHours)}`, 14, 36)

    autoTable(doc, {
      startY: 44,
      head: [['Date', 'Description', 'Projet', 'Tâche', 'Heures']],
      body: entries.map(e => [
        e.date,
        e.name,
        e.project_id?.[1] || '—',
        e.task_id?.[1] || '—',
        formatHours(e.unit_amount || 0),
      ]),
    })
    doc.save(`heures_${week.start}_${week.end}.pdf`)
  }

  const handleLogout = () => {
    clearTenantSession()
    onLogout()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary" />
            <div>
              <span className="font-semibold text-sm">Hoos TimeTracker</span>
              <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">{session.tenant_slug}</span>
            </div>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2">
            {timerRunning && (
              <span className="font-mono text-sm text-primary bg-primary/10 px-3 py-1 rounded-full">
                {formatTimer(timerElapsed)}
              </span>
            )}
            <Button
              size="sm"
              variant={timerRunning ? 'destructive' : 'outline'}
              onClick={handleTimerToggle}
              className="gap-1.5"
            >
              {timerRunning ? <><Square className="w-3.5 h-3.5" /> Stop</> : <><Play className="w-3.5 h-3.5" /> Timer</>}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={exportPDF} className="gap-1.5 hidden sm:flex">
              <Download className="w-3.5 h-3.5" /> PDF
            </Button>
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </Button>
            <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-accent">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={handleLogout} className="p-2 rounded-md hover:bg-accent text-muted-foreground" title="Déconnexion">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Week nav */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setWeekOffset(o => o - 1)} className="p-2 rounded-md hover:bg-accent">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">{week.label}</span>
              {weekOffset === 0 && <Badge variant="default" className="text-xs">Semaine actuelle</Badge>}
            </div>
            <button onClick={() => setWeekOffset(o => o + 1)} className="p-2 rounded-md hover:bg-accent">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{formatHours(totalHours)}</p>
            <p className="text-xs text-muted-foreground">total semaine</p>
          </div>
        </div>

        {error && <Alert variant="destructive" className="mb-4">{error}</Alert>}

        {/* Entries */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Clock className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
            <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Aucune entrée cette semaine</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Commencez à enregistrer vos heures</p>
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Première entrée
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{entry.name || '(sans description)'}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">{entry.date}</span>
                    {entry.project_id?.[1] && (
                      <Badge variant="outline" className="text-xs">{entry.project_id[1]}</Badge>
                    )}
                    {entry.task_id?.[1] && (
                      <Badge variant="outline" className="text-xs">{entry.task_id[1]}</Badge>
                    )}
                    {hasCustomTimeFields && entry.x_start_time && entry.x_end_time && (
                      <span className="text-xs text-muted-foreground">{entry.x_start_time} – {entry.x_end_time}</span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="font-semibold">{formatHours(entry.unit_amount || 0)}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(entry)} className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(entry.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingEntry ? 'Modifier l\'entrée' : 'Nouvelle entrée'}>
        <form onSubmit={handleSave} className="space-y-4">
          {formError && <Alert variant="destructive">{formError}</Alert>}
          <Textarea
            label="Description"
            required
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Sur quoi avez-vous travaillé ?"
            rows={2}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              required
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
            <Input
              label="Heures"
              type="number"
              step="0.25"
              min="0.25"
              max="24"
              required
              value={form.hours}
              onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
              placeholder="1.5"
            />
          </div>
          {hasCustomTimeFields && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Heure début"
                type="time"
                value={form.x_start_time}
                onChange={e => setForm(f => ({ ...f, x_start_time: e.target.value }))}
              />
              <Input
                label="Heure fin"
                type="time"
                value={form.x_end_time}
                onChange={e => setForm(f => ({ ...f, x_end_time: e.target.value }))}
              />
            </div>
          )}
          <Select
            label="Projet"
            value={form.project_id}
            onChange={e => setForm(f => ({ ...f, project_id: e.target.value, task_id: '' }))}
          >
            <option value="">— Aucun projet —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          {tasks.length > 0 && (
            <Select
              label="Tâche"
              value={form.task_id}
              onChange={e => setForm(f => ({ ...f, task_id: e.target.value }))}
            >
              <option value="">— Aucune tâche —</option>
              {tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1" loading={saving}>
              {editingEntry ? 'Mettre à jour' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
