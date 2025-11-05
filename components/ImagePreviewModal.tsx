import React from 'react';

interface ImagePreviewModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ imageUrl, onClose }) => {
  if (!imageUrl) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
        <img 
          src={imageUrl} 
          alt="Vista previa del comprobante" 
          className="object-contain w-full rounded-lg"
          style={{ maxHeight: '85vh' }}
        />
        <button 
          onClick={onClose} 
          className="absolute -top-3 -right-3 bg-white hover:bg-gray-200 text-gray-800 rounded-full p-1.5 shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
          aria-label="Cerrar vista previa"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ImagePreviewModal;