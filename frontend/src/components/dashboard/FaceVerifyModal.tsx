'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalDescription, Button } from '@/components/ui'

interface FaceVerifyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function FaceVerifyModal({ isOpen, onClose, onSuccess }: FaceVerifyModalProps) {
  const [status, setStatus] = useState<'idle' | 'starting' | 'ready' | 'processing' | 'success' | 'error'>('idle')
  const [statusText, setStatusText] = useState('Камер идэвхжүүлж байна...')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = useCallback(async () => {
    setStatus('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setStatus('ready')
      setStatusText('Нүүрээ дэлгэцний төвд байрлуулна уу')
    } catch (err) {
      console.error('Camera error:', err)
      setStatus('error')
      setStatusText('Камер ашиглах боломжгүй')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  const handleCapture = async () => {
    setStatus('processing')
    setStatusText('Боловсруулж байна...')

    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setStatus('success')
    setStatusText('Амжилттай!')

    setTimeout(() => {
      onSuccess?.()
      handleClose()
    }, 1500)
  }

  const handleClose = () => {
    stopCamera()
    setStatus('idle')
    setStatusText('Камер идэвхжүүлж байна...')
    onClose()
  }

  useEffect(() => {
    if (isOpen) {
      startCamera()
    }
    return () => {
      stopCamera()
    }
  }, [isOpen, startCamera, stopCamera])

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" className="p-8">
      <ModalHeader>
        <ModalTitle className="text-2xl">Царай таних</ModalTitle>
        <ModalDescription>
          Камераа идэвхжүүлж, нүүрээ дэлгэцний төвд байрлуулна уу
        </ModalDescription>
      </ModalHeader>

      {/* Camera View */}
      <div className="relative aspect-square max-w-sm mx-auto mb-6 rounded-2xl overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />

        {/* Face outline overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-48 h-64 border-4 border-indigo-500/50 rounded-[50%]">
            {/* Scanning animation */}
            {status === 'ready' && (
              <div className="scan-line absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
            )}

            {/* Corner markers */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-xl" />
          </div>
        </div>

        {/* Pulse rings */}
        {status === 'processing' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute w-48 h-64 border-2 border-indigo-500 rounded-[50%] pulse-ring" />
            <div
              className="absolute w-48 h-64 border-2 border-indigo-500 rounded-[50%] pulse-ring"
              style={{ animationDelay: '0.5s' }}
            />
          </div>
        )}

        {/* Status overlay */}
        <div className="absolute bottom-4 left-4 right-4 text-center">
          <span className="px-4 py-2 rounded-full bg-black/50 text-sm">
            {statusText}
          </span>
        </div>
      </div>

      {/* Instructions */}
      <div className="grid grid-cols-3 gap-4 mb-6 text-center text-sm">
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
          <div className="text-2xl mb-1">💡</div>
          <div className="text-slate-500 dark:text-slate-400">Сайн гэрэлтэй</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
          <div className="text-2xl mb-1">🎭</div>
          <div className="text-slate-500 dark:text-slate-400">Маскгүй</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
          <div className="text-2xl mb-1">👓</div>
          <div className="text-slate-500 dark:text-slate-400">Нүдний шилгүй</div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={handleClose}>
          Болих
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          onClick={handleCapture}
          disabled={status !== 'ready'}
        >
          Зураг авах
        </Button>
      </div>
    </Modal>
  )
}
