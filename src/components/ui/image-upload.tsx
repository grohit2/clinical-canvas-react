import * as React from "react"

import { Button } from "@/components/ui/button"
import { uploadImage } from "@/lib/image-upload"

interface ImageUploadProps {
  onUploaded?: (url: string) => void
}

function ImageUpload({ onUploaded }: ImageUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = React.useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const url = await uploadImage(file)
      onUploaded?.(url)
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button type="button" onClick={() => inputRef.current?.click()} disabled={isUploading}>
        {isUploading ? "Uploading..." : "Upload Photo"}
      </Button>
    </div>
  )
}

export { ImageUpload }
