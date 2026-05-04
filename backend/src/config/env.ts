import dotenv from 'dotenv';
dotenv.config();
export const env = {
  port: Number(process.env.PORT || 4000),
  clientUrl: '*',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret'
};
