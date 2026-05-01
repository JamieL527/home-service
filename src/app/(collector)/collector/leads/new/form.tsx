'use client'

import { useState, useRef, useEffect, useActionState, useMemo } from 'react'
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { createClient } from '@/lib/supabase/client'
import { createLead } from '@/app/actions/leads'
import { PhotoGrid } from '@/components/ui/photo-grid'
import {
  MapPin, Camera, Building, Hammer, MessageCircle,
  Plus, Globe, X, Save, RefreshCw, Layers, Star,
  Crosshair, Loader2, ChevronLeft, ChevronRight, CheckCircle, Mic,
  Navigation, Database, Mail, ScanText, Phone, AtSign,
  Building2, Link
} from 'lucide-react'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""

const defaultCenter = {
  lat: 43.6532,
  lng: -79.3832, // Toronto
}

const PHASES = [
  { value: 'P0', label: 'Phase 0: Survey' },
  { value: 'P1', label: 'Phase 1: Foundation' },
  { value: 'P2', label: 'Phase 2: Framing' },
  { value: 'P3', label: 'Phase 3: MEC/Drywall' },
  { value: 'P4', label: 'Phase 4: Finishing' },
  { value: 'P5', label: 'Phase 5: Landscaping' },
  { value: 'MLS', label: 'MLS: Renovation' },
]

type Contact = { name: string; email: string; phone: string; role: string }
type PhotoCat = 'site' | 'demand' | 'supply' | 'other'

// Speech Recognition types for browser compatibility
interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: Event) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

interface ISpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string
      }
    }
    length: number
  }
}

const PHOTO_ITEMS: { key: PhotoCat; label: string; Icon: React.ElementType }[] = [
  { key: 'site', label: 'Site', Icon: Camera },
  { key: 'demand', label: 'Demand', Icon: Building },
  { key: 'supply', label: 'Supply', Icon: Hammer },
  { key: 'other', label: 'Other', Icon: Plus },
]

function SectionLabel({
  Icon,
  text,
  colorClass,
}: {
  Icon: React.ElementType
  text: string
  colorClass: string
}) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <Icon size={14} className={colorClass} />
      <span className={`text-xs font-bold uppercase tracking-wider ${colorClass}`}>{text}</span>
    </div>
  )
}

// Map camera updater component
function MapCameraUpdater({ coords, pinDropped }: { coords: { lat: number; lng: number }; pinDropped: boolean }) {
  const map = useMap()
  
  useEffect(() => {
    if (!map) return
    if (pinDropped && coords) {
      map.panTo(coords)
      map.setZoom(18)
    }
  }, [map, coords, pinDropped])
  
  return null
}

