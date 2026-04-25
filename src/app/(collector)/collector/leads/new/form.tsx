'use client'

import { useState, useRef, useEffect, useActionState } from 'react'
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { createLead } from '@/app/actions/leads'
import {
  MapPin, Camera, Building, Hammer, MessageCircle,
  Plus, Globe, X, Save, RefreshCw, Layers, Star,
  Crosshair, Loader2, ChevronRight, CheckCircle, Mic,
  Navigation, Database, Mail
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

export function NewLeadForm() {
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
  const [notes, setNotes] = useState('')
  const [phase, setPhase] = useState('P0')
  
  // Supply side state
  const [supplyList, setSupplyList] = useState<{
    trade: string
    company: string
    contact: string
    phone: string
    email: string
    website: string
    officeLocation: string
    interaction: string
  }[]>([])
  const [draftSupply, setDraftSupply] = useState({
    trade: '',
    company: '',
    contact: '',
    phone: '',
    email: '',
    website: '',
    officeLocation: '',
    interaction: 'Visual (Truck/Sign)'
  })
  
  // Speech recognition state
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<ISpeechRecognition | null>(null)

  const photoRefs = {
    site: useRef<HTMLInputElement>(null),
    demand: useRef<HTMLInputElement>(null),
    supply: useRef<HTMLInputElement>(null),
    other: useRef<HTMLInputElement>(null),
  }

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
      recognitionRef.current.lang = 'en-US' // English
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

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>, cat: PhotoCat) {
    const n = e.target.files?.length ?? 0
    if (n > 0) setPhotoCounts((p) => ({ ...p, [cat]: p[cat] + n }))
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

  function handleAddSupply() {
    if (!draftSupply.trade || !draftSupply.company) return
    setSupplyList(prev => [...prev, draftSupply])
    setDraftSupply({
      trade: '',
      company: '',
      contact: '',
      phone: '',
      email: '',
      website: '',
      officeLocation: '',
      interaction: 'Visual (Truck/Sign)'
    })
  }

  function removeSupply(index: number) {
    setSupplyList(prev => prev.filter((_, i) => i !== index))
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

        <div className="p-4 space-y-4 pb-28">
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
                <div key={key}>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    capture="environment"
                    ref={photoRefs[key]}
                    className="hidden"
                    onChange={(e) => onPhotoChange(e, key)}
                  />
                  <button
                    type="button"
                    onClick={() => photoRefs[key].current?.click()}
                    className={`w-full h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-[10px] font-bold transition-all active:scale-95 select-none ${
                      photoCounts[key] > 0
                        ? 'bg-green-50 border-green-300 text-green-700'
                        : 'bg-white border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500'
                    }`}
                  >
                    <Icon size={16} className="mb-1" />
                    {photoCounts[key] > 0 ? `${photoCounts[key]} added` : label}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-2">Photos are stored locally and not yet uploaded.</p>
          </div>

          {/* ── Phase Details ── */}
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm">
            <SectionLabel Icon={Layers} text="Phase Details" colorClass="text-indigo-600" />
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              className="w-full p-3 bg-white border border-indigo-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
                placeholder="Company / Builder Name"
                className="w-full p-3 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center bg-white border border-blue-200 rounded-lg px-2.5 focus-within:ring-2 focus-within:ring-blue-400">
                  <Globe size={13} className="text-gray-400 shrink-0" />
                  <input
                    name="website"
                    type="url"
                    placeholder="Website"
                    className="w-full p-2 bg-transparent text-sm outline-none"
                  />
                </div>
                <div className="flex items-center bg-white border border-blue-200 rounded-lg px-2.5 focus-within:ring-2 focus-within:ring-blue-400">
                  <MapPin size={13} className="text-gray-400 shrink-0" />
                  <input
                    name="officeLocation"
                    type="text"
                    placeholder="HQ Address"
                    className="w-full p-2 bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center bg-white border border-blue-200 rounded-lg px-2.5 focus-within:ring-2 focus-within:ring-blue-400">
                <Star size={13} className="text-gray-400 shrink-0" />
                <input
                  name="rating"
                  type="text"
                  placeholder="Rating (e.g. 4.5)"
                  className="w-full p-2 bg-transparent text-sm outline-none"
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
                      className="absolute top-2.5 right-2.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={15} />
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) => updateContact(i, 'name', e.target.value)}
                      placeholder="Name"
                      className="p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <input
                      type="text"
                      value={c.role}
                      onChange={(e) => updateContact(i, 'role', e.target.value)}
                      placeholder="Role (e.g. Site Super)"
                      className="p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="tel"
                      value={c.phone}
                      onChange={(e) => updateContact(i, 'phone', e.target.value)}
                      placeholder="Phone"
                      className="p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <input
                      type="email"
                      value={c.email}
                      onChange={(e) => updateContact(i, 'email', e.target.value)}
                      placeholder="Email"
                      className="p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addContact}
                className="text-xs font-bold text-blue-600 flex items-center hover:underline"
              >
                <Plus size={14} className="mr-1" />
                Add Another Contact
              </button>
            </div>
          </div>

          {/* ── 4. Supply Side (Contractors on Site) ── */}
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 shadow-sm">
            <SectionLabel Icon={Hammer} text="4. Supply Side (Contractors on Site)" colorClass="text-orange-700" />
            <input type="hidden" name="supply" value={JSON.stringify(supplyList)} />
            
            <div className="bg-white p-3 rounded-lg border border-orange-200 space-y-2">
              <select
                className="w-full p-2 border border-gray-200 rounded text-sm bg-gray-50 text-gray-700 outline-none focus:ring-2 focus:ring-orange-400"
                value={draftSupply.interaction}
                onChange={(e) => setDraftSupply({ ...draftSupply, interaction: e.target.value })}
              >
                <option value="Visual (Truck/Sign)">Interaction: Visual Only (Saw Truck/Sign)</option>
                <option value="In-Person (Conversation)">Interaction: In-Person Conversation</option>
                <option value="Active Supplier">Interaction: Active Current Supplier</option>
              </select>
              
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="p-2 border border-gray-200 rounded text-sm bg-gray-50 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  placeholder="Trade (e.g. Plumber)"
                  value={draftSupply.trade}
                  onChange={(e) => setDraftSupply({ ...draftSupply, trade: e.target.value })}
                />
                <input
                  className="p-2 border border-gray-200 rounded text-sm bg-gray-50 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  placeholder="Company Name"
                  value={draftSupply.company}
                  onChange={(e) => setDraftSupply({ ...draftSupply, company: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded px-2 focus-within:ring-1 focus-within:ring-orange-400">
                  <Globe size={14} className="text-gray-400 shrink-0" />
                  <input
                    className="w-full p-2 bg-transparent text-sm outline-none"
                    placeholder="Website"
                    value={draftSupply.website}
                    onChange={(e) => setDraftSupply({ ...draftSupply, website: e.target.value })}
                  />
                </div>
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded px-2 focus-within:ring-1 focus-within:ring-orange-400">
                  <MapPin size={14} className="text-gray-400 shrink-0" />
                  <input
                    className="w-full p-2 bg-transparent text-sm outline-none"
                    placeholder="Office Location"
                    value={draftSupply.officeLocation}
                    onChange={(e) => setDraftSupply({ ...draftSupply, officeLocation: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="p-2 border border-gray-200 rounded text-sm bg-gray-50 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  placeholder="Contact Person"
                  value={draftSupply.contact}
                  onChange={(e) => setDraftSupply({ ...draftSupply, contact: e.target.value })}
                />
                <input
                  className="p-2 border border-gray-200 rounded text-sm bg-gray-50 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  placeholder="Phone"
                  value={draftSupply.phone}
                  onChange={(e) => setDraftSupply({ ...draftSupply, phone: e.target.value })}
                />
              </div>
              
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded px-2 mb-2 focus-within:ring-1 focus-within:ring-orange-400">
                <Mail size={14} className="text-gray-400 shrink-0" />
                <input
                  className="w-full p-2 bg-transparent text-sm outline-none"
                  placeholder="Email Address"
                  value={draftSupply.email}
                  onChange={(e) => setDraftSupply({ ...draftSupply, email: e.target.value })}
                />
              </div>
              
              <button
                type="button"
                onClick={handleAddSupply}
                className="w-full bg-orange-600 text-white font-bold py-2 rounded text-sm hover:bg-orange-700 transition-colors"
              >
                Add Contractor to Site
              </button>
            </div>
            
            {/* Added contractors list */}
            {supplyList.length > 0 && (
              <div className="space-y-2 mt-3">
                {supplyList.map((c, i) => (
                  <div key={i} className="flex justify-between p-3 bg-white rounded-lg border border-orange-200 text-sm shadow-sm relative pr-8">
                    <div>
                      <span className="text-orange-900 block font-bold">{c.trade}: {c.company}</span>
                      <span className="text-orange-600 text-[10px] font-bold uppercase tracking-wider">{c.interaction}</span>
                      {(c.website || c.officeLocation) && (
                        <span className="text-gray-500 text-xs block mt-1">{c.website} {c.website && c.officeLocation && '•'} {c.officeLocation}</span>
                      )}
                      {(c.contact || c.phone || c.email) && (
                        <span className="text-gray-500 text-xs block">{c.contact} {c.contact && c.phone && '•'} {c.phone} {(c.contact || c.phone) && c.email && '•'} {c.email}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSupply(i)}
                      className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                className="w-full p-3 pb-12 bg-white border border-teal-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
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
              className="px-5 py-2.5 rounded-xl font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-gray-900 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-black transition-colors text-sm shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
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
    </div>
  )
}

