import { motion } from 'framer-motion';
import { useState, type DragEvent } from 'react';

interface DropZoneProps {
  disabled?: boolean;
  onFile: (file: File) => void;
}

function pickImageFile(files: FileList | null): File | null {
  if (!files?.length) return null;
  const file = files[0];
  if (!file || !file.type.startsWith('image/')) return null;
  return file;
}

export function DropZone({ disabled, onFile }: DropZoneProps) {
  const [active, setActive] = useState(false);

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setActive(false);
    if (disabled) return;
    const file = pickImageFile(event.dataTransfer.files);
    if (file) onFile(file);
  };

  return (
    <motion.label
      className={`lq-drop${active ? ' lq-drop--active' : ''}`}
      onDragEnter={(e) => {
        e.preventDefault();
        setActive(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setActive(false)}
      onDrop={onDrop}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div>
        <p className="lq-drop__title">拖入圖片，或點擊選擇</p>
        <p className="lq-drop__hint">支援 JPG / PNG / WebP · 照片和影片會分開列出</p>
      </div>
      <input
        type="file"
        accept="image/*"
        disabled={disabled}
        onChange={(e) => {
          const file = pickImageFile(e.target.files);
          if (file) onFile(file);
          e.currentTarget.value = '';
        }}
      />
    </motion.label>
  );
}
