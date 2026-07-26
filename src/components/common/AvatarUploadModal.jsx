import { useState, useRef } from 'react'
import { Upload, X, Check, Image as ImageIcon, ZoomIn, ZoomOut, AlertCircle, RefreshCw } from 'lucide-react'

export default function AvatarUploadModal({ isOpen, onClose, onSave, isUploading }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)

  if (!isOpen) return null

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image format (JPG, PNG, or WebP).')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size exceeds 5MB limit. Please choose a smaller file.')
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setPreviewUrl(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleCropAndSave = () => {
    if (!previewUrl) {
      setError('Please select an image first.')
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = previewUrl
    img.onload = () => {
      const canvas = canvasRef.current || document.createElement('canvas')
      canvas.width = 300
      canvas.height = 300
      const ctx = canvas.getContext('2d')

      if (ctx) {
        ctx.clearRect(0, 0, 300, 300)
        ctx.save()
        // Draw circular clipping path
        ctx.beginPath()
        ctx.arc(150, 150, 150, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()

        // Calculate aspect ratio crop & zoom scale
        const minDim = Math.min(img.width, img.height)
        const scale = (300 / minDim) * zoom
        const width = img.width * scale
        const height = img.height * scale
        const x = (300 - width) / 2
        const y = (300 - height) / 2

        ctx.drawImage(img, x, y, width, height)
        ctx.restore()

        canvas.toBlob((blob) => {
          if (blob) {
            const croppedFile = new File([blob], selectedFile?.name || 'avatar.jpg', {
              type: 'image/jpeg',
            })
            const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.85)
            onSave(croppedFile, croppedDataUrl)
          }
        }, 'image/jpeg', 0.85)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#151a21] border border-[#3a494b] rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#00f2ff]" />
            <h3 className="font-display-lg text-lg font-bold text-white uppercase tracking-wider">
              Upload Profile Photo
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#8e9dae] hover:text-white hover:bg-[#07090c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-950/60 border border-[#ff3366] rounded-lg text-xs text-[#ff3366] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Hidden Canvas for Cropping */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Upload Dropzone / Image Preview */}
        {!previewUrl ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#3a494b] hover:border-[#00f2ff] rounded-xl p-8 text-center space-y-3 cursor-pointer transition-colors bg-[#07090c]/60 group"
          >
            <div className="w-14 h-14 rounded-full bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center mx-auto text-[#00f2ff] group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-white uppercase tracking-wider">
                Click to select profile picture
              </p>
              <p className="text-[11px] text-[#8e9dae]">
                Supports JPG, PNG, or WebP (Max size: 5MB)
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            {/* Circular Crop Frame Overlay */}
            <div className="relative w-48 h-48 mx-auto rounded-full overflow-hidden border-2 border-[#00f2ff] shadow-[0_0_20px_rgba(0,242,255,0.4)] bg-[#07090c]">
              <img
                src={previewUrl}
                alt="Avatar Crop Preview"
                className="w-full h-full object-cover transition-transform duration-150"
                style={{ transform: `scale(${zoom})` }}
              />
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/40 pointer-events-none" />
            </div>

            {/* Zoom Slider Controls */}
            <div className="flex items-center justify-center gap-3 text-xs text-[#8e9dae] max-w-xs mx-auto">
              <ZoomOut className="w-4 h-4 text-[#8e9dae]" />
              <input
                type="range"
                min="0.8"
                max="2.0"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#07090c] rounded-lg appearance-none cursor-pointer accent-[#00f2ff]"
              />
              <ZoomIn className="w-4 h-4 text-[#00f2ff]" />
            </div>

            <button
              type="button"
              onClick={() => {
                setPreviewUrl(null)
                setSelectedFile(null)
                setZoom(1)
              }}
              className="text-[11px] font-bold text-[#8e9dae] hover:text-[#00f2ff] underline uppercase tracking-wider"
            >
              Choose different image
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2 border-t border-[#3a494b]/60">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="flex-1 py-2.5 bg-[#07090c] hover:bg-[#1d232c] text-[#8e9dae] border border-[#3a494b] rounded text-xs font-bold uppercase transition-colors min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCropAndSave}
            disabled={!previewUrl || isUploading}
            className="btn-cyber-primary flex-1 justify-center py-2.5 min-h-[44px] disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-4 h-4 text-[#00363a] animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Profile Photo</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