export function NewLeadForm({ zoneId, zoneName }: { zoneId?: string | null; zoneName?: string | null }) {
  // View state: 'map' | 'form'
  const [view, setView] = useState<'map' | 'form'>('map')
  
  // Map related state
  const [address, setAddress] = useState('')
  const [location, setLocation] = useState(defaultCenter)
  const [pinDropped, setPinDropped] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [navigatingToStart, setNavigatingToStart] = useState(false)
  
  // Form state
  const [state, action, isPending] = useActionState(createLead, null)
  const [contacts, setContacts] = useState<Contact[]>([
    { name: '', email: '', phone: '', role: '' },
  ])
  const [photoCounts, setPhotoCounts] = useState<Record<PhotoCat, number>>({
    site: 0, demand: 0, supply: 0, other: 0,
  })
  const [photoUrls, setPhotoUrls] = useState<Record<PhotoCat, string[]>>({
    site: [], demand: [], supply: [], other: [],
  })
  const [photoUploading, setPhotoUploading] = useState<Record<PhotoCat, boolean>>({
    site: false, demand: false, supply: false, other: false,
  })
  // stable folder name for this form session
  const uploadFolder = useMemo(() => `draft-${Date.now()}`, [])
  const [notes, setNotes] = useState('')
  const [phase, setPhase] = useState('P0')
  
  // Supply side state
  type SupplyEntry = {
    trade: string; company: string; contact: string; phone: string
    email: string; website: string; officeLocation: string; interaction: string
  }
  const emptySupply = (): SupplyEntry => ({
    trade: '', company: '', contact: '', phone: '',
    email: '', website: '', officeLocation: '', interaction: 'Visual (Truck/Sign)'
  })
  const [supplyList, setSupplyList] = useState<SupplyEntry[]>([emptySupply()])
  
  // Speech recognition state
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<ISpeechRecognition | null>(null)

  const photoRefs = {
    site: useRef<HTMLInputElement>(null),
    demand: useRef<HTMLInputElement>(null),
    supply: useRef<HTMLInputElement>(null),
    other: useRef<HTMLInputElement>(null),
  }
  const ocrRefs = {
    site: useRef<HTMLInputElement>(null),
    demand: useRef<HTMLInputElement>(null),
    supply: useRef<HTMLInputElement>(null),
    other: useRef<HTMLInputElement>(null),
  }

  // OCR state
  type OcrResult = {
    text: string
    phones: string[]
    emails: string[]
    websites: string[]
    companies: string[]
    addresses: string[]
    names: string[]
  }
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const [ocrError, setOcrError] = useState('')
  const [ocrSource, setOcrSource] = useState<PhotoCat>('site')
  const [uploadError, setUploadError] = useState('')
  const [lightbox, setLightbox] = useState<{ urls: string[]; label: string; idx: number } | null>(null)

  // Demand side controlled fields (for OCR fill)
  const [businessName, setBusinessName] = useState('')
  const [website, setWebsite] = useState('')
  const [officeLocation, setOfficeLocation] = useState('')

  // Initialize speech recognition
  useEffect(() => {
    const win = window as Window & {
      SpeechRecognition?: new () => ISpeechRecognition
      webkitSpeechRecognition?: new () => ISpeechRecognition
    }
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition
    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = navigator.language
      recognitionRef.current.onresult = (e) => {
        const event = e as unknown as ISpeechRecognitionEvent
        const transcript = event.results[event.results.length - 1][0].transcript
        setNotes(prev => prev + ' ' + transcript)
      }
      recognitionRef.current.onerror = () => {
        setIsRecording(false)
      }
      recognitionRef.current.onend = () => {
        setIsRecording(false)
      }
    }
  }, [])

  // Toggle voice recording
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
    } else {
      const win = window as Window & {
        SpeechRecognition?: new () => ISpeechRecognition
        webkitSpeechRecognition?: new () => ISpeechRecognition
      }
      if (!recognitionRef.current && !win.SpeechRecognition && !win.webkitSpeechRecognition) {
        alert('Your browser does not support speech recognition')
        return
      }
      recognitionRef.current?.start()
      setIsRecording(true)
    }
  }

  // Set location on map click
  const handleMapTap = async (e: { detail?: { latLng?: { lat: number; lng: number } } }) => {
    if (!e.detail?.latLng) return
    const lat = e.detail.latLng.lat
    const lng = e.detail.latLng.lng
    
    setIsLocating(true)
    setLocation({ lat, lng })
    setPinDropped(true)
    
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&language=en`
      )
      const data = await response.json()
      if (data.results && data.results.length > 0) {
        setAddress(data.results[0].formatted_address)
      }
    } catch (error) {
      console.error('Geocoding error:', error)
    } finally {
      setIsLocating(false)
    }
  }

  // Use GPS location
  const locateAndPin = () => {
    setIsLocating(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const currentLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setLocation(currentLoc)
          setPinDropped(true)
          
          try {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${currentLoc.lat},${currentLoc.lng}&key=${GOOGLE_MAPS_API_KEY}&language=en`
            )
            const data = await response.json()
            if (data.results && data.results.length > 0) {
              setAddress(data.results[0].formatted_address)
            }
          } catch (error) {
            console.error('Geocoding error:', error)
          } finally {
            setIsLocating(false)
          }
        },
        () => {
          alert('Please enable GPS location permission')
          setIsLocating(false)
        },
        { enableHighAccuracy: true }
      )
    } else {
      alert('Your device does not support GPS location')
      setIsLocating(false)
    }
  }

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>, cat: PhotoCat) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return

    setUploadError('')

    // Show local previews immediately so user sees photos right away
    const previews = files.map(f => URL.createObjectURL(f))
    setPhotoUrls(p => ({ ...p, [cat]: [...p[cat], ...previews] }))
    setPhotoCounts(p => ({ ...p, [cat]: p[cat] + files.length }))

    // Upload to Supabase in background, replace blob URLs with real URLs
    setPhotoUploading(p => ({ ...p, [cat]: true }))
    const supabase = createClient()

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const preview = previews[i]
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${uploadFolder}/${cat}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage
        .from('lead-photos')
        .upload(path, file, { upsert: false })
      if (error) {
        console.error('Upload error:', error.message)
        setUploadError(`Upload failed: ${error.message}`)
      } else {
        const { data } = supabase.storage.from('lead-photos').getPublicUrl(path)
        // Replace blob URL with the real Supabase URL
        setPhotoUrls(p => ({
          ...p,
          [cat]: p[cat].map(u => u === preview ? data.publicUrl : u),
        }))
      }
    }

    setPhotoUploading(p => ({ ...p, [cat]: false }))
  }

  async function runOcr(source: PhotoCat, base64: string) {
    setOcrSource(source)
    setOcrLoading(true)
    setOcrError('')
    setOcrResult(null)
    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64 }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setOcrError('OCR failed, please enter manually')
        return
      }
      const text: string = data.text ?? ''
      if (!text.trim()) {
        setOcrError('No text detected')
        return
      }
      setOcrResult(parseOcrText(text))
    } catch {
      setOcrError('OCR failed, please enter manually')
    } finally {
      setOcrLoading(false)
    }
  }

  async function scanExistingPhoto(url: string, source: PhotoCat) {
    try {
      const resp = await fetch(url)
      const blob = await resp.blob()
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      await runOcr(source, base64)
    } catch {
      setOcrError('Could not read photo, please try again')
      setOcrLoading(false)
    }
  }

  async function onOcrFileSelected(e: React.ChangeEvent<HTMLInputElement>, source: PhotoCat) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      await runOcr(source, base64)
    } catch {
      setOcrError('OCR failed, please enter manually')
    } finally {
      setOcrLoading(false)
    }
  }

  function parseOcrText(text: string): OcrResult {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

    const phoneRe = /(\+?1?[\s.\-]?\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4})/g
    const emailRe = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
    const websiteRe = /(?:https?:\/\/)?(?:www\.)[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}(?:\/\S*)?/gi
    // Street address: starts with a number followed by a street name
    const addressRe = /^\d+[\w\s,.-]*(?:St|Ave|Blvd|Rd|Dr|Way|Ln|Ct|Pl|Cres|Crescent|Circle|Trail|Terrace|Gate|Grove|Park|Square|Street|Avenue|Boulevard|Road|Drive|Highway|Hwy|Unit|Suite|Floor)[,.\s\w#-]*/i

    const phones = [...new Set(text.match(phoneRe) ?? [])].map(s => s.trim())
    const emails = [...new Set(text.match(emailRe) ?? [])]
    const websites = [...new Set(text.match(websiteRe) ?? [])]

    // Business card company heuristic:
    // A "company" line is one that contains a trade keyword OR has typical company suffixes
    // OR is ALL CAPS or Title Case and is NOT a person name / address / phone / email
    const tradeKeywords = /construction|contracting|contractor|builders|building|roofing|plumbing|electrical|electric|mechanical|hvac|renovation|renovations|landscaping|framing|concrete|masonry|painting|flooring|interiors|exterior|general|enterprise|industries|group|solutions|services|management|realty|property|properties|homes|home|design|studio|corp|inc|ltd|llc|co\.|company/i
    const companySuffixRe = /\b(Inc\.?|LLC|Ltd\.?|Corp\.?|Co\.|Group|Solutions|Services|Construction|Contracting|Builders|Renovations?|Industries|Enterprises?|Properties|Realty|Management)\b/i

    const addressLines = lines.filter(l => addressRe.test(l))
    const emailSet = new Set(emails)
    const phoneSet = new Set(phones.map(p => p.replace(/\D/g, '')))

    const isPhoneLine = (l: string) => phoneRe.test(l)
    const isEmailLine = (l: string) => emailSet.has(l) || emailRe.test(l)
    const isWebsiteLine = (l: string) => websiteRe.test(l)
    const isAddressLine = (l: string) => addressRe.test(l)
    const isNumericHeavy = (l: string) => (l.replace(/\D/g, '').length / l.length) > 0.4

    const companyLines = lines.filter(l =>
      !isPhoneLine(l) && !isEmailLine(l) && !isWebsiteLine(l) && !isAddressLine(l) && !isNumericHeavy(l) &&
      (tradeKeywords.test(l) || companySuffixRe.test(l) || /^[A-Z\s&.'-]{4,}$/.test(l))
    )

    // Person name: 2–3 words, each Title Case, no numbers, not a company line
    const nameRe = /^[A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2}$/
    const companySet = new Set(companyLines)
    const nameLines = lines.filter(l =>
      nameRe.test(l) && !companySet.has(l) && !isAddressLine(l) && l.split(' ').length <= 3
    )

    return {
      text,
      phones,
      emails,
      websites,
      companies: [...new Set(companyLines)].slice(0, 5),
      addresses: [...new Set(addressLines)].slice(0, 3),
      names: [...new Set(nameLines)].slice(0, 3),
    }
  }

  function addContact() {
    setContacts((p) => [...p, { name: '', email: '', phone: '', role: '' }])
  }

  function removeContact(i: number) {
    if (contacts.length === 1) return
    setContacts((p) => p.filter((_, idx) => idx !== i))
  }

  function updateContact(i: number, f: keyof Contact, v: string) {
    setContacts((p) => p.map((c, idx) => (idx === i ? { ...c, [f]: v } : c)))
  }

  function addSupply() {
    setSupplyList(prev => [...prev, emptySupply()])
  }

  function removeSupply(index: number) {
    setSupplyList(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : [emptySupply()])
  }

  function updateSupply(index: number, field: keyof SupplyEntry, value: string) {
    setSupplyList(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  function fillLastSupply(field: keyof SupplyEntry, value: string) {
    setSupplyList(prev => prev.map((s, i) => i === prev.length - 1 ? { ...s, [field]: value } : s))
  }

  // Route to start point
  const handleRouteToStart = () => {
    if (!pinDropped) {
      setIsLocating(true)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const currentLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
            setLocation(currentLoc)
            setPinDropped(true)
            setNavigatingToStart(true)
            setIsLocating(false)
            try {
              const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${currentLoc.lat},${currentLoc.lng}&key=${GOOGLE_MAPS_API_KEY}&language=en`
              )
              const data = await response.json()
              if (data.results && data.results.length > 0) {
                setAddress(data.results[0].formatted_address)
              }
            } catch (e) {
              console.error('Geocoding error:', e)
            }
          },
          () => {
            alert('Please allow GPS permissions.')
            setIsLocating(false)
          },
          { enableHighAccuracy: true }
        )
      } else {
        alert('GPS not supported.')
        setIsLocating(false)
      }
    } else {
      setNavigatingToStart(true)
    }
  }

  // ========== Map Selection View ==========
  if (view === 'map') {
    return (
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <div className="fixed inset-0 z-0 bg-white flex flex-col">
          {/* 顶部标题栏 */}
          <div className="bg-gray-900 text-white p-4 z-10 shadow-md flex items-center justify-between">
            <div className="flex items-center">
              <MapPin className="text-blue-400 mr-2" size={20} />
              <span className="font-bold tracking-wide">Select Job Site Location</span>
            </div>
            <a href="/collector/dashboard" className="text-gray-400 hover:text-white text-sm font-bold">
              Cancel
            </a>
          </div>

          {/* 地图区域 */}
          <div className="flex-1 relative">
            <Map
              defaultCenter={defaultCenter}
              defaultZoom={13}
              mapId="lead_form_map"
              gestureHandling="greedy"
              disableDefaultUI={false}
              onClick={handleMapTap as any}
            >
              <MapCameraUpdater coords={location} pinDropped={pinDropped} />
              {pinDropped && (
                <AdvancedMarker position={location}>
                  <div className="bg-red-600 text-white p-2 rounded-full shadow-lg border-2 border-white animate-bounce">
                    <MapPin size={24} />
                  </div>
                </AdvancedMarker>
              )}
            </Map>
            
            {/* GPS定位按钮 */}
            <button
              onClick={locateAndPin}
              className="absolute bottom-6 right-6 bg-white p-4 rounded-full shadow-2xl border border-gray-200 text-blue-600 hover:bg-blue-50 z-10 transition-colors"
            >
              {isLocating ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <Crosshair size={24} />
              )}
            </button>
          </div>

          {/* 底部操作区 */}
          <div className="p-6 bg-white border-t border-gray-200 z-10 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
            {/* Route to Start Point Button */}
            {!navigatingToStart && (
              <button
                onClick={handleRouteToStart}
                className="w-full mb-4 py-3 rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-md flex items-center justify-center transition-all"
              >
                {isLocating ? (
                  <Loader2 size={18} className="animate-spin mr-2" />
                ) : (
                  <Navigation size={18} className="mr-2" />
                )}
                {isLocating ? 'Finding you...' : 'Route to Start Point'}
              </button>
            )}
            
            {/* Navigation Active Indicator */}
            {navigatingToStart && (
              <div className="w-full mb-4 py-3 rounded-xl font-bold bg-green-50 text-green-700 border border-green-200 flex items-center justify-center">
                <CheckCircle size={18} className="mr-2" /> Navigation Active
              </div>
            )}
            
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
              <div className="flex items-center gap-3">
                <MapPin size={20} className={pinDropped ? 'text-red-500' : 'text-blue-500'} />
                <div>
                  <div className="font-bold text-gray-900 text-sm">
                    {pinDropped ? (address.split(',')[0] || 'Location Selected') : 'Ready to collect'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {pinDropped
                      ? address.split(',').slice(1).join(',').trim() || 'Tap map to adjust location'
                      : 'Tap map or search address'}
                  </div>
                </div>
              </div>
            </div>

            <button
              disabled={!pinDropped}
              onClick={() => setView('form')}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-md flex items-center justify-center transition-all ${
                pinDropped ? 'bg-gray-900 hover:bg-black' : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              <CheckCircle size={18} className="mr-2" />
              Confirm Job Site Location
            </button>
          </div>
        </div>
      </APIProvider>
    )
  }

  // ========== Form Entry View ==========
  return (
    <div className="fixed inset-0 z-10 bg-white flex flex-col animate-fadeIn">
      {/* 顶部导��� */}
      <div className="p-4 border-b flex justify-between items-start bg-white shadow-sm sticky top-0 z-20">
        <button
          onClick={() => setView('map')}
          className="text-gray-500 font-bold flex items-center mt-1 hover:text-gray-700"
        >
          <ChevronRight className="rotate-180 mr-1" size={20} />
          Back to Map
        </button>
        <div className="flex flex-col items-end">
          <span className="font-bold text-gray-800 text-xs truncate max-w-[200px] text-right">
            {address || 'Unknown Location'}
          </span>
          <span className="text-[10px] text-gray-500 mt-0.5">
            {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </span>
        </div>
      </div>

      {/* 表单内容 */}
      <form action={action} className="flex-1 overflow-y-auto">
        <input type="hidden" name="contacts" value={JSON.stringify(contacts)} />
        <input type="hidden" name="address" value={address} />
        <input type="hidden" name="lat" value={location.lat} />
        <input type="hidden" name="lng" value={location.lng} />
        <input type="hidden" name="phase" value={phase} />
        <input type="hidden" name="initialComment" value={notes} />
        {zoneId && <input type="hidden" name="zoneId" value={zoneId} />}
        {zoneName && <input type="hidden" name="zoneName" value={zoneName} />}
        {ocrResult && <input type="hidden" name="ocrData" value={JSON.stringify({ text: ocrResult.text })} />}
        <input type="hidden" name="photos" value={JSON.stringify({
          site:   photoUrls.site.filter(u => !u.startsWith('blob:')),
          demand: photoUrls.demand.filter(u => !u.startsWith('blob:')),
          supply: photoUrls.supply.filter(u => !u.startsWith('blob:')),
          other:  photoUrls.other.filter(u => !u.startsWith('blob:')),
        })} />

        <div className="p-4 space-y-4 pb-28">
          {/* Zone banner */}
          {zoneName && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-700 font-medium">
              <MapPin size={14} className="shrink-0" />
              Your Zone: {zoneName}
            </div>
          )}
          {/* ── 1. City Data ── */}
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-bold text-purple-700 uppercase flex items-center">
                <Database size={14} className="mr-1" /> 1. City Data
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white p-2 rounded border border-purple-100">
                <span className="text-xs text-purple-400 block">Permit #</span>
                <span className="text-gray-400 italic">Pending API...</span>
              </div>
              <div className="bg-white p-2 rounded border border-purple-100">
                <span className="text-xs text-purple-400 block">Value</span>
                <span className="text-gray-400 italic">Pending API...</span>
              </div>
            </div>
          </div>

          {/* ── 2. Visual Evidence ── */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
            <SectionLabel Icon={Camera} text="2. Visual Evidence (Snap to Scan)" colorClass="text-gray-500" />
            <div className="grid grid-cols-4 gap-2">
              {PHOTO_ITEMS.map(({ key, label, Icon }) => (
                <div key={key} className="space-y-1">
                  {/* Hidden file input */}
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    capture="environment"
                    ref={photoRefs[key]}
                    className="hidden"
                    onChange={(e) => onPhotoChange(e, key)}
                  />

                  {/* Photo cell: thumbnail when photos exist, upload button when empty */}
                  {photoUploading[key] ? (
                    <div className="w-full h-16 border-2 border-dashed border-yellow-300 bg-yellow-50 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold text-yellow-700">
                      <Loader2 size={14} className="animate-spin mb-0.5" />
                      Uploading…
                    </div>
                  ) : photoUrls[key].length > 0 ? (
                    <div className="relative w-full h-16 rounded-xl overflow-hidden border-2 border-green-300">
                      {/* Thumbnail — click to open lightbox */}
                      <button
                        type="button"
                        onClick={() => setLightbox({ urls: photoUrls[key], label, idx: 0 })}
                        className="w-full h-full"
                      >
                        <img src={photoUrls[key][0]} alt={label} className="w-full h-full object-cover" />
                      </button>
                      {/* Count badge */}
                      {photoUrls[key].length > 1 && (
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded pointer-events-none">
                          {photoUrls[key].length}
                        </span>
                      )}
                      {/* Add more button */}
                      <button
                        type="button"
                        onClick={() => photoRefs[key].current?.click()}
                        className="absolute top-1 right-1 bg-white/90 hover:bg-white rounded-full p-0.5 shadow-sm transition-colors"
                      >
                        <Plus size={10} className="text-gray-700" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => photoRefs[key].current?.click()}
                      className="w-full h-16 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-[10px] font-bold bg-white border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-all active:scale-95 select-none"
                    >
                      <Icon size={14} className="mb-0.5" />
                      {label}
                    </button>
                  )}

                  {/* OCR scan */}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={ocrRefs[key]}
                    className="hidden"
                    onChange={(e) => onOcrFileSelected(e, key)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (photoUrls[key].length > 0) {
                        // Scan the most recently uploaded photo for this category
                        scanExistingPhoto(photoUrls[key][photoUrls[key].length - 1], key)
                      } else {
                        // No photo yet — open file picker
                        ocrRefs[key].current?.click()
                      }
                    }}
                    disabled={ocrLoading}
                    className="w-full h-10 border border-indigo-200 rounded-lg flex items-center justify-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 active:scale-95 transition-all disabled:opacity-40"
                  >
                    {ocrLoading && ocrSource === key
                      ? <><Loader2 size={11} className="animate-spin" /> Scanning…</>
                      : <><ScanText size={11} /> Scan Text</>
                    }
                  </button>
                </div>
              ))}
            </div>

            {uploadError && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
                <span>{uploadError}</span>
                <button type="button" onClick={() => setUploadError('')}><X size={13} /></button>
              </div>
            )}

            {/* OCR error */}
            {ocrError && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
                <span>{ocrError}</span>
                <button type="button" onClick={() => setOcrError('')}><X size={13} /></button>
              </div>
            )}

            {/* OCR result panel */}
            {ocrResult && (
              <div className="mt-3 rounded-xl border border-indigo-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-indigo-50 border-b border-indigo-100">
                  <span className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                    <ScanText size={13} />
                    OCR Result
                    <span className="ml-1 text-[10px] font-normal text-indigo-400">
                      → filling {ocrSource === 'supply' ? 'Supply' : 'Demand'} side
                    </span>
                  </span>
                  <button type="button" onClick={() => setOcrResult(null)} className="text-indigo-400 hover:text-indigo-600">
                    <X size={14} />
                  </button>
                </div>

                {/* Raw text */}
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Detected Text</p>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-4">{ocrResult.text}</p>
                </div>

                {/* Extracted fields */}
                <div className="px-3 py-2 space-y-2">
                  {ocrResult.phones.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <Phone size={10} /> Phone Numbers
                      </p>
                      <div className="space-y-1">
                        {ocrResult.phones.map((p, i) => (
                          <div key={i} className="flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-700 font-mono">{p}</span>
                            <button
                              type="button"
                              onClick={() => ocrSource === 'supply'
                                ? fillLastSupply('phone', p)
                                : updateContact(0, 'phone', p)
                              }
                              className="shrink-0 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded"
                            >
                              Fill
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {ocrResult.companies.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <Building2 size={10} /> Company Names
                      </p>
                      <div className="space-y-1">
                        {ocrResult.companies.map((c, i) => (
                          <div key={i} className="flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-700 truncate">{c}</span>
                            <button
                              type="button"
                              onClick={() => ocrSource === 'supply'
                                ? fillLastSupply('company', c)
                                : setBusinessName(c)
                              }
                              className="shrink-0 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded"
                            >
                              Fill
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {ocrResult.websites.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <Link size={10} /> Websites
                      </p>
                      <div className="space-y-1">
                        {ocrResult.websites.map((w, i) => (
                          <div key={i} className="flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-700 truncate">{w}</span>
                            <button
                              type="button"
                              onClick={() => ocrSource === 'supply'
                                ? fillLastSupply('website', w)
                                : setWebsite(w)
                              }
                              className="shrink-0 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded"
                            >
                              Fill
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {ocrResult.emails.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <AtSign size={10} /> Emails
                      </p>
                      <div className="space-y-1">
                        {ocrResult.emails.map((e, i) => (
                          <div key={i} className="flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-700 truncate">{e}</span>
                            <button
                              type="button"
                              onClick={() => ocrSource === 'supply'
                                ? fillLastSupply('email', e)
                                : updateContact(0, 'email', e)
                              }
                              className="shrink-0 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded"
                            >
                              Fill
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {ocrResult.names.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <Star size={10} /> Person Names
                      </p>
                      <div className="space-y-1">
                        {ocrResult.names.map((n, i) => (
                          <div key={i} className="flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-700">{n}</span>
                            <button
                              type="button"
                              onClick={() => ocrSource === 'supply'
                                ? fillLastSupply('contact', n)
                                : updateContact(0, 'name', n)
                              }
                              className="shrink-0 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded"
                            >
                              Fill
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {ocrResult.addresses.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <MapPin size={10} /> Addresses
                      </p>
                      <div className="space-y-1">
                        {ocrResult.addresses.map((a, i) => (
                          <div key={i} className="flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-700 truncate">{a}</span>
                            <button
                              type="button"
                              onClick={() => ocrSource === 'supply'
                                ? fillLastSupply('officeLocation', a)
                                : setOfficeLocation(a)
                              }
                              className="shrink-0 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded"
                            >
                              Fill
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {ocrResult.phones.length === 0 && ocrResult.companies.length === 0 &&
                   ocrResult.websites.length === 0 && ocrResult.emails.length === 0 &&
                   ocrResult.addresses.length === 0 && ocrResult.names.length === 0 && (
                    <p className="text-xs text-gray-400 py-1">No structured data found — use the raw text above.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Phase Details ── */}
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm">
            <SectionLabel Icon={Layers} text="Phase Details" colorClass="text-indigo-600" />
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              className="w-full p-3 bg-white border border-indigo-200 rounded-lg text-base font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {PHASES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* ── 3. Demand Side ── */}
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
            <SectionLabel Icon={Building} text="3. Demand Side (Builders/Owners)" colorClass="text-blue-700" />

            <div className="space-y-2">
              <input
                name="businessName"
                type="text"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="Company / Builder Name"
                className="w-full p-3 bg-white border border-blue-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div className="flex items-center bg-white border border-blue-200 rounded-lg px-2.5 focus-within:ring-2 focus-within:ring-blue-400">
                <Globe size={15} className="text-gray-400 shrink-0" />
                <input
                  name="website"
                  type="url"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="Website"
                  autoComplete="off"
                  className="w-full p-3 bg-transparent text-base outline-none"
                />
              </div>
              <div className="flex items-center bg-white border border-blue-200 rounded-lg px-2.5 focus-within:ring-2 focus-within:ring-blue-400">
                <MapPin size={15} className="text-gray-400 shrink-0" />
                <input
                  name="officeLocation"
                  type="text"
                  value={officeLocation}
                  onChange={e => setOfficeLocation(e.target.value)}
                  placeholder="HQ Address"
                  className="w-full p-3 bg-transparent text-base outline-none"
                />
              </div>
              <div className="flex items-center bg-white border border-blue-200 rounded-lg px-2.5 focus-within:ring-2 focus-within:ring-blue-400">
                <Star size={15} className="text-gray-400 shrink-0" />
                <input
                  name="rating"
                  type="text"
                  placeholder="Rating (e.g. 4.5)"
                  inputMode="decimal"
                  className="w-full p-3 bg-transparent text-base outline-none"
                />
              </div>
            </div>

            {/* Contacts sub-section */}
            <div className="mt-5 space-y-3">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Personnel In Charge
              </span>
              {contacts.map((c, i) => (
                <div key={i} className="bg-white p-3 rounded-lg border border-blue-200 relative">
                  {contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContact(i)}
                      className="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) => updateContact(i, 'name', e.target.value)}
                      placeholder="Name"
                      className="w-full p-3 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <input
                      type="text"
                      value={c.role}
                      onChange={(e) => updateContact(i, 'role', e.target.value)}
                      placeholder="Role (e.g. Site Super)"
                      className="w-full p-3 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <input
                      type="tel"
                      value={c.phone}
                      onChange={(e) => updateContact(i, 'phone', e.target.value)}
                      placeholder="Phone"
                      className="w-full p-3 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <input
                      type="email"
                      value={c.email}
                      onChange={(e) => updateContact(i, 'email', e.target.value)}
                      placeholder="Email"
                      className="w-full p-3 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addContact}
                className="w-full py-3 rounded-xl border-2 border-dashed border-blue-200 text-sm font-bold text-blue-600 flex items-center justify-center gap-1 hover:bg-blue-50 transition-colors"
              >
                <Plus size={16} />
                Add Another Contact
              </button>
            </div>
          </div>

          {/* ── 4. Supply Side (Contractors on Site) ── */}
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 shadow-sm">
            <SectionLabel Icon={Hammer} text="4. Supply Side (Contractors on Site)" colorClass="text-orange-700" />
            <input type="hidden" name="supply" value={JSON.stringify(supplyList)} />

            <div className="space-y-3">
              {supplyList.map((s, i) => (
                <div key={i} className="bg-white p-3 rounded-lg border border-orange-200 space-y-2 relative">
                  {supplyList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSupply(i)}
                      className="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <select
                    className="w-full p-3 border border-gray-200 rounded-lg text-base bg-gray-50 text-gray-700 outline-none focus:ring-2 focus:ring-orange-400"
                    value={s.interaction}
                    onChange={(e) => updateSupply(i, 'interaction', e.target.value)}
                  >
                    <option value="Visual (Truck/Sign)">Visual Only (Saw Truck/Sign)</option>
                    <option value="In-Person (Conversation)">In-Person Conversation</option>
                    <option value="Active Supplier">Active Current Supplier</option>
                  </select>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-200 rounded-lg text-base bg-gray-50 focus:outline-none focus:ring-1 focus:ring-orange-400"
                    placeholder="Trade (e.g. Plumber, Electrician)"
                    value={s.trade}
                    onChange={(e) => updateSupply(i, 'trade', e.target.value)}
                  />
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-200 rounded-lg text-base bg-gray-50 focus:outline-none focus:ring-1 focus:ring-orange-400"
                    placeholder="Company Name"
                    value={s.company}
                    onChange={(e) => updateSupply(i, 'company', e.target.value)}
                  />
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-200 rounded-lg text-base bg-gray-50 focus:outline-none focus:ring-1 focus:ring-orange-400"
                    placeholder="Contact Person"
                    value={s.contact}
                    onChange={(e) => updateSupply(i, 'contact', e.target.value)}
                  />
                  <input
                    type="tel"
                    className="w-full p-3 border border-gray-200 rounded-lg text-base bg-gray-50 focus:outline-none focus:ring-1 focus:ring-orange-400"
                    placeholder="Phone"
                    value={s.phone}
                    onChange={(e) => updateSupply(i, 'phone', e.target.value)}
                  />
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 focus-within:ring-1 focus-within:ring-orange-400">
                    <Mail size={15} className="text-gray-400 shrink-0" />
                    <input
                      type="email"
                      className="w-full p-3 bg-transparent text-base outline-none"
                      placeholder="Email"
                      value={s.email}
                      onChange={(e) => updateSupply(i, 'email', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 focus-within:ring-1 focus-within:ring-orange-400">
                    <Globe size={15} className="text-gray-400 shrink-0" />
                    <input
                      type="url"
                      className="w-full p-3 bg-transparent text-base outline-none"
                      placeholder="Website"
                      autoComplete="off"
                      value={s.website}
                      onChange={(e) => updateSupply(i, 'website', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 focus-within:ring-1 focus-within:ring-orange-400">
                    <MapPin size={15} className="text-gray-400 shrink-0" />
                    <input
                      type="text"
                      className="w-full p-3 bg-transparent text-base outline-none"
                      placeholder="Office Location"
                      value={s.officeLocation}
                      onChange={(e) => updateSupply(i, 'officeLocation', e.target.value)}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addSupply}
                className="w-full py-3 rounded-xl border-2 border-dashed border-orange-200 text-sm font-bold text-orange-700 flex items-center justify-center gap-1 hover:bg-orange-50 transition-colors"
              >
                <Plus size={14} className="mr-1" />
                Add Another Contractor
              </button>
            </div>
          </div>

          {/* ── 5. Field Notes with Voice Input ── */}
          <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 shadow-sm">
            <SectionLabel Icon={MessageCircle} text="Field Notes & Audio" colorClass="text-teal-600" />
            <div className="relative">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Enter notes or tap microphone for voice input..."
                className="w-full p-3 pb-14 bg-white border border-teal-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
              />
              <button
                type="button"
                onClick={toggleRecording}
                className={`absolute bottom-3 right-3 p-2.5 rounded-full shadow-md transition-all ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-gray-100 text-gray-600 hover:bg-teal-50 hover:text-teal-600'
                }`}
              >
                <Mic size={18} />
              </button>
            </div>
            {isRecording && (
              <p className="text-[10px] text-red-500 font-bold animate-pulse text-right mt-2">
                Recording... Please speak.
              </p>
            )}
          </div>

          {state?.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.error}
            </div>
          )}
        </div>

        {/* ── Sticky submit bar ── */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="flex gap-3 max-w-2xl mx-auto">
            <button
              type="button"
              onClick={() => setView('map')}
              className="px-5 py-3.5 rounded-xl font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 text-base transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-gray-900 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-black transition-colors text-base shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
            >
              {isPending ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Save size={15} />
                  Submit
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Photo lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X size={20} />
          </button>

          {lightbox.urls.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightbox(l => l && ({ ...l, idx: (l.idx - 1 + l.urls.length) % l.urls.length })) }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          <div
            className="max-w-[90vw] max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.urls[lightbox.idx]}
              alt={lightbox.label}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            <p className="text-white/60 text-xs text-center mt-3">
              <span className="font-semibold text-white/80 mr-1">{lightbox.label}</span>
              {lightbox.urls.length > 1 && `· ${lightbox.idx + 1} / ${lightbox.urls.length}`}
            </p>
          </div>

          {lightbox.urls.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightbox(l => l && ({ ...l, idx: (l.idx + 1) % l.urls.length })) }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <ChevronRight size={28} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

