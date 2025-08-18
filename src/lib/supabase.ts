// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vwevhbmfkgvrkymlrwqj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3ZXZoYm1ma2d2cmt5bWxyd3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyOTk1NjUsImV4cCI6MjA2Nzg3NTU2NX0.GqxUc8GolUJGl1l36BZFnWG8tGaKtOemWxnh4YfVc5s'

export const supabase = createClient(supabaseUrl, supabaseKey)