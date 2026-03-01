import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://jmpdaxquztgnzhizjmor.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjM4M2UyMzEwLTE4MzQtNGY1Mi1hODVhLWRmNDQ5OGZiYjQ3MSJ9.eyJwcm9qZWN0SWQiOiJqbXBkYXhxdXp0Z256aGl6am1vciIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzcyMjUxMTY1LCJleHAiOjIwODc2MTExNjUsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.Ez0I1uG3Rbay6JKg4xKc8sJ-vfyojXNeEauGCQPoQqk';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };