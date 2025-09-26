# Supabase Storage Setup for Avatar Upload

## 1. Create Storage Bucket

In your Supabase dashboard:

1. Go to **Storage** → **Buckets**
2. Click **New bucket**
3. Name: `avatars`
4. Set as **Public bucket** ✅
5. Click **Create bucket**

## 2. Set Bucket Policies

Go to **Storage** → **Policies** and add these policies:

### Policy 1: Allow authenticated users to upload their own avatars
```sql
CREATE POLICY "Allow authenticated users to upload avatars" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'avatars');
```

### Policy 2: Allow users to view all avatars
```sql
CREATE POLICY "Allow users to view avatars" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (bucket_id = 'avatars');
```

### Policy 3: Allow users to update their own avatars
```sql
CREATE POLICY "Allow users to update own avatars" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### Policy 4: Allow users to delete their own avatars
```sql
CREATE POLICY "Allow users to delete own avatars" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## 3. Update profiles table

Make sure your `profiles` table has an `avatar_url` column:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```

## 4. File Organization

Files will be stored as:
```
avatars/
├── user-id-1_timestamp.jpg
├── user-id-2_timestamp.png
└── user-id-3_timestamp.webp
```

## 5. Testing

1. Go to Settings → Profile in your app
2. Try uploading an avatar image
3. Check that it appears in your Supabase Storage bucket
4. Verify the avatar displays correctly in the chat interface

## Notes

- Maximum file size: 5MB
- Supported formats: JPEG, PNG, WebP, GIF
- Images are automatically resized to 200x200px for optimization
- Old avatars are automatically cleaned up when new ones are uploaded