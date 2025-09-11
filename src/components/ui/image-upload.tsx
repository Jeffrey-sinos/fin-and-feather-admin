import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
  bucket: 'product-images' | 'blog-images';
  value?: string;
  onChange: (url: string | null) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  bucket,
  value,
  onChange,
  disabled,
  label = "Image",
  className = ""
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadImage = async (file: File) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      clearInterval(progressInterval);

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setUploadProgress(100);
      onChange(publicUrl);
      toast.success('Image uploaded successfully');

    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };

  const removeImage = () => {
    onChange(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>
      
      {value ? (
        <div className="space-y-2">
          <div className="relative group">
            <img
              src={value}
              alt="Uploaded image"
              className="w-full h-48 object-cover rounded-lg border"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={removeImage}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <div className="mt-2">
              <Label htmlFor={`file-upload-${bucket}`} className="cursor-pointer">
                <div className="text-sm text-muted-foreground">
                  Click to upload an image
                </div>
                <Input
                  id={`file-upload-${bucket}`}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={disabled || uploading}
                  className="sr-only"
                />
              </Label>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG, GIF up to 5MB
            </p>
          </div>
        </div>
      )}

      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Upload className="h-4 w-4 animate-pulse" />
            <span>Uploading...</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
    </div>
  );
};