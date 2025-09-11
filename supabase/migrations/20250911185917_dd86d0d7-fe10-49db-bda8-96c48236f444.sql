-- Create storage buckets for images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images', 'blog-images', true);

-- Create RLS policies for product images
CREATE POLICY "Anyone can view product images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'product-images' AND auth.uid() IN (
  SELECT profiles.id FROM profiles WHERE has_role(profiles.id, 'admin'::app_role)
));

CREATE POLICY "Admins can update product images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'product-images' AND auth.uid() IN (
  SELECT profiles.id FROM profiles WHERE has_role(profiles.id, 'admin'::app_role)
));

CREATE POLICY "Admins can delete product images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'product-images' AND auth.uid() IN (
  SELECT profiles.id FROM profiles WHERE has_role(profiles.id, 'admin'::app_role)
));

-- Create RLS policies for blog images
CREATE POLICY "Anyone can view blog images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'blog-images');

CREATE POLICY "Admins can upload blog images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'blog-images' AND auth.uid() IN (
  SELECT profiles.id FROM profiles WHERE has_role(profiles.id, 'admin'::app_role)
));

CREATE POLICY "Admins can update blog images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'blog-images' AND auth.uid() IN (
  SELECT profiles.id FROM profiles WHERE has_role(profiles.id, 'admin'::app_role)
));

CREATE POLICY "Admins can delete blog images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'blog-images' AND auth.uid() IN (
  SELECT profiles.id FROM profiles WHERE has_role(profiles.id, 'admin'::app_role)
));