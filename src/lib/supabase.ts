import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type UserRole = 'admin' | 'operator'

export interface UserRoleData {
    id: string
    user_id: string
    email: string
    role: UserRole
    created_at: string
    updated_at: string
}

/**
 * Get current user's role from database
 */
export async function getUserRole(): Promise<{ role: UserRole | null; error: string | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { role: null, error: 'Not authenticated' }
        }

        const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single()

        if (error) {
            return { role: null, error: error.message }
        }

        return { role: data.role as UserRole, error: null }
    } catch (error) {
        return { role: null, error: error instanceof Error ? error.message : 'Failed to get user role' }
    }
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({ email, password })
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string) {
    return await supabase.auth.signUp({ email, password })
}

/**
 * Sign out
 */
export async function signOut() {
    return await supabase.auth.signOut()
}

/**
 * Get current session
 */
export async function getSession() {
    return await supabase.auth.getSession()
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
}
