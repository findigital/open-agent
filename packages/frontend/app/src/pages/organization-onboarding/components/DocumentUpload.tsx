import { useState, useRef } from 'react';
import { Button, toast } from '@afk/component';
import { useOrganizationOnboardingStore } from '@/store/organization-onboarding';
import { cn } from '@/lib/utils';

interface DocumentUploadProps {
  organizationId: string;
  onExtractionComplete?: (data: any) => void;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ organizationId, onExtractionComplete }) => {
  const { extractFromDocument, extracting } = useOrganizationOnboardingStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const acceptedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
  ];

  const acceptedExtensions = '.pdf,.doc,.docx,.txt';

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      toast.error('Please upload a PDF, Word document, or text file');
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploadedFile(file);

    try {
      // Read file content
      const content = await readFileContent(file);

      // Extract data using AI
      toast.info('Extracting organization data from document...');
      const extracted = await extractFromDocument(organizationId, content);

      toast.success(`Extraction complete with ${Math.round(extracted.confidence * 100)}% confidence!`);

      // Callback with extracted data
      if (onExtractionComplete) {
        onExtractionComplete(extracted);
      }
    } catch (error) {
      console.error('Extraction failed:', error);
      toast.error('Failed to extract data from document');
      setUploadedFile(null);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };

      reader.onerror = (e) => {
        reject(new Error('Failed to read file'));
      };

      // For text files, read as text
      // For PDFs and Word docs, we'll read as text (backend will handle parsing)
      if (file.type === 'text/plain') {
        reader.readAsText(file);
      } else {
        // For binary files (PDF, DOCX), read as data URL
        // The backend will need to handle these formats
        reader.readAsText(file);
      }
    });
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const getFileIcon = (file: File): string => {
    if (file.type === 'application/pdf') return '📄';
    if (file.type.includes('word')) return '📝';
    if (file.type === 'text/plain') return '📃';
    return '📄';
  };

  return (
    <div className="space-y-4">
      {/* Drag and Drop Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50',
          extracting && 'opacity-50 pointer-events-none'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={acceptedExtensions}
          onChange={handleFileInput}
          disabled={extracting}
        />

        {uploadedFile && !extracting ? (
          <div className="space-y-3">
            <div className="text-4xl">{getFileIcon(uploadedFile)}</div>
            <div>
              <p className="font-semibold text-gray-900">{uploadedFile.name}</p>
              <p className="text-sm text-gray-600">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <Button onClick={handleButtonClick} variant="outline" size="small">
              Upload Different File
            </Button>
          </div>
        ) : extracting ? (
          <div className="space-y-3">
            <div className="animate-spin text-4xl">⏳</div>
            <div>
              <p className="font-semibold text-gray-900">Extracting organization data...</p>
              <p className="text-sm text-gray-600">This may take 10-30 seconds</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-4xl">📁</div>
            <div>
              <p className="font-semibold text-gray-900">Drop your document here</p>
              <p className="text-sm text-gray-600 mt-1">or</p>
            </div>
            <Button onClick={handleButtonClick} variant="primary">
              Choose File
            </Button>
            <p className="text-xs text-gray-500 mt-2">Supported: PDF, Word (.docx), Text (.txt) • Max 10MB</p>
          </div>
        )}
      </div>

      {/* Help text */}
      <div className="text-xs text-gray-600 space-y-1">
        <p>
          <strong>💡 Best documents to upload:</strong>
        </p>
        <ul className="list-disc list-inside ml-2 space-y-1">
          <li>Annual reports (contain mission, programs, impact data)</li>
          <li>Strategic plans (contain vision, goals, needs assessment)</li>
          <li>Grant proposals (contain detailed program descriptions)</li>
          <li>Impact reports (contain outcomes and evidence)</li>
        </ul>
      </div>
    </div>
  );
};
